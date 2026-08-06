import { ConfigurationApp } from "@/components/configuration-app";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const [mechanics, brands] = await Promise.all([
    prisma.mechanic.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <ConfigurationApp initialMechanics={mechanics} initialBrands={brands} />;
}
