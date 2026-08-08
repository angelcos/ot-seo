"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PerformanceApp } from "./performance-app";
import { IndustrialEmptyState, IndustrialHeader, IndustrialHeaderActionLink, IndustrialPanel, IndustrialStatCard, industrialTabGeometry } from "./ui/industrial-ui";

type Tab = "performance" | "vehicles" | "mechanics";

// ── Tipos para búsqueda de vehículo ──────────────────────────────────────────
type VehicleWO = {
  id: number;
  number: string;
  createdAt: string;
  customerName: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string | null;
  status: string;
  assignedMechanic: string;
  issueDescription: string | null;
  actualHours: number;
  billableHours: number;
};
type VehicleQE = {
  id: number;
  date: string;
  mechanicName: string;
  actualHours: number;
  billableHours: number;
  notes: string | null;
};
type VehicleData = {
  plate: string;
  hasMore: boolean;
  totalWOCount: number;
  totalVisits: number;
  totalBillableHours: number;
  totalActualHours: number;
  workOrders: VehicleWO[];
  quickEntries: VehicleQE[];
};

// ── Tipos para búsqueda de mecánico ──────────────────────────────────────────
type BrandEntry = { brand: string; count: number; pct: number };
type MechanicData = {
  mechanic: string;
  totalWorkOrders: number;
  completedWorkOrders: number;
  uniqueVehicles: number;
  brandBreakdown: BrandEntry[];
  totalActualHours: number;
  totalBillableHours: number;
  quickEntryCount: number;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  DONE: "Hecho",
  DELIVERED: "Entregado",
  CANCELED: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-emerald-100 text-emerald-700",
  DELIVERED: "bg-slate-100 text-slate-600",
  CANCELED: "bg-red-100 text-red-600",
};

// ── Pestaña vehículos ─────────────────────────────────────────────────────────
function VehiclesTab() {
  const [plate, setPlate] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentPlates, setRecentPlates] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/analisis/vehiculo?recientes=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { plates?: string[] }) => { if (d.plates) setRecentPlates(d.plates); })
      .catch(() => null);
  }, []);

  const search = useCallback(async (p: string, all = false) => {
    const clean = p.trim().toUpperCase();
    if (!clean) return;
    setPlate(clean);
    if (all) setLoadingAll(true); else setLoading(true);
    setError(null);
    if (!all) setData(null);
    const url = `/api/analisis/vehiculo?plate=${encodeURIComponent(clean)}${all ? "&all=true" : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      setData(await res.json());
    } else {
      setError("No se pudo obtener información para esa placa.");
    }
    if (all) setLoadingAll(false); else setLoading(false);
    setQuery(clean);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search(plate);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Chips de vehículos recientes */}
      {recentPlates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#33353A]">Recientes:</span>
          {recentPlates.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void search(p)}
              className="border border-[#CCCCCC] bg-[#F0F0F0] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#33353A] transition hover:border-[#B81318] hover:text-[#B81318]"
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="Ej. 1234ABC"
          maxLength={10}
          className="flex-1 border border-[#CCCCCC] bg-white px-4 py-2.5 text-sm font-medium tracking-wider text-slate-900 outline-none transition focus:border-[#B81318] focus:ring-1 focus:ring-[#B81318]"
        />
        <button
          type="submit"
          disabled={!plate.trim() || loading}
          className="bg-[#33353A] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#B81318] disabled:opacity-40"
        >
          Buscar
        </button>
      </form>

      {loading && <p className="text-sm text-slate-500">Buscando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="flex flex-col gap-5">
          {/* Listado OTs — primero para dar contexto rápido del historial */}
          {data.workOrders.length > 0 ? (
            <IndustrialPanel
              title={`Órdenes de trabajo (${data.workOrders.length}${data.hasMore ? ` de ${data.totalWOCount}` : ""})`}
              headingChildren={(
                <a
                  href={`/?plate=${encodeURIComponent(data.plate)}#work-orders-section`}
                  className="border border-white/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-white/10"
                >
                  Ver registros →
                </a>
              )}
            >
              <div className="divide-y divide-[#CCCCCC]">
                {data.workOrders.map((wo) => (
                    <div key={wo.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-28 font-mono text-xs font-semibold text-slate-500">{wo.number}</span>
                      <span className="text-slate-700">{wo.vehicleBrand} {wo.vehicleModel}{wo.vehicleYear ? ` (${wo.vehicleYear})` : ""}</span>
                      <span className="text-slate-500">{wo.customerName}</span>
                      <span className={`ml-auto px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[wo.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[wo.status] ?? wo.status}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(wo.createdAt).toLocaleDateString("es-ES")}</span>
                      <span className="text-xs text-slate-400">{wo.billableHours.toFixed(1)}h fact.</span>
                    </div>
                    {wo.issueDescription && (
                      <p className="ml-28 text-xs italic text-slate-500 line-clamp-2">{wo.issueDescription}</p>
                    )}
                  </div>
                ))}
              </div>
              {data.hasMore ? (
                <div className="flex items-center justify-between border-t border-[#CCCCCC] px-4 py-3">
                  <span className="text-xs text-slate-500">
                    Mostrando los últimos 12 meses ({data.workOrders.length} de {data.totalWOCount} OTs).
                  </span>
                  <button
                    type="button"
                    disabled={loadingAll}
                    onClick={() => void search(data.plate, true)}
                    className="border border-[#33353A] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#33353A] transition hover:bg-[#F0F0F0] disabled:opacity-40"
                  >
                    {loadingAll ? "Cargando..." : "Ver historial completo"}
                  </button>
                </div>
              ) : null}
            </IndustrialPanel>
          ) : (
            <IndustrialEmptyState className="py-6">
              Sin órdenes de trabajo para <strong>{query}</strong>.
            </IndustrialEmptyState>
          )}

          {/* Registros express */}
          {data.quickEntries.length > 0 && (
            <IndustrialPanel title={`Registros express (${data.quickEntries.length})`}>
              <div className="divide-y divide-[#CCCCCC]">
                {data.quickEntries.map((qe) => (
                  <div key={qe.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="text-slate-600">{new Date(qe.date).toLocaleDateString("es-ES")}</span>
                    <span className="text-slate-700">{qe.mechanicName}</span>
                    {qe.notes && <span className="text-slate-500 italic">{qe.notes}</span>}
                    <span className="ml-auto text-xs text-slate-400">{qe.billableHours.toFixed(2)}h fact.</span>
                  </div>
                ))}
              </div>
            </IndustrialPanel>
          )}

          {/* Resumen estadístico al final */}
          {(data.workOrders.length > 0 || data.quickEntries.length > 0) && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <IndustrialStatCard label="Placa" value={data.plate} />
              <IndustrialStatCard label="Asistencias" value={String(data.totalVisits)} />
              <IndustrialStatCard label="Horas facturadas" value={`${data.totalBillableHours.toFixed(1)} h`} />
              <IndustrialStatCard label="Horas reales" value={`${data.totalActualHours.toFixed(1)} h`} />
            </div>
          )}

          {data.workOrders.length === 0 && data.quickEntries.length === 0 && (
            <IndustrialEmptyState>
              No hay registros para la placa <strong>{query}</strong>.
            </IndustrialEmptyState>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pestaña mecánicos ─────────────────────────────────────────────────────────
function MechanicsTab({ mechanics }: { mechanics: string[] }) {
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<MechanicData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const router = useRouter();

  const search = useCallback(async (name: string) => {
    if (!name) return;
    setLoading(true);
    setData(null);
    const res = await fetch(`/api/analisis/mecanico?name=${encodeURIComponent(name)}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  const handleChange = (name: string) => {
    setSelected(name);
    void search(name);
  };

  const handleOTsClick = () => {
    const params = new URLSearchParams();
    params.set("mechanic", selected);
    router.push(`/?${params.toString()}`);
    // Scroll a la sección de OTs después de navegar
    setTimeout(() => {
      const woSection = document.getElementById("work-orders-section");
      if (woSection) woSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <select
          value={selected}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 border border-[#CCCCCC] bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#B81318]"
        >
          <option value="">Selecciona un mecánico…</option>
          {mechanics.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}

      {data && (
        <div className="flex flex-col gap-5">
          {/* Estadísticas resumen */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <button
            type="button"
            onClick={handleOTsClick}
            className="block border border-[#CCCCCC] bg-white p-4 transition hover:border-[#B81318] text-left"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#33353A]">OT asignadas</p>
            <p className="mt-1 text-2xl font-bold text-[#B81318]">{data.totalWorkOrders}</p>
            <p className="mt-0.5 text-xs font-semibold text-[#B81318]">Ver OTs &rarr;</p>
          </button>
            <IndustrialStatCard label="OT completadas" value={String(data.completedWorkOrders)} />
            <IndustrialStatCard label="Vehículos únicos" value={String(data.uniqueVehicles)} />
            <IndustrialStatCard label="Registros express" value={String(data.quickEntryCount)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <IndustrialStatCard label="Horas reales (total)" value={`${data.totalActualHours.toFixed(1)} h`} />
            <IndustrialStatCard label="Horas facturadas (total)" value={`${data.totalBillableHours.toFixed(1)} h`} />
          </div>

          {/* Distribución por marca */}
          {data.brandBreakdown.length > 0 && (
            <IndustrialPanel title="Distribución por marca">
              <div className="p-4">
              <div className="flex flex-col gap-3">
                {data.brandBreakdown.slice(0, showAllBrands ? undefined : 3).map((b) => (
                  <div key={b.brand}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-800">{b.brand}</span>
                      <span className="text-slate-500">{b.count} OT · {b.pct}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden bg-[#F0F0F0]">
                      <div className="h-full bg-[#B81318] transition-all" style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {data.brandBreakdown.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllBrands(!showAllBrands)}
                  className="mt-4 w-full border border-[#B81318] bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#B81318] transition hover:bg-red-50"
                >
                  {showAllBrands ? "Mostrar menos" : "Mostrar más"}
                </button>
              )}
              </div>
            </IndustrialPanel>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function AnalysisApp({ initialTab, mechanics: mechanicsList }: { initialTab: Tab; mechanics: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = (searchParams.get("tab") as Tab) ?? initialTab;

  const setTab = (t: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.push(`/analisis?${params.toString()}`);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "performance", label: "Rendimiento" },
    { id: "vehicles", label: "Vehículos" },
    { id: "mechanics", label: "Mecánicos" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-0">
      <IndustrialHeader
        title="Centro de Análisis"
        actions={(
          <IndustrialHeaderActionLink href="/">
            ← Volver
          </IndustrialHeaderActionLink>
        )}
      />

      {/* Pestañas con corte diagonal — paralelelogramo corporativo */}
      <div className="flex bg-[#CCCCCC] gap-px">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="relative flex items-center justify-center overflow-hidden px-10 py-3 text-xs font-bold uppercase tracking-widest text-white"
            style={{
              background: tab === t.id ? "#B81318" : "#33353A",
              clipPath: i === 0
                ? industrialTabGeometry.firstClipPath
                : i === tabs.length - 1
                ? industrialTabGeometry.middleClipPath
                : industrialTabGeometry.middleClipPath,
              zIndex: tab === t.id ? 2 : 1,
              marginRight: i < tabs.length - 1 ? industrialTabGeometry.overlap : "0",
            }}
          >
            {t.label}
          </button>
        ))}
        {/* Relleno rojo derecho con línea diagonal gris clara */}
        <div className="-ml-[6px] flex-1 bg-[#B81318]" style={{ clipPath: industrialTabGeometry.endCapClipPath }} />
      </div>

      {/* Contenido de la pestaña */}
      <div className="border-x border-b border-[#CCCCCC] bg-white p-5 md:p-7">
        {tab === "performance" && <PerformanceApp />}
        {tab === "vehicles" && <VehiclesTab />}
        {tab === "mechanics" && <MechanicsTab mechanics={mechanicsList} />}
      </div>
    </div>
  );
}
