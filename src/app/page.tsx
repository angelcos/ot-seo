import { WorkOrdersApp } from "@/components/work-orders-app";
import { prisma } from "@/lib/prisma";
import { formatWorkOrderNumber } from "@/lib/work-orders";

export default async function Home() {
  const [orders, mechanics, brands] = await Promise.all([
    prisma.workOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.mechanic.findMany({
      orderBy: {
        name: "asc",
      },
    }),
    prisma.brand.findMany({
      orderBy: {
        name: "asc",
      },
    }),
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
    assignedMechanic: order.assignedMechanic,
    issueDescription: order.issueDescription,
    status: order.status,
  }));

  return (
    <WorkOrdersApp
      initialOrders={initialOrders}
      initialMechanics={mechanics}
      initialBrands={brands}
    />
  );
}
