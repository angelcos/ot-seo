import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCatalogEntrySchema } from "@/lib/work-orders";

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

  try {
    const mechanic = await prisma.mechanic.create({
      data: { name: parsed.data.name.trim() },
    });

    return NextResponse.json(mechanic, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Ese mecanico ya existe" }, { status: 409 });
    }

    throw error;
  }
}
