import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createWorkOrderSchema,
  formatWorkOrderNumber,
  normalizeCatalogNameKey,
  normalizeOptionalText,
  toSafeNumber,
} from "@/lib/work-orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const workOrders = await prisma.workOrder.findMany({
    where: all ? undefined : { createdAt: { gte: sixMonthsAgo } },
    orderBy: { createdAt: "desc" },
    include: {
      timeEntries: { select: { actualHours: true, billableHours: true } },
    },
  });

  return NextResponse.json(
    workOrders.map((wo) => ({
      id: wo.id,
      number: formatWorkOrderNumber(wo.id, wo.createdAt),
      createdAt: wo.createdAt.toISOString(),
      customerName: wo.customerName,
      customerPhone: wo.customerPhone,
      vehiclePlate: wo.vehiclePlate,
      vehicleBrand: wo.vehicleBrand,
      vehicleModel: wo.vehicleModel,
      vehicleYear: wo.vehicleYear,
      mileage: wo.mileage,
      assignedMechanic: wo.assignedMechanic,
      issueDescription: wo.issueDescription,
      status: wo.status,
      timeEntriesCount: wo.timeEntries.length,
      timeEntriesActualHours: wo.timeEntries.reduce((s, e) => s + e.actualHours, 0),
      timeEntriesBillableHours: wo.timeEntries.reduce((s, e) => s + e.billableHours, 0),
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
  const normalizedBrand = data.vehicleBrand.trim().replace(/\s+/g, " ");
  const activeBrands = await prisma.brand.findMany({
    where: { isActive: true },
    select: { name: true },
  });
  const matchedBrand = activeBrands.find(
    (brand) => normalizeCatalogNameKey(brand.name) === normalizeCatalogNameKey(normalizedBrand),
  );

  if (!matchedBrand) {
    return NextResponse.json(
      { message: "La marca debe ser una de las registradas en configuracion." },
      { status: 400 },
    );
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      vehiclePlate: normalizeOptionalText(data.vehiclePlate)?.toUpperCase() ?? null,
      vehicleBrand: matchedBrand.name,
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
