import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWorkOrderSchema } from "@/lib/work-orders";

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
  const parsed = updateWorkOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos invalidos", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.workOrder.update({
    where: { id: parsedId },
    data: {
      ...(parsed.data.assignedMechanic !== undefined
        ? { assignedMechanic: parsed.data.assignedMechanic.trim() }
        : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    assignedMechanic: updated.assignedMechanic,
    status: updated.status,
  });
}
