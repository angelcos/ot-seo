/**
 * Normaliza en la DB los nombres de marcas, mecanicos y placas para evitar
 * discrepancias de mayusculas/minusculas y espacios extra.
 *
 * Cubre:
 *   - WorkOrder.vehicleBrand        → nombre canonico del catalogo Brand
 *   - WorkOrder.assignedMechanic    → nombre canonico del catalogo Mechanic
 *   - WorkTimeEntry.mechanicName    → nombre canonico del catalogo Mechanic
 *   - QuickEntry.mechanicName       → nombre canonico del catalogo Mechanic
 *   - WorkOrder.vehiclePlate        → siempre MAYUSCULAS, sin espacios extra
 *   - QuickEntry.vehiclePlate       → siempre MAYUSCULAS, sin espacios extra
 *
 * Ejecutar UNA sola vez tras desplegar la version con cascade de rename:
 *   node scripts/normalize-catalog-names.js
 *
 * Es seguro repetir: si ya esta todo normalizado, no cambia nada.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function key(s) {
  return (s ?? "").trim().toLowerCase();
}

async function normalizeBrands() {
  console.log("\n--- Marcas (WorkOrder.vehicleBrand) ---");
  const brands = await prisma.brand.findMany({ select: { name: true } });
  let total = 0;

  for (const brand of brands) {
    const canonical = brand.name;
    const matchKey = key(canonical);

    const distinct = await prisma.workOrder.findMany({
      select: { vehicleBrand: true },
      distinct: ["vehicleBrand"],
    });

    const variants = distinct.map((r) => r.vehicleBrand).filter((b) => key(b) === matchKey && b !== canonical);

    if (variants.length === 0) {
      console.log(`  "${canonical}" — OK`);
      continue;
    }

    for (const variant of variants) {
      const { count } = await prisma.workOrder.updateMany({
        where: { vehicleBrand: variant },
        data: { vehicleBrand: canonical },
      });
      console.log(`  "${variant}" -> "${canonical}" — ${count} OT(s)`);
      total += count;
    }
  }
  return total;
}

async function normalizeMechanics() {
  console.log("\n--- Mecanicos (WorkOrder / WorkTimeEntry / QuickEntry) ---");
  const mechanics = await prisma.mechanic.findMany({ select: { name: true } });
  let total = 0;

  for (const mechanic of mechanics) {
    const canonical = mechanic.name;
    const matchKey = key(canonical);

    const [distinctWO, distinctTE, distinctQE] = await Promise.all([
      prisma.workOrder.findMany({ select: { assignedMechanic: true }, distinct: ["assignedMechanic"] }),
      prisma.workTimeEntry.findMany({ select: { mechanicName: true }, distinct: ["mechanicName"] }),
      prisma.quickEntry.findMany({ select: { mechanicName: true }, distinct: ["mechanicName"] }),
    ]);

    const woVariants = distinctWO.map((r) => r.assignedMechanic).filter((n) => key(n) === matchKey && n !== canonical);
    const teVariants = distinctTE.map((r) => r.mechanicName).filter((n) => key(n) === matchKey && n !== canonical);
    const qeVariants = distinctQE.map((r) => r.mechanicName).filter((n) => key(n) === matchKey && n !== canonical);

    if (woVariants.length + teVariants.length + qeVariants.length === 0) {
      console.log(`  "${canonical}" — OK`);
      continue;
    }

    for (const v of woVariants) {
      const { count } = await prisma.workOrder.updateMany({ where: { assignedMechanic: v }, data: { assignedMechanic: canonical } });
      console.log(`  "${v}" -> "${canonical}" — ${count} OT(s) [assignedMechanic]`);
      total += count;
    }
    for (const v of teVariants) {
      const { count } = await prisma.workTimeEntry.updateMany({ where: { mechanicName: v }, data: { mechanicName: canonical } });
      console.log(`  "${v}" -> "${canonical}" — ${count} entrada(s) de tiempo`);
      total += count;
    }
    for (const v of qeVariants) {
      const { count } = await prisma.quickEntry.updateMany({ where: { mechanicName: v }, data: { mechanicName: canonical } });
      console.log(`  "${v}" -> "${canonical}" — ${count} registro(s) express`);
      total += count;
    }
  }
  return total;
}

async function normalizePlates() {
  console.log("\n--- Matriculas (WorkOrder / QuickEntry) ---");
  let total = 0;

  // WorkOrder.vehiclePlate
  const woPlates = await prisma.workOrder.findMany({
    where: { vehiclePlate: { not: null } },
    select: { vehiclePlate: true },
    distinct: ["vehiclePlate"],
  });

  for (const { vehiclePlate } of woPlates) {
    if (!vehiclePlate) continue;
    const normalized = vehiclePlate.trim().toUpperCase();
    if (vehiclePlate === normalized) continue;
    const { count } = await prisma.workOrder.updateMany({
      where: { vehiclePlate },
      data: { vehiclePlate: normalized },
    });
    console.log(`  OT: "${vehiclePlate}" -> "${normalized}" — ${count} registro(s)`);
    total += count;
  }

  // QuickEntry.vehiclePlate
  const qePlates = await prisma.quickEntry.findMany({
    select: { vehiclePlate: true },
    distinct: ["vehiclePlate"],
  });

  for (const { vehiclePlate } of qePlates) {
    if (!vehiclePlate) continue;
    const normalized = vehiclePlate.trim().toUpperCase();
    if (vehiclePlate === normalized) continue;
    const { count } = await prisma.quickEntry.updateMany({
      where: { vehiclePlate },
      data: { vehiclePlate: normalized },
    });
    console.log(`  Express: "${vehiclePlate}" -> "${normalized}" — ${count} registro(s)`);
    total += count;
  }

  if (total === 0) console.log("  Todas las matriculas — OK");
  return total;
}

async function main() {
  console.log("Normalizando datos de catalogo en la base de datos...");

  const brandChanges = await normalizeBrands();
  const mechanicChanges = await normalizeMechanics();
  const plateChanges = await normalizePlates();

  const grandTotal = brandChanges + mechanicChanges + plateChanges;
  console.log(`\n========================================`);
  console.log(`  Marcas modificadas:    ${brandChanges}`);
  console.log(`  Mecanicos modificados: ${mechanicChanges}`);
  console.log(`  Matriculas corregidas: ${plateChanges}`);
  console.log(`  TOTAL:                 ${grandTotal}`);
  console.log(`========================================`);
  if (grandTotal === 0) {
    console.log("  Todo estaba correctamente normalizado.");
  } else {
    console.log("  Normalizacion completada. Reinicia el servidor si esta en produccion.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
