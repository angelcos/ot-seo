"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type MechanicInfo = { name: string; dailyCapacityHours: number };
type DayData = {
  date: string;
  label: string;
  byMechanic: Record<string, { actual: number; billable: number }>;
};
type MechanicTotal = {
  name: string;
  dailyCapacityHours: number;
  totalActual: number;
  totalBillable: number;
  totalCapacity: number;
  utilizationPct: number;
};
type ReportData = {
  mode: string;
  periodLabel: string;
  prevRef: string;
  nextRef: string;
  mechanics: MechanicInfo[];
  days: DayData[];
  mechanicTotals: MechanicTotal[];
};

const MECHANIC_COLORS = [
  "bg-cyan-600", "bg-violet-500", "bg-amber-500", "bg-emerald-500",
  "bg-rose-500", "bg-sky-500", "bg-orange-500", "bg-teal-500",
];
const MECHANIC_COLORS_LIGHT = [
  "bg-cyan-100", "bg-violet-100", "bg-amber-100", "bg-emerald-100",
  "bg-rose-100", "bg-sky-100", "bg-orange-100", "bg-teal-100",
];
const MECHANIC_TEXT = [
  "text-cyan-700", "text-violet-700", "text-amber-700", "text-emerald-700",
  "text-rose-700", "text-sky-700", "text-orange-700", "text-teal-700",
];

function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ReportsApp() {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [ref, setRef] = useState(today());
  const [capacityContext, setCapacityContext] = useState<number | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const todayIso = today();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?mode=${mode}&ref=${ref}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [mode, ref]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!data) return;
    const capacities = Array.from(new Set(data.mechanics.map((m) => m.dailyCapacityHours))).sort((a, b) => b - a);
    if (capacities.length === 0) {
      setCapacityContext(null);
      return;
    }
    setCapacityContext((prev) => (prev !== null && capacities.includes(prev) ? prev : capacities[0]));
  }, [data]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Cargando reportes...</p>
      </div>
    );
  }

  const colorIdx = (name: string) => data.mechanics.findIndex((m) => m.name === name) % MECHANIC_COLORS.length;

  const capacityOptions = Array.from(new Set(data.mechanics.map((m) => m.dailyCapacityHours))).sort((a, b) => b - a);
  const selectedCapacity = capacityContext ?? capacityOptions[0] ?? 8;
  const mechanicsInContext = data.mechanics.filter((m) => m.dailyCapacityHours === selectedCapacity);

  const chartHeight = 140;
  const chartHeadroom = 26;
  const chartTotalHeight = chartHeight + chartHeadroom;
  const yTicks = [selectedCapacity, selectedCapacity / 2, 0];
  const yGrid = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: selectedCapacity * f,
    bottom: f * chartHeight,
  }));
  const hourToPx = (hours: number) => (hours / selectedCapacity) * chartHeight;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-[linear-gradient(128deg,#5f969c_0%,#85bec5_58%,#b7dde1_100%)] px-6 py-7 text-white shadow-lg shadow-cyan-200/70">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">SEO MECANICA</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Reportes</h1>
            <p className="mt-2 max-w-3xl text-sm text-cyan-50/95 md:text-base">
              Horas por mecanico, utilizacion de capacidad y evolucion temporal.
            </p>
          </div>
          <Link href="/" className="rounded-xl border border-cyan-800/40 bg-white/90 px-4 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-white">
            Volver
          </Link>
        </div>
      </header>

      {/* Period navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button type="button"
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${mode === "week" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => { setMode("week"); setRef(today()); }}>
            Semana
          </button>
          <button type="button"
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${mode === "month" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => { setMode("month"); setRef(today()); }}>
            Mes
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => setRef(data.prevRef)}>
            &#8592; Anterior
          </button>
          <span className="text-sm font-medium text-slate-700">{data.periodLabel}</span>
          <button type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => setRef(data.nextRef)}
            disabled={data.nextRef > todayIso}>
            Siguiente &#8594;
          </button>
        </div>
      </div>

      {/* Leyenda mecanicos */}
      {data.mechanics.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {mechanicsInContext.map((m, i) => (
            <span key={m.name} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${MECHANIC_COLORS_LIGHT[i % MECHANIC_COLORS_LIGHT.length]} ${MECHANIC_TEXT[i % MECHANIC_TEXT.length]}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${MECHANIC_COLORS[i % MECHANIC_COLORS.length]}`} />
              {m.name} · {m.dailyCapacityHours}h/dia
            </span>
          ))}
        </div>
      ) : null}

      {/* Grafica horas reales vs facturables por dia */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Horas reales vs facturables</h2>
            <p className="mt-1 text-sm text-slate-500">Barra izquierda = reales · barra derecha = facturables · eje Y en horas segun jornada seleccionada</p>
          </div>
          {capacityOptions.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Contexto de jornada
              <select
                value={selectedCapacity}
                onChange={(e) => setCapacityContext(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              >
                {capacityOptions.map((h) => (
                  <option key={h} value={h}>{h}h/dia</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {mechanicsInContext.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            No hay mecanicos activos con jornada de {selectedCapacity}h/dia.
          </p>
        ) : data.days.every((d) => mechanicsInContext.every((m) => !d.byMechanic[m.name])) ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            Sin datos para este periodo. Registra tiempos desde el historial de OTs.
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 pt-2">
            <div className="relative mr-1 w-10 shrink-0 text-[11px] text-slate-500" style={{ height: `${chartTotalHeight}px` }}>
              {yTicks.map((tick) => {
                const bottom = hourToPx(tick);
                return (
                  <span
                    key={tick}
                    className="absolute right-1 translate-y-1/2 text-right"
                    style={{ bottom: `${bottom}px` }}
                  >
                    {tick}h
                  </span>
                );
              })}
            </div>
            {data.days.map((day) => {
              const mechs = mechanicsInContext.filter((m) => day.byMechanic[m.name]);
              return (
                <div key={day.date} className="flex min-w-24 flex-1 flex-col items-center gap-2">
                  <div className="relative w-full overflow-visible" style={{ height: `${chartTotalHeight}px` }}>
                    <div className="absolute inset-x-0 bottom-0" style={{ height: `${chartHeight}px` }}>
                      {yGrid.map((line) => (
                        <div
                          key={line.value}
                          className={`pointer-events-none absolute left-1 right-1 border-t ${line.value === selectedCapacity ? "border-slate-400" : "border-slate-200"} ${line.value === 0 || line.value === selectedCapacity ? "border-dashed" : "border-dotted"}`}
                          style={{ bottom: `${line.bottom}px` }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex h-full items-end justify-center gap-1 overflow-visible">
                    {mechs.length === 0 ? (
                      <div className="w-2 rounded-t-sm bg-slate-100" style={{ height: `${chartHeight}px` }} />
                    ) : mechs.map((m) => {
                      const ci = colorIdx(m.name);
                      const entry = day.byMechanic[m.name];
                      const actH = Math.round(hourToPx(entry.actual));
                      const billH = Math.round(hourToPx(entry.billable));
                      const overflowAct = entry.actual > selectedCapacity;
                      const overflowBill = entry.billable > selectedCapacity;
                      return (
                        <div key={m.name} className="flex items-end gap-0.5" title={`${m.name}: ${entry.actual}h real / ${entry.billable}h fact.`}>
                          <div className="relative">
                            <div
                              className={`w-3.5 rounded-t-sm opacity-60 ${MECHANIC_COLORS[ci]} ${overflowAct ? "ring-1 ring-slate-400" : ""}`}
                              style={{ height: `${Math.max(actH, 2)}px` }}
                            />
                            {overflowAct ? (
                              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-600" style={{ bottom: `${Math.max(actH, 2) + 2}px` }}>
                                +{(entry.actual - selectedCapacity).toFixed(1)}
                              </span>
                            ) : null}
                          </div>
                          <div className="relative">
                            <div
                              className={`w-3.5 rounded-t-sm ${MECHANIC_COLORS[ci]} ${overflowBill ? "ring-1 ring-slate-500" : ""}`}
                              style={{ height: `${Math.max(billH, 2)}px` }}
                            />
                            {overflowBill ? (
                              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-700" style={{ bottom: `${Math.max(billH, 2) + 2}px` }}>
                                +{(entry.billable - selectedCapacity).toFixed(1)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                  <span className="text-center text-[10px] leading-tight text-slate-500">{day.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Utilizacion de capacidad por mecanico */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Utilizacion de capacidad</h2>
        <p className="mb-5 text-sm text-slate-500">
          Horas facturables del periodo vs horas disponibles segun la jornada configurada por mecanico.
        </p>

        {data.mechanicTotals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            No hay mecanicos activos con datos en este periodo.
          </p>
        ) : (
          <div className="space-y-4">
            {data.mechanicTotals.map((m, i) => {
              const ci = i % MECHANIC_COLORS.length;
              const pct = Math.min(m.utilizationPct, 100);
              return (
                <div key={m.name}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">{m.name}</span>
                    <span className="text-xs text-slate-500">
                      {m.totalBillable.toFixed(1)}h fact. / {m.totalCapacity.toFixed(0)}h disp.
                      <span className={`ml-2 font-semibold ${m.utilizationPct >= 80 ? "text-emerald-600" : m.utilizationPct >= 50 ? "text-amber-600" : "text-slate-500"}`}>
                        {m.utilizationPct}%
                      </span>
                    </span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${MECHANIC_COLORS[ci]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex gap-4 text-[11px] text-slate-400">
                    <span>Real: {m.totalActual.toFixed(1)}h</span>
                    <span>Fact.: {m.totalBillable.toFixed(1)}h</span>
                    <span>Capacidad: {m.totalCapacity.toFixed(0)}h ({m.dailyCapacityHours}h/dia)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
