import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeCatalogNameKey, updateCatalogEntrySchema } from "@/lib/work-orders";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateCatalogEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos invalidos", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let normalizedName: string | undefined;
  if (parsed.data.name !== undefined) {
    normalizedName = parsed.data.name.trim().replace(/\s+/g, " ");
    const candidateName = normalizedName;

    const existingMechanics = await prisma.mechanic.findMany({
      where: { id: { not: parsedId } },
      select: { id: true, name: true },
    });
    const duplicatedMechanic = existingMechanics.find(
      (mechanic) => normalizeCatalogNameKey(mechanic.name) === normalizeCatalogNameKey(candidateName),
    );

    if (duplicatedMechanic) {
      return NextResponse.json(
        { message: "Ya existe otro mecanico con ese nombre. No se distingue entre mayusculas y minusculas." },
        { status: 409 },
      );
    }
  }

  try {
    const current = await prisma.mechanic.findUnique({ where: { id: parsedId }, select: { name: true } });
    const oldName = current?.name;

    const mechanic = await prisma.mechanic.update({
      where: { id: parsedId },
      data: {
        ...(normalizedName !== undefined ? { name: normalizedName } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.dailyCapacityHours !== undefined
          ? { dailyCapacityHours: parsed.data.dailyCapacityHours }
          : {}),
      },
    });

    // Cascade name change to all tables that reference the mechanic by name
    if (normalizedName !== undefined && oldName && oldName !== normalizedName) {
      const [distinctWO, distinctTE, distinctQE] = await Promise.all([
        prisma.workOrder.findMany({ select: { assignedMechanic: true }, distinct: ["assignedMechanic"] }),
        prisma.workTimeEntry.findMany({ select: { mechanicName: true }, distinct: ["mechanicName"] }),
        prisma.quickEntry.findMany({ select: { mechanicName: true }, distinct: ["mechanicName"] }),
      ]);

      const matchKey = normalizeCatalogNameKey(oldName);
      const woVariants = distinctWO.map((r) => r.assignedMechanic).filter((n) => normalizeCatalogNameKey(n) === matchKey);
      const teVariants = distinctTE.map((r) => r.mechanicName).filter((n) => normalizeCatalogNameKey(n) === matchKey);
      const qeVariants = distinctQE.map((r) => r.mechanicName).filter((n) => normalizeCatalogNameKey(n) === matchKey);

      await Promise.all([
        ...woVariants.map((v) => prisma.workOrder.updateMany({ where: { assignedMechanic: v }, data: { assignedMechanic: normalizedName } })),
        ...teVariants.map((v) => prisma.workTimeEntry.updateMany({ where: { mechanicName: v }, data: { mechanicName: normalizedName } })),
        ...qeVariants.map((v) => prisma.quickEntry.updateMany({ where: { mechanicName: v }, data: { mechanicName: normalizedName } })),
      ]);
    }

    return NextResponse.json(mechanic);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Ya existe otro mecanico con ese nombre. Cambia el nombre o edita el mecanico existente." },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  const mechanic = await prisma.mechanic.findUnique({
    where: { id: parsedId },
    select: { id: true, isActive: true },
  });

  if (!mechanic) {
    return NextResponse.json({ message: "Mecanico no encontrado" }, { status: 404 });
  }

  if (mechanic.isActive) {
    return NextResponse.json(
      { message: "Primero marca el mecanico como baja para poder eliminarlo" },
      { status: 409 },
    );
  }

  await prisma.mechanic.delete({ where: { id: parsedId } });
  return NextResponse.json({ ok: true });
}
