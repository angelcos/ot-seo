import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCatalogEntrySchema, normalizeCatalogNameKey } from "@/lib/work-orders";

export async function GET() {
  const mechanics = await prisma.mechanic.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(mechanics);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createCatalogEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos invalidos", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const normalizedName = parsed.data.name.trim().replace(/\s+/g, " ");

  const existingMechanics = await prisma.mechanic.findMany({
    select: { id: true, name: true },
  });
  const duplicatedMechanic = existingMechanics.find(
    (mechanic) => normalizeCatalogNameKey(mechanic.name) === normalizeCatalogNameKey(normalizedName),
  );

  if (duplicatedMechanic) {
    return NextResponse.json(
      { message: "Ya existe un mecanico con ese nombre. No se distingue entre mayusculas y minusculas." },
      { status: 409 },
    );
  }

  try {
    const mechanic = await prisma.mechanic.create({
      data: {
        name: normalizedName,
        ...(parsed.data.dailyCapacityHours !== undefined
          ? { dailyCapacityHours: parsed.data.dailyCapacityHours }
          : {}),
      },
    });

    return NextResponse.json(mechanic, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Ese mecanico ya existe" }, { status: 409 });
    }

    throw error;
  }
}
