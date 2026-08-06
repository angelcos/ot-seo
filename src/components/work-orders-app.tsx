"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import type { BrandDTO, MechanicDTO, WorkOrderDTO } from "@/lib/work-orders";

type WorkOrderStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "DELIVERED" | "CANCELED";

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
  { value: "CANCELED", label: "Anulada" },
];

const PAGE_SIZE = 8;

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
  totalOrderCount,
}: {
  initialOrders: WorkOrderDTO[];
  initialMechanics: MechanicDTO[];
  initialBrands: BrandDTO[];
  totalOrderCount: number;
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [orders, setOrders] = useState<WorkOrderDTO[]>(initialOrders);
  const [mechanics] = useState<MechanicDTO[]>(initialMechanics);
  const [brands] = useState<BrandDTO[]>(initialBrands);
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadAll, setLoadAll] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [timeEntryModal, setTimeEntryModal] = useState<{ orderId: number; orderNumber: string } | null>(null);

  const hasMore = !loadAll && totalOrderCount > orders.length;

  const formSectionRef = useRef<HTMLElement>(null);

  const activeMechanics = useMemo(
    () => mechanics.filter((mechanic) => mechanic.isActive).map((mechanic) => mechanic.name),
    [mechanics],
  );

  const activeBrandNames = useMemo(
    () => brands.filter((brand) => brand.isActive).map((brand) => brand.name),
    [brands],
  );

  const brandOptions = useMemo(() => {
    const options = activeBrandNames.map((brand) => ({ value: brand, label: brand }));

    if (form.vehicleBrand && !activeBrandNames.includes(form.vehicleBrand)) {
      return [
        { value: "", label: "Selecciona una marca" },
        { value: form.vehicleBrand, label: `${form.vehicleBrand} (no registrada)` },
        ...options,
      ];
    }

    return [{ value: "", label: "Selecciona una marca" }, ...options];
  }, [activeBrandNames, form.vehicleBrand]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "DONE" && order.status !== "DELIVERED" && order.status !== "CANCELED"),
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

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showBrandCatalogHint = error !== null && (
    error.includes("marca valida del listado registrado") ||
    error.includes("registradas en configuracion")
  );

  function changeFilter(value: string) {
    setFilter(value);
    setCurrentPage(1);
  }

  async function refreshOrders(fetchAll = false) {
    const url = fetchAll ? "/api/work-orders?all=true" : "/api/work-orders";
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo recargar el listado");
    const data = (await response.json()) as WorkOrderDTO[];
    setOrders(data);
  }

  async function handleLoadAll() {
    setIsLoadingAll(true);
    try {
      await refreshOrders(true);
      setLoadAll(true);
      setCurrentPage(1);
    } catch {
      setError("No se pudo cargar el historial completo");
    } finally {
      setIsLoadingAll(false);
    }
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function handleEdit(order: WorkOrderDTO) {
    setEditingOrderId(order.id);
    setForm({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      vehiclePlate: order.vehiclePlate ?? "",
      vehicleBrand: order.vehicleBrand,
      vehicleModel: order.vehicleModel,
      vehicleYear: order.vehicleYear ?? "",
      mileage: order.mileage != null ? String(order.mileage) : "",
      assignedMechanic: order.assignedMechanic,
      issueDescription: order.issueDescription ?? "",
    });
    setError(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function handleCancelEdit() {
    setEditingOrderId(null);
    setForm(initialForm);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      if (!activeBrandNames.includes(form.vehicleBrand)) {
        throw new Error("Selecciona una marca valida del listado registrado.");
      }

      if (editingOrderId !== null) {
        const response = await fetch(`/api/work-orders/${editingOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo actualizar la OT");
        }

        const updated = (await response.json()) as WorkOrderDTO;
        setOrders((previous) =>
          previous.map((item) =>
            item.id === editingOrderId ? { ...item, ...updated } : item,
          ),
        );
        setEditingOrderId(null);
        setForm(initialForm);
      } else {
        const response = await fetch("/api/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, mileage: form.mileage }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo crear la OT");
        }

        setForm((previous) => ({
          ...initialForm,
          assignedMechanic: previous.assignedMechanic,
        }));
        await refreshOrders(loadAll);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al procesar OT");
    } finally {
      setIsCreating(false);
    }
  }

  async function updateOrder(
    orderId: number,
    payload: { assignedMechanic?: string; status?: WorkOrderStatus },
  ) {
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

      const updated = (await response.json()) as WorkOrderDTO;

      setOrders((previous) =>
        previous.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Error al actualizar OT");
    } finally {
      setSavingOrderId(null);
    }
  }

  function handleStatusChange(orderId: number, newStatus: WorkOrderStatus) {
    void updateOrder(orderId, { status: newStatus });
  }

  function handleTimeEntriesUpdated(orderId: number, count: number, actualHours: number, billableHours: number) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, timeEntriesCount: count, timeEntriesActualHours: actualHours, timeEntriesBillableHours: billableHours }
          : o,
      ),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
      {timeEntryModal ? (
        <TimeEntryModal
          orderId={timeEntryModal.orderId}
          orderNumber={timeEntryModal.orderNumber}
          mechanicOptions={activeMechanics}
          onClose={() => setTimeEntryModal(null)}
          onUpdated={handleTimeEntriesUpdated}
        />
      ) : null}
      <header className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-[linear-gradient(128deg,#5f969c_0%,#85bec5_58%,#b7dde1_100%)] px-6 py-7 text-white shadow-lg shadow-cyan-200/70">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">SEO MECANICA</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Ordenes de Trabajo</h1>
            <p className="mt-2 max-w-3xl text-sm text-cyan-50/95 md:text-base">
              Registra la OT al recibir el vehiculo, asigna mecanico y genera el PDF cuando este listo.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/reportes"
              className="rounded-xl border border-cyan-800/40 bg-white/90 px-4 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-white"
            >
              Reportes
            </Link>
            <Link
              href="/configuracion"
              className="rounded-xl border border-cyan-800/40 bg-white/90 px-4 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-white"
            >
              Configuracion
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard title="OT Totales" value={String(totalOrderCount)} detail="Historial completo" />
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

      <section ref={formSectionRef} className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 md:p-7">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {editingOrderId !== null ? "Editar OT" : "Nueva OT"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {editingOrderId !== null
              ? "Modifica cualquier campo y pulsa Actualizar OT para guardar los cambios."
              : "Obligatorios: cliente, telefono, marca y modelo. El mecanico se puede asignar despues."}
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-slate-700">
          {editingOrderId !== null
            ? "Puedes modificar cualquier campo de la OT antes de imprimir el PDF."
            : "Completa el formulario y guarda la OT. Desde el historial puedes generar e imprimir el PDF."}
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
            <Combobox
              label="Marca"
              value={form.vehicleBrand}
              onChange={(v) => handleChange("vehicleBrand", v)}
              options={brandOptions}
              required
            />
            <Input label="Modelo" value={form.vehicleModel} onChange={(v) => handleChange("vehicleModel", v)} required />
            <Input label="Ano" value={form.vehicleYear} onChange={(v) => handleChange("vehicleYear", v)} />
            <Input label="Kilometros" type="number" value={form.mileage} onChange={(v) => handleChange("mileage", v)} />
          </div>

          <Textarea
            label="Averia reportada por el cliente"
            value={form.issueDescription}
            onChange={(v) => handleChange("issueDescription", v)}
            placeholder="(Opcional)"
          />

          {error ? (
            <div className="grid gap-2">
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              {showBrandCatalogHint ? (
                <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    i
                  </span>
                  <span>
                    Si la marca no existe, puedes anadirla desde <Link href="/configuracion" className="font-medium underline underline-offset-2 hover:text-emerald-900">Configuracion</Link>. El modelo debe ir en su campo separado.
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreating}
            >
              {isCreating
                ? editingOrderId !== null ? "Actualizando..." : "Guardando..."
                : editingOrderId !== null ? "Actualizar OT" : "Guardar OT"}
            </button>
            {editingOrderId !== null ? (
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                onClick={handleCancelEdit}
              >
                Cancelar edicion
              </button>
            ) : null}
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
              onChange={(event) => changeFilter(event.target.value)}
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
              onClick={() => refreshOrders(loadAll).catch(() => setError("No se pudo recargar la lista"))}
            >
              Actualizar
            </button>
          </div>
        </div>

        {hasMore ? (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <span className="text-amber-800">
              Mostrando los ultimos 6 meses ({orders.length} de {totalOrderCount} OTs).
            </span>
            <button
              type="button"
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
              onClick={() => void handleLoadAll()}
              disabled={isLoadingAll}
            >
              {isLoadingAll ? "Cargando..." : "Ver historial completo"}
            </button>
          </div>
        ) : null}

        {filteredOrders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No hay OT para el filtro seleccionado.
          </p>
        ) : (
          <>
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
                    <th className="px-2 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      mechanicOptions={activeMechanics}
                      isSaving={savingOrderId === order.id}
                      isEditing={editingOrderId === order.id}
                      onUpdate={updateOrder}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEdit}
                      onOpenTimeEntries={(id, num) => setTimeEntryModal({ orderId: id, orderNumber: num })}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Pagina {safePage} de {pageCount} &bull; {filteredOrders.length} OT
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                    disabled={safePage === pageCount}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function OrderRow({
  order,
  mechanicOptions,
  onUpdate,
  onStatusChange,
  onEdit,
  onOpenTimeEntries,
  isSaving,
  isEditing,
}: {
  order: WorkOrderDTO;
  mechanicOptions: string[];
  onUpdate: (id: number, payload: { assignedMechanic?: string; status?: WorkOrderStatus }) => void;
  onStatusChange: (orderId: number, newStatus: WorkOrderStatus) => void;
  onEdit: (order: WorkOrderDTO) => void;
  onOpenTimeEntries: (orderId: number, orderNumber: string) => void;
  isSaving: boolean;
  isEditing: boolean;
}) {
  // DELIVERED is a legacy status — display and allow editing as DONE
  const displayStatus: WorkOrderStatus = order.status === "DELIVERED" ? "DONE" : order.status;

  return (
    <tr className={`border-b border-slate-100 text-slate-700 ${isEditing ? "bg-cyan-50" : ""}`}>
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
          value={displayStatus}
          onChange={(event) => {
            const value = event.target.value as WorkOrderStatus;
            onStatusChange(order.id, value);
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
      <td className="px-2 py-3">
        <button
          type="button"
          onClick={() => onOpenTimeEntries(order.id, order.number)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100"
        >
          <span className="font-semibold text-slate-900">{order.timeEntriesCount}</span>
          <span>entradas</span>
          {order.timeEntriesActualHours > 0 ? (
            <span className="text-slate-500">&middot;&nbsp;{order.timeEntriesActualHours.toFixed(1)}h</span>
          ) : null}
        </button>
      </td>
      <td className="px-2 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(order)}
            disabled={isSaving}
            className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              window.open(`/api/work-orders/${order.id}/pdf?ts=${Date.now()}`, "_blank", "noopener,noreferrer");
            }}
            className="rounded-lg border border-cyan-300 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
          >
            Ver PDF
          </button>
        </div>
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
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
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
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <select
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
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

function Combobox({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const searchableOptions = useMemo(
    () => options.filter((option) => option.value !== ""),
    [options],
  );

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase("es-ES");
    if (!query) {
      return searchableOptions.slice(0, 12);
    }

    return searchableOptions
      .filter((option) => option.label.toLocaleLowerCase("es-ES").includes(query))
      .slice(0, 12);
  }, [searchableOptions, value]);

  function normalizeToValidOption(rawValue: string) {
    const normalized = rawValue.trim().toLocaleLowerCase("es-ES");
    if (!normalized) {
      onChange("");
      return;
    }

    const exact = searchableOptions.find(
      (option) => option.value.toLocaleLowerCase("es-ES") === normalized || option.label.toLocaleLowerCase("es-ES") === normalized,
    );

    onChange(exact ? exact.value : "");
  }

  return (
    <div className="relative grid gap-1 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <input
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-cyan-600"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            normalizeToValidOption(value);
            setOpen(false);
          }, 120);
        }}
        placeholder="Escribe para buscar una marca"
        required={required}
        autoComplete="off"
      />
      {open ? (
        filteredOptions.length > 0 ? (
          <ul className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {filteredOptions.map((option) => (
              <li
                key={option.value}
                className="cursor-pointer px-3 py-2 text-slate-700 hover:bg-cyan-50 hover:text-slate-900"
                onMouseDown={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        ) : (
          <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-lg">
            No hay coincidencias en marcas registradas.
          </div>
        )
      ) : null}
    </div>
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

function TimeEntryModal({
  orderId,
  orderNumber,
  mechanicOptions,
  onClose,
  onUpdated,
}: {
  orderId: number;
  orderNumber: string;
  mechanicOptions: string[];
  onClose: () => void;
  onUpdated: (orderId: number, count: number, actualHours: number, billableHours: number) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<{ id: number; mechanicName: string; date: string; actualHours: number; billableHours: number; notes: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ mechanicName: mechanicOptions[0] ?? "", date: today, actualHours: "", billableHours: "", notes: "" });

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/work-orders/${orderId}/time-entries`, { cache: "no-store" });
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  function notifyParent(updated: typeof entries) {
    const count = updated.length;
    const actual = updated.reduce((s, e) => s + e.actualHours, 0);
    const billable = updated.reduce((s, e) => s + e.billableHours, 0);
    onUpdated(orderId, count, actual, billable);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/work-orders/${orderId}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mechanicName: form.mechanicName,
          date: form.date,
          actualHours: Number(form.actualHours),
          billableHours: Number(form.billableHours),
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const p = (await res.json()) as { message?: string };
        throw new Error(p.message ?? "Error al guardar");
      }
      const newEntry = await res.json();
      const updated = [...entries, newEntry];
      setEntries(updated);
      notifyParent(updated);
      setForm({ mechanicName: form.mechanicName, date: today, actualHours: "", billableHours: "", notes: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/time-entries/${entryId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Error al eliminar");
      const updated = entries.filter((e) => e.id !== entryId);
      setEntries(updated);
      notifyParent(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Tiempos — {orderNumber}</h3>
            <p className="text-xs text-slate-500">Registra bloques de trabajo por mecanico y dia</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">Cerrar</button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-sm text-slate-400">
              Sin registros de tiempo aun
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-900">{entry.mechanicName}</span>
                    <span className="mx-1.5 text-slate-400">·</span>
                    <span className="text-slate-600">{entry.date}</span>
                    <span className="mx-1.5 text-slate-400">·</span>
                    <span className="text-slate-700">{entry.actualHours}h real / {entry.billableHours}h fact.</span>
                    {entry.notes ? <p className="mt-0.5 text-xs text-slate-500">{entry.notes}</p> : null}
                  </div>
                  <button type="button" onClick={() => void handleDelete(entry.id)} disabled={saving}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </div>

        <form className="border-t border-slate-100 px-6 py-4" onSubmit={(e) => void handleAdd(e)}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Nuevo registro</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-xs text-slate-700">
              <span className="font-medium">Mecanico</span>
              <select className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-cyan-600"
                value={form.mechanicName} onChange={(e) => setForm((p) => ({ ...p, mechanicName: e.target.value }))} required>
                {mechanicOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-slate-700">
              <span className="font-medium">Fecha</span>
              <input type="date" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-cyan-600"
                value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required />
            </label>
            <label className="grid gap-1 text-xs text-slate-700">
              <span className="font-medium">Horas reales</span>
              <input type="number" min="0.5" step="0.5" max="24" placeholder="ej: 3.5"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-cyan-600"
                value={form.actualHours} onChange={(e) => setForm((p) => ({ ...p, actualHours: e.target.value }))} required />
            </label>
            <label className="grid gap-1 text-xs text-slate-700">
              <span className="font-medium">Horas facturables</span>
              <input type="number" min="0" step="0.5" max="24" placeholder="ej: 4"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-cyan-600"
                value={form.billableHours} onChange={(e) => setForm((p) => ({ ...p, billableHours: e.target.value }))} required />
            </label>
            <label className="col-span-2 grid gap-1 text-xs text-slate-700">
              <span className="font-medium">Nota (opcional)</span>
              <input type="text" placeholder="Descripcion del trabajo realizado..."
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-cyan-600"
                value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </label>
          </div>
          <button type="submit" disabled={saving}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar registro"}
          </button>
        </form>
      </div>
    </div>
  );
}
