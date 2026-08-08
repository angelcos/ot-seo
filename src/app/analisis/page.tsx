import { Suspense } from "react";
import { AnalysisApp } from "@/components/analysis-app";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const validTabs = ["performance", "vehicles", "mechanics"] as const;
  type Tab = typeof validTabs[number];
  const initialTab: Tab = validTabs.includes(tab as Tab) ? (tab as Tab) : "performance";

  const mechanics = await prisma.mechanic.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { name: true },
  });

  return (
    <Suspense>
      <AnalysisApp
        initialTab={initialTab}
        mechanics={mechanics.map((m) => m.name)}
      />
    </Suspense>
  );
}
