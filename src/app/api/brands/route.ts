import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCatalogEntrySchema } from "@/lib/work-orders";

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(brands);
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
    const brand = await prisma.brand.create({
      data: { name: parsed.data.name.trim() },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Esa marca ya existe" }, { status: 409 });
    }

    throw error;
  }
}
