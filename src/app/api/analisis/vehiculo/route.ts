import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatWorkOrderNumber } from "@/lib/work-orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Devuelve las últimas 5 placas únicas vistas en el taller
  if (searchParams.get("recientes")) {
    const [wos, qes] = await Promise.all([
      prisma.workOrder.findMany({
        where: { vehiclePlate: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { vehiclePlate: true, createdAt: true },
        take: 40,
      }),
      prisma.quickEntry.findMany({
        orderBy: { date: "desc" },
        select: { vehiclePlate: true, date: true },
        take: 40,
      }),
    ]);

    const combined = [
      ...wos.map((r) => ({ plate: r.vehiclePlate!, date: r.createdAt })),
      ...qes.map((r) => ({ plate: r.vehiclePlate, date: r.date })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const seen = new Set<string>();
    const plates: string[] = [];
    for (const { plate } of combined) {
      if (plate && !seen.has(plate) && plates.length < 5) {
        seen.add(plate);
        plates.push(plate);
      }
    }
    return NextResponse.json({ plates });
  }

  const plate = searchParams.get("plate")?.trim().toUpperCase();

  if (!plate) {
    return NextResponse.json({ error: "Parámetro plate requerido" }, { status: 400 });
  }

  const showAll = searchParams.get("all") === "true";
  const cutoff = showAll ? undefined : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const [workOrders, quickEntries, totalWOCount] = await Promise.all([
    prisma.workOrder.findMany({
      where: { vehiclePlate: plate, ...(cutoff ? { createdAt: { gte: cutoff } } : {}) },
      orderBy: { createdAt: "desc" },
      include: { timeEntries: { select: { actualHours: true, billableHours: true } } },
    }),
    prisma.quickEntry.findMany({
      where: { vehiclePlate: plate, ...(cutoff ? { date: { gte: cutoff } } : {}) },
      orderBy: { date: "desc" },
    }),
    cutoff ? prisma.workOrder.count({ where: { vehiclePlate: plate } }) : Promise.resolve(0),
  ]);

  const hasMore = cutoff ? totalWOCount > workOrders.length : false;

  const totalBillableHours =
    workOrders.reduce((s, wo) => s + wo.timeEntries.reduce((t, e) => t + e.billableHours, 0), 0) +
    quickEntries.reduce((s: number, e) => s + e.billableHours, 0);

  const totalActualHours =
    workOrders.reduce((s, wo) => s + wo.timeEntries.reduce((t, e) => t + e.actualHours, 0), 0) +
    quickEntries.reduce((s: number, e) => s + e.actualHours, 0);

  return NextResponse.json({
    plate,
    hasMore,
    totalWOCount,
    totalVisits: workOrders.length + quickEntries.length,
    totalBillableHours: Math.round(totalBillableHours * 100) / 100,
    totalActualHours: Math.round(totalActualHours * 100) / 100,
    workOrders: workOrders.map((wo) => ({
      id: wo.id,
      number: formatWorkOrderNumber(wo.id, wo.createdAt),
      createdAt: wo.createdAt.toISOString(),
      customerName: wo.customerName,
      vehicleBrand: wo.vehicleBrand,
      vehicleModel: wo.vehicleModel,
      vehicleYear: wo.vehicleYear,
      status: wo.status,
      assignedMechanic: wo.assignedMechanic,
      issueDescription: wo.issueDescription,
      actualHours: wo.timeEntries.reduce((s, e) => s + e.actualHours, 0),
      billableHours: wo.timeEntries.reduce((s, e) => s + e.billableHours, 0),
    })),
    quickEntries: quickEntries.map((qe) => ({
      id: qe.id,
      date: qe.date.toISOString(),
      mechanicName: qe.mechanicName,
      actualHours: qe.actualHours,
      billableHours: qe.billableHours,
      notes: qe.notes,
    })),
  });
}
