import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTimeEntrySchema } from "@/lib/work-orders";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const entryId = Number(id);

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateTimeEntrySchema.safeParse(body);

  if (!parsed.success) {
    const allErrors = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter((e): e is string => typeof e === "string");
    return NextResponse.json({ message: allErrors.join(". ") || "Datos invalidos" }, { status: 400 });
  }

  const updated = await prisma.workTimeEntry.update({
    where: { id: entryId },
    data: {
      ...(parsed.data.actualHours !== undefined ? { actualHours: parsed.data.actualHours } : {}),
      ...(parsed.data.billableHours !== undefined ? { billableHours: parsed.data.billableHours } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes.trim() || null } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    workOrderId: updated.workOrderId,
    mechanicName: updated.mechanicName,
    date: updated.date.toISOString().slice(0, 10),
    actualHours: updated.actualHours,
    billableHours: updated.billableHours,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const entryId = Number(id);

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  await prisma.workTimeEntry.delete({ where: { id: entryId } });

  return new NextResponse(null, { status: 204 });
}
