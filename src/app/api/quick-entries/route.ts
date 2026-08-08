import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plate = searchParams.get("plate");

  const entries = await prisma.quickEntry.findMany({
    where: plate ? { vehiclePlate: plate } : undefined,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const body = await request.json() as {
    vehiclePlate: string;
    mechanicName: string;
    date: string;
    actualMinutes: number;
    billableMinutes: number;
    notes?: string;
  };

  const { vehiclePlate, mechanicName, date, actualMinutes, billableMinutes, notes } = body;

  if (!vehiclePlate?.trim() || !mechanicName?.trim() || !date || actualMinutes == null || billableMinutes == null) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (actualMinutes < 0 || billableMinutes < 0) {
    return NextResponse.json({ error: "Los minutos no pueden ser negativos" }, { status: 400 });
  }

  const [y, m, d] = date.split("-").map(Number);
  const parsedDate = new Date(y, m - 1, d, 12, 0, 0, 0);

  const entry = await prisma.quickEntry.create({
    data: {
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      mechanicName: mechanicName.trim(),
      date: parsedDate,
      actualHours: actualMinutes / 60,
      billableHours: billableMinutes / 60,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
