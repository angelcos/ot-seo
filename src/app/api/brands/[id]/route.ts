import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeCatalogNameKey, updateCatalogEntrySchema } from "@/lib/work-orders";

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

  let normalizedName: string | undefined;
  if (parsed.data.name !== undefined) {
    normalizedName = parsed.data.name.trim().replace(/\s+/g, " ");
    const candidateName = normalizedName;
    const existingBrands = await prisma.brand.findMany({
      where: { id: { not: parsedId } },
      select: { id: true, name: true },
    });
    const duplicatedBrand = existingBrands.find(
      (brand) => normalizeCatalogNameKey(brand.name) === normalizeCatalogNameKey(candidateName),
    );

    if (duplicatedBrand) {
      return NextResponse.json(
        { message: "Ya existe otra marca con ese nombre. No se distingue entre mayusculas y minusculas." },
        { status: 409 },
      );
    }
  }

  try {
    const current = await prisma.brand.findUnique({ where: { id: parsedId }, select: { name: true } });
    const oldName = current?.name;

    const brand = await prisma.brand.update({
      where: { id: parsedId },
      data: {
        ...(normalizedName !== undefined ? { name: normalizedName } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    // Cascade name change to work orders (covers case-only renames like "OPEL" → "Opel")
    if (normalizedName !== undefined && oldName && oldName !== normalizedName) {
      const distinctBrands = await prisma.workOrder.findMany({
        select: { vehicleBrand: true },
        distinct: ["vehicleBrand"],
      });
      const variants = distinctBrands.map((r) => r.vehicleBrand).filter((b) => normalizeCatalogNameKey(b) === normalizeCatalogNameKey(oldName));
      for (const variant of variants) {
        await prisma.workOrder.updateMany({ where: { vehicleBrand: variant }, data: { vehicleBrand: normalizedName } });
      }
    }

    return NextResponse.json(brand);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Ya existe otra marca con ese nombre. Cambia el nombre o edita la marca existente." },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  const brand = await prisma.brand.findUnique({
    where: { id: parsedId },
    select: { id: true, isActive: true },
  });

  if (!brand) {
    return NextResponse.json({ message: "Marca no encontrada" }, { status: 404 });
  }

  if (brand.isActive) {
    return NextResponse.json(
      { message: "Primero marca la marca como baja para poder eliminarla" },
      { status: 409 },
    );
  }

  await prisma.brand.delete({ where: { id: parsedId } });
  return NextResponse.json({ ok: true });
}
