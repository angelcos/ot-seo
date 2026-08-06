import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function localIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Monday of the week containing d
function weekStart(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "week"; // "week" | "month"
  const ref = searchParams.get("ref"); // ISO date within the desired period

  const refDate = ref ? parseLocalDateOnly(ref) ?? new Date(ref) : new Date();

  let from: Date, to: Date, periodLabel: string;
  let entriesTo: Date;

  if (mode === "month") {
    from = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    to = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59);
    entriesTo = to;
    periodLabel = from.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  } else {
    from = weekStart(refDate);
    to = addDays(from, 6);
    to.setHours(23, 59, 59);
    entriesTo = addDays(from, 4);
    entriesTo.setHours(23, 59, 59);
    periodLabel = `Semana del ${from.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} al ${addDays(from, 4).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  }

  // Build prev/next refs
  const prevRef = mode === "month"
    ? localIsoDate(new Date(from.getFullYear(), from.getMonth() - 1, 1))
    : localIsoDate(addDays(from, -7));
  const nextRef = mode === "month"
    ? localIsoDate(new Date(from.getFullYear(), from.getMonth() + 1, 1))
    : localIsoDate(addDays(from, 7));

  const [entries, mechanics] = await Promise.all([
    prisma.workTimeEntry.findMany({
      where: { date: { gte: from, lte: entriesTo } },
      orderBy: { date: "asc" },
    }),
    prisma.mechanic.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Build day slots (Mon-Fri for week, day 1..N for month)
  const days: { date: string; label: string; byMechanic: Record<string, { actual: number; billable: number }> }[] = [];

  if (mode === "week") {
    for (let i = 0; i < 5; i++) {
      const d = addDays(from, i);
      days.push({
        date: localIsoDate(d),
        label: d.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit" }),
        byMechanic: {},
      });
    }
  } else {
    // Group by week within month for monthly view
    const current = new Date(from);
    while (current <= to) {
      const wStart = weekStart(new Date(current));
      const key = localIsoDate(wStart);
      if (!days.find((d) => d.date === key)) {
        days.push({
          date: key,
          label: `${wStart.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}`,
          byMechanic: {},
        });
      }
      current.setDate(current.getDate() + 7);
    }
  }

  // Aggregate entries into day slots
  for (const entry of entries) {
    const entryDate = localIsoDate(entry.date);
    let slot: typeof days[0] | undefined;

    if (mode === "week") {
      slot = days.find((d) => d.date === entryDate);
    } else {
      const ws = localIsoDate(weekStart(entry.date));
      slot = days.find((d) => d.date === ws);
    }

    if (!slot) continue;
    const mech = slot.byMechanic[entry.mechanicName] ?? { actual: 0, billable: 0 };
    mech.actual += entry.actualHours;
    mech.billable += entry.billableHours;
    slot.byMechanic[entry.mechanicName] = mech;
  }

  // Mechanic totals for the period
  const mechanicTotals = mechanics.map((m) => {
    const total = entries
      .filter((e) => e.mechanicName === m.name)
      .reduce((acc, e) => ({ actual: acc.actual + e.actualHours, billable: acc.billable + e.billableHours }), { actual: 0, billable: 0 });

    // Count working days in range (Mon–Fri)
    let workingDays = 0;
    const cur = new Date(from);
    while (cur <= to) {
      const dow = cur.getDay();
      if (dow >= 1 && dow <= 5) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }
    const totalCapacity = m.dailyCapacityHours * workingDays;
    const utilizationPct = totalCapacity > 0 ? Math.round((total.billable / totalCapacity) * 100) : 0;

    return {
      name: m.name,
      dailyCapacityHours: m.dailyCapacityHours,
      totalActual: total.actual,
      totalBillable: total.billable,
      totalCapacity,
      utilizationPct,
    };
  });

  return NextResponse.json({
    mode,
    periodLabel,
    prevRef,
    nextRef,
    mechanics: mechanics.map((m) => ({ name: m.name, dailyCapacityHours: m.dailyCapacityHours })),
    days,
    mechanicTotals,
  });
}
