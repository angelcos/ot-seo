import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "Parámetro name requerido" }, { status: 400 });
  }

  // Resolve canonical name (guard against case drift)
  const allMechanics = await prisma.mechanic.findMany({ select: { name: true } });
  const canonical = allMechanics.find((m) => m.name.toLowerCase() === name.toLowerCase())?.name ?? name;

  // Collect all case variants of this mechanic's name present in each table
  const [distinctTE, distinctQE] = await Promise.all([
    prisma.workTimeEntry.findMany({ select: { mechanicName: true }, distinct: ["mechanicName"] }),
    prisma.quickEntry.findMany({ select: { mechanicName: true }, distinct: ["mechanicName"] }),
  ]);
  const matchKey = canonical.toLowerCase();
  const teNames = [...new Set([canonical, ...distinctTE.map((e) => e.mechanicName).filter((n) => n.toLowerCase() === matchKey)])];
  const qeNames = [...new Set([canonical, ...distinctQE.map((e) => e.mechanicName).filter((n) => n.toLowerCase() === matchKey)])];

  // Fetch unique work orders via distinct IDs (avoids loading all individual time entries)
  const [distinctEntries, hoursAgg, quickHoursAgg, quickEntryCount] = await Promise.all([
    prisma.workTimeEntry.findMany({
      where: { mechanicName: { in: teNames } },
      select: { workOrderId: true },
      distinct: ["workOrderId"],
    }),
    prisma.workTimeEntry.aggregate({
      where: { mechanicName: { in: teNames } },
      _sum: { actualHours: true, billableHours: true },
    }),
    prisma.quickEntry.aggregate({
      where: { mechanicName: { in: qeNames } },
      _sum: { actualHours: true, billableHours: true },
    }),
    prisma.quickEntry.count({ where: { mechanicName: { in: qeNames } } }),
  ]);

  const woIds = distinctEntries.map((e) => e.workOrderId);
  const workOrders = woIds.length > 0
    ? await prisma.workOrder.findMany({
        where: { id: { in: woIds } },
        select: { id: true, status: true, vehicleBrand: true, vehicleModel: true, vehiclePlate: true },
      })
    : [];

  const completedStatuses = ["DONE", "DELIVERED"];
  const completedWorkOrders = workOrders.filter((wo) => completedStatuses.includes(wo.status)).length;

  // Brand breakdown — group case-insensitively, display catalog name when available
  const activeBrandNames = await prisma.brand.findMany({ select: { name: true } });
  const catalogKey = new Map(activeBrandNames.map((b) => [b.name.toLowerCase(), b.name]));

  const brandCount: Record<string, { display: string; count: number }> = {};
  for (const wo of workOrders) {
    const raw = wo.vehicleBrand || "Sin marca";
    const key = raw.toLowerCase();
    const display = catalogKey.get(key) ?? raw;
    if (!brandCount[key]) brandCount[key] = { display, count: 0 };
    brandCount[key].count++;
  }
  const totalWO = workOrders.length;
  const brandBreakdown = Object.values(brandCount)
    .map(({ display, count }) => ({ brand: display, count, pct: totalWO > 0 ? Math.round((count / totalWO) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const totalActualHours =
    (hoursAgg._sum.actualHours ?? 0) + (quickHoursAgg._sum.actualHours ?? 0);
  const totalBillableHours =
    (hoursAgg._sum.billableHours ?? 0) + (quickHoursAgg._sum.billableHours ?? 0);

  return NextResponse.json({
    mechanic: canonical,
    totalWorkOrders: workOrders.length,
    completedWorkOrders,
    uniqueVehicles: new Set(workOrders.map((wo) => wo.vehiclePlate).filter(Boolean)).size,
    brandBreakdown,
    totalActualHours: Math.round(totalActualHours * 100) / 100,
    totalBillableHours: Math.round(totalBillableHours * 100) / 100,
    quickEntryCount,
  });
}
