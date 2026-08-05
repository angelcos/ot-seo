"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BrandDTO, MechanicDTO, WorkOrderDTO } from "@/lib/work-orders";

type WorkOrderStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "DELIVERED";

type FormState = {
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  mileage: string;
  assignedMechanic: string;
  issueDescription: string;
};

const STATUS_OPTIONS: Array<{ value: WorkOrderStatus; label: string }> = [
  { value: "PENDING", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En curso" },
  { value: "DONE", label: "Terminada" },
  { value: "DELIVERED", label: "Entregada" },
];

const initialForm: FormState = {
  customerName: "",
  customerPhone: "",
  vehiclePlate: "",
  vehicleBrand: "",
  vehicleModel: "",
  vehicleYear: "",
  mileage: "",
  assignedMechanic: "",
  issueDescription: "",
};

export function WorkOrdersApp({
  initialOrders,
  initialMechanics,
  initialBrands,
}: {
  initialOrders: WorkOrderDTO[];
  initialMechanics: MechanicDTO[];
  initialBrands: BrandDTO[];
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [orders, setOrders] = useState<WorkOrderDTO[]>(initialOrders);
  const [mechanics] = useState<MechanicDTO[]>(initialMechanics);
  const [brands] = useState<BrandDTO[]>(initialBrands);
  const [isCreating, setIsCreating] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const activeMechanics = useMemo(
    () => mechanics.filter((mechanic) => mechanic.isActive).map((mechanic) => mechanic.name),
    [mechanics],
  );

  const activeBrandNames = useMemo(
    () => brands.filter((brand) => brand.isActive).map((brand) => brand.name),
    [brands],
  );

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "DONE" && order.status !== "DELIVERED"),
    [orders],
  );

  const quickLoad = useMemo(() => {
    const grouped = new Map<string, WorkOrderDTO[]>();

    for (const order of activeOrders) {
      const key = order.assignedMechanic.trim() || "Sin asignar";
      const list = grouped.get(key) ?? [];
      list.push(order);
      grouped.set(key, list);
    }

    return Array.from(grouped.entries())
      .map(([name, list]) => ({
        name,
        count: list.length,
        latestOrder: list[0]?.number ?? "-",
        latestIssue: list[0]?.issueDescription?.trim() || "Sin detalle de averia",
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
  }, [activeOrders]);

  const unassignedCount = useMemo(
    () => activeOrders.filter((order) => !order.assignedMechanic.trim()).length,
    [activeOrders],
  );

  const filterOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        orders
          .map((order) => order.assignedMechanic.trim())
          .filter((name) => name.length > 0),
      ),
    );
    return names.sort((a, b) => a.localeCompare(b, "es"));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }
    if (filter === "unassigned") {
      return orders.filter((order) => !order.assignedMechanic.trim());
    }
    return orders.filter((order) => order.assignedMechanic === filter);
  }, [orders, filter]);

  async function refreshOrders() {
    const response = await fetch("/api/work-orders", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("No se pudo recargar el listado");
    }
    const data = (await response.json()) as WorkOrderDTO[];
    setOrders(data);
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          mileage: form.mileage,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "No se pudo crear la OT");
      }

      setForm((previous) => ({
        ...initialForm,
        assignedMechanic: previous.assignedMechanic,
      }));
      await refreshOrders();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al crear OT");
    } finally {
      setIsCreating(false);
    }
  }

  async function updateOrder(orderId: number, payload: { assignedMechanic?: string; status?: WorkOrderStatus }) {
    setSavingOrderId(orderId);
    try {
      const response = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar la OT");
      }

      const updated = (await response.json()) as {
        id: number;
        assignedMechanic: string;
        status: WorkOrderStatus;
      };

      setOrders((previous) =>
        previous.map((item) =>
          item.id === updated.id
            ? { ...item, assignedMechanic: updated.assignedMechanic, status: updated.status }
            : item,
        ),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Error al actualizar OT");
    } finally {
      setSavingOrderId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-[linear-gradient(128deg,#5f969c_0%,#85bec5_58%,#b7dde1_100%)] px-6 py-7 text-white shadow-lg shadow-cyan-200/70">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">SEO MECANICA</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Ordenes de Trabajo</h1>
            <p className="mt-2 max-w-3xl text-sm text-cyan-50/95 md:text-base">
              Flujo de recepcion rapido: guardar OT, asignar cuando haya disponibilidad y generar PDF
              desde historial.
            </p>
          </div>
          <Link
            href="/configuracion"
            className="rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            Configuracion
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard title="OT Totales" value={String(orders.length)} detail="Historial completo" />
        <StatCard title="OT Activas" value={String(activeOrders.length)} detail="Pendiente y en curso" />
        <StatCard title="Sin asignar" value={String(unassignedCount)} detail="En espera de mecanico" />
        <StatCard title="Mecanicos activos" value={String(activeMechanics.length)} detail="Disponibles" />
      </section>

      <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm md:p-7">
        <h2 className="text-xl font-semibold text-slate-900">Carga Rapida por Mecanico</h2>
        <p className="mb-4 text-sm text-slate-600">
          Esta vista se recalcula automaticamente en cada cambio de asignacion o estado.
        </p>

        {quickLoad.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No hay OT activas.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickLoad.map((item) => (
              <article key={item.name} className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                  <span className="rounded-full bg-cyan-700 px-2.5 py-1 text-xs font-semibold text-white">
                    {item.count} OT
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Ultima OT activa</p>
                <p className="text-sm font-semibold text-slate-900">{item.latestOrder}</p>
                <p className="mt-2 text-sm text-slate-600">{item.latestIssue}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 md:p-7">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Nueva OT</h2>
          <p className="mt-1 text-sm text-slate-600">
            Obligatorios: cliente, telefono, marca y modelo. El mecanico se puede asignar despues.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-slate-700">
          El PDF ya no se abre automaticamente. Se descarga desde el historial cuando quieras imprimir.
        </div>

        <form className="grid gap-4 md:col-span-2" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Cliente" value={form.customerName} onChange={(v) => handleChange("customerName", v)} required />
            <Input label="Telefono" value={form.customerPhone} onChange={(v) => handleChange("customerPhone", v)} required />
            <Select
              label="Mecanico asignado"
              value={form.assignedMechanic}
              onChange={(v) => handleChange("assignedMechanic", v)}
              options={[{ value: "", label: "Sin asignar" }, ...activeMechanics.map((m) => ({ value: m, label: m }))]}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Input
              label="Matricula"
              value={form.vehiclePlate}
              onChange={(v) => handleChange("vehiclePlate", v.toUpperCase())}
              maxLength={12}
            />
            <Input label="Marca" value={form.vehicleBrand} onChange={(v) => handleChange("vehicleBrand", v)} required list="brand-options" />
            <Input label="Modelo" value={form.vehicleModel} onChange={(v) => handleChange("vehicleModel", v)} required />
            <Input label="Ano" value={form.vehicleYear} onChange={(v) => handleChange("vehicleYear", v)} />
            <Input label="Kilometros" type="number" value={form.mileage} onChange={(v) => handleChange("mileage", v)} />
          </div>

          <datalist id="brand-options">
            {activeBrandNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <Textarea
            label="Averia reportada por el cliente"
            value={form.issueDescription}
            onChange={(v) => handleChange("issueDescription", v)}
            placeholder="(Opcional)"
          />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreating}
            >
              {isCreating ? "Guardando..." : "Guardar OT"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Historial de Ordenes de Trabajo</h2>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="unassigned">Sin asignar</option>
              {filterOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={() => refreshOrders().catch(() => setError("No se pudo recargar la lista"))}
            >
              Actualizar
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No hay OT para el filtro seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">Numero</th>
                  <th className="px-2 py-3">Fecha</th>
                  <th className="px-2 py-3">Cliente</th>
                  <th className="px-2 py-3">Vehiculo</th>
                  <th className="px-2 py-3">Mecanico</th>
                  <th className="px-2 py-3">Estado</th>
                  <th className="px-2 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    mechanicOptions={activeMechanics}
                    isSaving={savingOrderId === order.id}
                    onUpdate={updateOrder}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function OrderRow({
  order,
  mechanicOptions,
  onUpdate,
  isSaving,
}: {
  order: WorkOrderDTO;
  mechanicOptions: string[];
  onUpdate: (id: number, payload: { assignedMechanic?: string; status?: WorkOrderStatus }) => void;
  isSaving: boolean;
}) {
  return (
    <tr className="border-b border-slate-100 text-slate-700">
      <td className="px-2 py-3 font-semibold text-slate-900">{order.number}</td>
      <td className="px-2 py-3">{new Date(order.createdAt).toLocaleString("es-ES")}</td>
      <td className="px-2 py-3">{order.customerName}</td>
      <td className="px-2 py-3">{[order.vehicleBrand, order.vehicleModel, order.vehiclePlate].filter(Boolean).join(" ")}</td>
      <td className="px-2 py-3">
        <select
          className="w-44 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
          value={order.assignedMechanic}
          onChange={(event) => {
            const value = event.target.value;
            onUpdate(order.id, { assignedMechanic: value });
          }}
          disabled={isSaving}
        >
          <option value="">Sin asignar</option>
          {[...new Set([...mechanicOptions, order.assignedMechanic].filter(Boolean))].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-3">
        <select
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
          value={order.status}
          onChange={(event) => {
            const value = event.target.value as WorkOrderStatus;
            onUpdate(order.id, { status: value });
          }}
          disabled={isSaving}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-3 text-right">
        <button
          type="button"
          onClick={() => {
            window.open(`/api/work-orders/${order.id}/pdf?ts=${Date.now()}`, "_blank", "noopener,noreferrer");
          }}
          className="rounded-lg border border-cyan-300 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
        >
          Ver PDF
        </button>
      </td>
    </tr>
  );
}

function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
  list,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  list?: string;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <input
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        list={list}
        maxLength={maxLength}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <select
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value || "none"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <textarea
        className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
