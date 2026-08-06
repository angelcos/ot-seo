import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWorkOrderSchema, normalizeCatalogNameKey, normalizeOptionalText, toSafeNumber, formatWorkOrderNumber } from "@/lib/work-orders";

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
    const allErrors = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter((e): e is string => typeof e === "string");
    const message = allErrors.length > 0 ? allErrors.join(". ") : "Datos invalidos";
    return NextResponse.json({ message }, { status: 400 });
  }

  const d = parsed.data;
  let matchedBrandName: string | undefined;

  if (d.vehicleBrand !== undefined) {
    const normalizedBrand = d.vehicleBrand.trim().replace(/\s+/g, " ");
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

    matchedBrandName = matchedBrand.name;
  }

  const updated = await prisma.workOrder.update({
    where: { id: parsedId },
    data: {
      ...(d.customerName !== undefined ? { customerName: d.customerName.trim() } : {}),
      ...(d.customerPhone !== undefined ? { customerPhone: d.customerPhone.trim() } : {}),
      ...(d.vehiclePlate !== undefined
        ? { vehiclePlate: normalizeOptionalText(d.vehiclePlate)?.toUpperCase() ?? null }
        : {}),
      ...(matchedBrandName !== undefined ? { vehicleBrand: matchedBrandName } : {}),
      ...(d.vehicleModel !== undefined ? { vehicleModel: d.vehicleModel.trim() } : {}),
      ...(d.vehicleYear !== undefined ? { vehicleYear: normalizeOptionalText(d.vehicleYear) } : {}),
      ...(d.mileage !== undefined ? { mileage: toSafeNumber(d.mileage) } : {}),
      ...(d.assignedMechanic !== undefined ? { assignedMechanic: d.assignedMechanic.trim() } : {}),
      ...(d.issueDescription !== undefined
        ? { issueDescription: normalizeOptionalText(d.issueDescription) }
        : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
    },
    include: {
      timeEntries: { select: { actualHours: true, billableHours: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    number: formatWorkOrderNumber(updated.id, updated.createdAt),
    createdAt: updated.createdAt.toISOString(),
    customerName: updated.customerName,
    customerPhone: updated.customerPhone,
    vehiclePlate: updated.vehiclePlate,
    vehicleBrand: updated.vehicleBrand,
    vehicleModel: updated.vehicleModel,
    vehicleYear: updated.vehicleYear,
    mileage: updated.mileage,
    assignedMechanic: updated.assignedMechanic,
    issueDescription: updated.issueDescription,
    status: updated.status,
    timeEntriesCount: updated.timeEntries.length,
    timeEntriesActualHours: updated.timeEntries.reduce((s, e) => s + e.actualHours, 0),
    timeEntriesBillableHours: updated.timeEntries.reduce((s, e) => s + e.billableHours, 0),
  });
}
