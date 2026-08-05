import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCatalogEntrySchema } from "@/lib/work-orders";

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
  const parsed = updateCatalogEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos invalidos", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const brand = await prisma.brand.update({
    where: { id: parsedId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
  });

  return NextResponse.json(brand);
}
