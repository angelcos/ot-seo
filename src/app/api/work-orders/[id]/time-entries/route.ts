import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTimeEntrySchema } from "@/lib/work-orders";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  const entries = await prisma.workTimeEntry.findMany({
    where: { workOrderId: orderId },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(
    entries.map((e) => ({
      id: e.id,
      workOrderId: e.workOrderId,
      mechanicName: e.mechanicName,
      date: e.date.toISOString().slice(0, 10),
      actualHours: e.actualHours,
      billableHours: e.billableHours,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
    })),
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  const orderExists = await prisma.workOrder.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!orderExists) {
    return NextResponse.json({ message: "OT no encontrada" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createTimeEntrySchema.safeParse(body);

  if (!parsed.success) {
    const allErrors = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter((e): e is string => typeof e === "string");
    return NextResponse.json({ message: allErrors.join(". ") || "Datos invalidos" }, { status: 400 });
  }

  const entry = await prisma.workTimeEntry.create({
    data: {
      workOrderId: orderId,
      mechanicName: parsed.data.mechanicName.trim(),
      date: new Date(parsed.data.date),
      actualHours: parsed.data.actualHours,
      billableHours: parsed.data.billableHours,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  return NextResponse.json(
    {
      id: entry.id,
      workOrderId: entry.workOrderId,
      mechanicName: entry.mechanicName,
      date: entry.date.toISOString().slice(0, 10),
      actualHours: entry.actualHours,
      billableHours: entry.billableHours,
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
