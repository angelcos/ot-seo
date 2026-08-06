import { WorkOrdersApp } from "@/components/work-orders-app";
import { prisma } from "@/lib/prisma";
import { formatWorkOrderNumber } from "@/lib/work-orders";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [orders, mechanics, brands, totalCount] = await Promise.all([
    prisma.workOrder.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: "desc" },
      include: { timeEntries: { select: { actualHours: true, billableHours: true } } },
    }),
    prisma.mechanic.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.workOrder.count(),
  ]);

  const initialOrders = orders.map((order) => ({
    id: order.id,
    number: formatWorkOrderNumber(order.id, order.createdAt),
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    vehiclePlate: order.vehiclePlate,
    vehicleBrand: order.vehicleBrand,
    vehicleModel: order.vehicleModel,
    vehicleYear: order.vehicleYear,
    mileage: order.mileage,
    assignedMechanic: order.assignedMechanic,
    issueDescription: order.issueDescription,
    status: order.status,
    timeEntriesCount: order.timeEntries.length,
    timeEntriesActualHours: order.timeEntries.reduce((s, e) => s + e.actualHours, 0),
    timeEntriesBillableHours: order.timeEntries.reduce((s, e) => s + e.billableHours, 0),
  }));

  return (
    <WorkOrdersApp
      initialOrders={initialOrders}
      initialMechanics={mechanics}
      initialBrands={brands}
      totalOrderCount={totalCount}
    />
  );
}
