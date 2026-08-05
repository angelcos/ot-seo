import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createWorkOrderSchema,
  formatWorkOrderNumber,
  normalizeOptionalText,
  toSafeNumber,
} from "@/lib/work-orders";

export async function GET() {
  const workOrders = await prisma.workOrder.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(
    workOrders.map((workOrder) => ({
      id: workOrder.id,
      number: formatWorkOrderNumber(workOrder.id, workOrder.createdAt),
      createdAt: workOrder.createdAt.toISOString(),
      customerName: workOrder.customerName,
      customerPhone: workOrder.customerPhone,
      vehiclePlate: workOrder.vehiclePlate,
      vehicleBrand: workOrder.vehicleBrand,
      vehicleModel: workOrder.vehicleModel,
      vehicleYear: workOrder.vehicleYear,
      assignedMechanic: workOrder.assignedMechanic,
      issueDescription: workOrder.issueDescription,
      status: workOrder.status,
    })),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createWorkOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const workOrder = await prisma.workOrder.create({
    data: {
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      vehiclePlate: normalizeOptionalText(data.vehiclePlate)?.toUpperCase() ?? null,
      vehicleBrand: data.vehicleBrand.trim(),
      vehicleModel: data.vehicleModel.trim(),
      vehicleYear: normalizeOptionalText(data.vehicleYear),
      mileage: toSafeNumber(data.mileage),
      assignedMechanic: normalizeOptionalText(data.assignedMechanic) ?? "",
      issueDescription: normalizeOptionalText(data.issueDescription),
    },
  });

  return NextResponse.json(
    {
      id: workOrder.id,
      number: formatWorkOrderNumber(workOrder.id, workOrder.createdAt),
      createdAt: workOrder.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
