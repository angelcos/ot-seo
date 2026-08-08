"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BrandDTO, MechanicDTO, WorkOrderDTO } from "@/lib/work-orders";
import { QuickEntryModal } from "./quick-entry-modal";
import { IndustrialAlert, IndustrialBadge, IndustrialButton, IndustrialCombobox, IndustrialEmptyState, IndustrialHeader, IndustrialHeaderActionButton, IndustrialHeaderActionLink, IndustrialInput, IndustrialPanel, IndustrialSelect, IndustrialStatCard, IndustrialTextarea } from "./ui/industrial-ui";

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
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialForm);
  const [orders, setOrders] = useState<WorkOrderDTO[]>(initialOrders);
  const [mechanics] = useState<MechanicDTO[]>(initialMechanics);
  const [brands] = useState<BrandDTO[]>(initialBrands);
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState(() => searchParams.get("mechanic") ?? "all");
  const [plateFilter, setPlateFilter] = useState(() => searchParams.get("plate")?.toUpperCase() ?? "");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadAll, setLoadAll] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [timeEntryModal, setTimeEntryModal] = useState<{ orderId: number; orderNumber: string } | null>(null);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

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
    let result = orders;
    if (plateFilter) {
      result = result.filter((order) => order.vehiclePlate?.toUpperCase() === plateFilter);
    }
    if (filter === "all") {
      return result;
    }
    if (filter === "unassigned") {
      return result.filter((order) => !order.assignedMechanic.trim());
    }
    return result.filter((order) => order.assignedMechanic === filter);
  }, [orders, filter, plateFilter]);

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-8">
      {quickEntryOpen ? (
        <QuickEntryModal mechanics={activeMechanics} onClose={() => setQuickEntryOpen(false)} />
      ) : null}
      {timeEntryModal ? (
        <TimeEntryModal
          orderId={timeEntryModal.orderId}
          orderNumber={timeEntryModal.orderNumber}
          mechanicOptions={activeMechanics}
          onClose={() => setTimeEntryModal(null)}
          onUpdated={handleTimeEntriesUpdated}
        />
      ) : null}
      <IndustrialHeader
        title="Ordenes de Trabajo"
        actionsClassName="gap-1 md:gap-2"
        actions={(
          <>
            <IndustrialHeaderActionButton onClick={() => setQuickEntryOpen(true)}>
              + Express
            </IndustrialHeaderActionButton>
            <IndustrialHeaderActionLink href="/analisis">Análisis</IndustrialHeaderActionLink>
            <IndustrialHeaderActionLink href="/configuracion">Config</IndustrialHeaderActionLink>
          </>
        )}
      />

      {/* Franja de estadísticas rápidas */}
      <IndustrialPanel title="Resumen">
        <div className="grid grid-cols-2 gap-px bg-[#CCCCCC] md:grid-cols-4">
          <IndustrialStatCard label="OT Totales" value={String(totalOrderCount)} detail="Historial completo" className="border-0 px-4 py-4" valueClassName="text-3xl" />
          <IndustrialStatCard label="OT Activas" value={String(activeOrders.length)} detail="Pendiente y en curso" className="border-0 px-4 py-4" valueClassName="text-3xl" />
          <IndustrialStatCard label="Sin asignar" value={String(unassignedCount)} detail="En espera de mecánico" className="border-0 px-4 py-4" valueClassName="text-3xl" />
          <IndustrialStatCard label="Mecánicos activos" value={String(activeMechanics.length)} detail="Disponibles" className="border-0 px-4 py-4" valueClassName="text-3xl" />
        </div>
      </IndustrialPanel>

      {/* Carga rápida por mecánico */}
      <IndustrialPanel title="Carga Rapida por Mecanico">
        <div className="p-4">
          <p className="mb-3 text-xs text-slate-500">
            Esta vista se recalcula automaticamente en cada cambio de asignacion o estado.
          </p>

          {quickLoad.length === 0 ? (
            <IndustrialEmptyState className="py-6 text-left">
              No hay OT activas.
            </IndustrialEmptyState>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {quickLoad.map((item) => (
                <article key={item.name} className="border border-[#CCCCCC] bg-[#F0F0F0] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                  <IndustrialBadge variant="red">
                    {item.count} OT
                  </IndustrialBadge>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Ultima OT activa</p>
                <p className="text-sm font-semibold text-slate-900">{item.latestOrder}</p>
                <p className="mt-2 text-sm text-slate-600">{item.latestIssue}</p>
              </article>
            ))}
          </div>
        )}
        </div>
      </IndustrialPanel>
      <IndustrialPanel
        ref={formSectionRef}
        accent="red"
        title={editingOrderId !== null ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"}
      >
        <div className="grid gap-5 p-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-500">
            {editingOrderId !== null
              ? "Modifica cualquier campo y pulsa Actualizar OT para guardar los cambios."
              : "Obligatorios: cliente, telefono, marca y modelo. El mecanico se puede asignar despues."}
          </p>
        </div>
        <div className="border border-[#CCCCCC] bg-[#F0F0F0] p-3 text-sm text-slate-700">
          {editingOrderId !== null
            ? "Puedes modificar cualquier campo de la OT antes de imprimir el PDF."
            : "Completa el formulario y guarda la OT. Desde el historial puedes generar e imprimir el PDF."}
        </div>

        <form className="grid gap-4 md:col-span-2" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <IndustrialInput
              label="Cliente"
              wrapperClassName="text-sm text-slate-700"
              labelClassName="font-medium"
              value={form.customerName}
              onChange={(e) => handleChange("customerName", e.target.value)}
              required
            />
            <IndustrialInput
              label="Telefono"
              wrapperClassName="text-sm text-slate-700"
              labelClassName="font-medium"
              value={form.customerPhone}
              onChange={(e) => handleChange("customerPhone", e.target.value)}
              required
            />
            <IndustrialSelect
              label="Mecanico asignado"
              wrapperClassName="text-sm text-slate-700"
              labelClassName="font-medium"
              value={form.assignedMechanic}
              onChange={(e) => handleChange("assignedMechanic", e.target.value)}
            >
              <option value="">Sin asignar</option>
              {activeMechanics.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </IndustrialSelect>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <IndustrialInput
              label="Matricula"
              wrapperClassName="text-sm text-slate-700"
              labelClassName="font-medium"
              value={form.vehiclePlate}
              onChange={(e) => handleChange("vehiclePlate", e.target.value.toUpperCase())}
              maxLength={12}
            />
            <IndustrialCombobox
              label="Marca"
              value={form.vehicleBrand}
              onChange={(v) => handleChange("vehicleBrand", v)}
              options={brandOptions}
              wrapperClassName="text-sm text-slate-700"
              labelClassName="font-medium"
              placeholder="Escribe para buscar una marca"
              noMatchesText="No hay coincidencias en marcas registradas."
              required
            />
            <IndustrialInput
              label="Modelo"
              wrapperClassName="text-sm text-slate-700"
              labelClassName="font-medium"
              value={form.vehicleModel}
              onChange={(e) => handleChange("vehicleModel", e.target.value)}
              required
            />
            <IndustrialInput
              label="Ano"
              wrapperClassName="text-sm text-slate-700"
              labelClassName="font-medium"
              value={form.vehicleYear}
              onChange={(e) => handleChange("vehicleYear", e.target.value)}
            />
            <IndustrialInput
              label="Kilometros"
              wrapperClassName="text-sm text-slate-700"
              labelClassName="font-medium"
              type="number"
              value={form.mileage}
              onChange={(e) => handleChange("mileage", e.target.value)}
            />
          </div>

          <IndustrialTextarea
            label="Averia reportada por el cliente"
            wrapperClassName="text-sm text-slate-700"
            labelClassName="font-medium"
            value={form.issueDescription}
            onChange={(e) => handleChange("issueDescription", e.target.value)}
            placeholder="(Opcional)"
          />

          {error ? (
            <div className="grid gap-2">
              <IndustrialAlert variant="danger">{error}</IndustrialAlert>
              {showBrandCatalogHint ? (
                <IndustrialAlert variant="success" className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    i
                  </span>
                  <span>
                    Si la marca no existe, puedes anadirla desde <Link href="/configuracion" className="font-medium underline underline-offset-2 hover:text-emerald-900">Configuracion</Link>. El modelo debe ir en su campo separado.
                  </span>
                </IndustrialAlert>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <IndustrialButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={isCreating}
            >
              {isCreating
                ? editingOrderId !== null ? "Actualizando..." : "Guardando..."
                : editingOrderId !== null ? "Actualizar OT" : "Guardar OT"}
            </IndustrialButton>
            {editingOrderId !== null ? (
              <IndustrialButton
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleCancelEdit}
              >
                Cancelar edicion
              </IndustrialButton>
            ) : null}
          </div>
        </form>
        </div>
      </IndustrialPanel>

      <IndustrialPanel
        id="work-orders-section"
        title="Historial de Ordenes de Trabajo"
        headingChildren={(
          <div className="flex items-center gap-2">
            {plateFilter ? (
              <span className="flex items-center gap-1 border border-white/30 px-2 py-1 text-xs text-white">
                Placa: {plateFilter}
                <button
                  type="button"
                  onClick={() => { setPlateFilter(""); setCurrentPage(1); }}
                  className="ml-1 text-white/70 hover:text-white"
                  title="Quitar filtro de placa"
                >
                  ×
                </button>
              </span>
            ) : null}
            <select
              style={{ backgroundColor: "#33353A", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}
              className="w-40 px-3 py-1.5 text-xs outline-none"
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
            <IndustrialHeaderActionButton onClick={() => refreshOrders(loadAll).catch(() => setError("No se pudo recargar la lista"))}>
              Actualizar
            </IndustrialHeaderActionButton>
          </div>
        )}
      >
        <div className="p-4">

        {filteredOrders.length === 0 ? (
          <IndustrialEmptyState className="rounded-2xl border-slate-300 bg-slate-50 px-4 py-6 text-left">
            No hay OT para el filtro seleccionado.
          </IndustrialEmptyState>
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
                  <IndustrialButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-sm disabled:opacity-40"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    Anterior
                  </IndustrialButton>
                  <IndustrialButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-sm disabled:opacity-40"
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                    disabled={safePage === pageCount}
                  >
                    Siguiente
                  </IndustrialButton>
                </div>
              </div>
            ) : null}
          </>
        )}

        {hasMore ? (
          <IndustrialAlert variant="warning" className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-amber-800">
              Mostrando los ultimos 6 meses ({orders.length} de {totalOrderCount} OTs).
            </span>
            <IndustrialButton
              type="button"
              variant="warning"
              size="sm"
              onClick={() => void handleLoadAll()}
              disabled={isLoadingAll}
            >
              {isLoadingAll ? "Cargando..." : "Ver historial completo"}
            </IndustrialButton>
          </IndustrialAlert>
        ) : null}
        </div>
      </IndustrialPanel>
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
    <tr className={`border-b border-slate-100 text-slate-700 ${isEditing ? "bg-red-50" : ""}`}>
      <td className="px-2 py-3 font-semibold text-slate-900">{order.number}</td>
      <td className="px-2 py-3">{new Date(order.createdAt).toLocaleString("es-ES")}</td>
      <td className="px-2 py-3">{order.customerName}</td>
      <td className="px-2 py-3">{[order.vehicleBrand, order.vehicleModel, order.vehiclePlate].filter(Boolean).join(" ")}</td>
      <td className="px-2 py-3">
        <IndustrialSelect
          className="w-44 rounded-lg px-2 py-1 text-sm"
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
        </IndustrialSelect>
      </td>
      <td className="px-2 py-3">
        <IndustrialSelect
          className="rounded-lg px-2 py-1 text-sm"
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
        </IndustrialSelect>
      </td>
      <td className="px-2 py-3">
        <button
          type="button"
          onClick={() => onOpenTimeEntries(order.id, order.number)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100"
        >
          <IndustrialBadge variant="slate" className="px-2 py-0.5 normal-case text-slate-900">{order.timeEntriesCount}</IndustrialBadge>
          <span>entradas</span>
          {order.timeEntriesActualHours > 0 ? (
            <span className="text-slate-500">&middot;&nbsp;{order.timeEntriesActualHours.toFixed(1)}h</span>
          ) : null}
        </button>
      </td>
      <td className="px-2 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <IndustrialButton
            type="button"
            onClick={() => onEdit(order)}
            disabled={isSaving}
            variant="warning"
            size="md"
            className="disabled:opacity-50"
          >
            Editar
          </IndustrialButton>
          <IndustrialButton
            type="button"
            onClick={() => {
              window.open(`/api/work-orders/${order.id}/pdf?ts=${Date.now()}`, "_blank", "noopener,noreferrer");
            }}
            variant="danger"
            size="md"
          >
            Ver PDF
          </IndustrialButton>
        </div>
      </td>
    </tr>
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
          <IndustrialButton type="button" variant="ghost" size="sm" className="text-sm text-slate-500" onClick={onClose}>Cerrar</IndustrialButton>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : entries.length === 0 ? (
            <IndustrialEmptyState className="rounded-xl border-slate-200 bg-white py-4 text-slate-400">
              Sin registros de tiempo aun
            </IndustrialEmptyState>
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
                  <IndustrialButton
                    type="button"
                    onClick={() => void handleDelete(entry.id)}
                    disabled={saving}
                    variant="danger"
                    size="sm"
                    className="shrink-0 border-0 px-2 py-1 text-red-500 disabled:opacity-40"
                  >
                    Eliminar
                  </IndustrialButton>
                </li>
              ))}
            </ul>
          )}

          {error ? <IndustrialAlert variant="danger" className="mt-3">{error}</IndustrialAlert> : null}
        </div>

        <form className="border-t border-slate-100 px-6 py-4" onSubmit={(e) => void handleAdd(e)}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Nuevo registro</p>
          <div className="grid grid-cols-2 gap-3">
            <IndustrialSelect
              label="Mecanico"
              wrapperClassName="text-xs text-slate-700"
              labelClassName="font-medium"
              className="rounded-lg px-2 py-1.5"
              value={form.mechanicName}
              onChange={(e) => setForm((p) => ({ ...p, mechanicName: e.target.value }))}
              required
            >
              {mechanicOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </IndustrialSelect>
            <IndustrialInput
              label="Fecha"
              wrapperClassName="text-xs text-slate-700"
              labelClassName="font-medium"
              type="date"
              className="rounded-lg px-2 py-1.5"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              required
            />
            <IndustrialInput
              label="Horas reales"
              wrapperClassName="text-xs text-slate-700"
              labelClassName="font-medium"
              type="number"
              min="0.5"
              step="0.5"
              max="24"
              placeholder="ej: 3.5"
              className="rounded-lg px-2 py-1.5"
              value={form.actualHours}
              onChange={(e) => setForm((p) => ({ ...p, actualHours: e.target.value }))}
              required
            />
            <IndustrialInput
              label="Horas facturables"
              wrapperClassName="text-xs text-slate-700"
              labelClassName="font-medium"
              type="number"
              min="0"
              step="0.5"
              max="24"
              placeholder="ej: 4"
              className="rounded-lg px-2 py-1.5"
              value={form.billableHours}
              onChange={(e) => setForm((p) => ({ ...p, billableHours: e.target.value }))}
              required
            />
            <IndustrialInput
              label="Nota (opcional)"
              wrapperClassName="col-span-2 text-xs text-slate-700"
              labelClassName="font-medium"
              type="text"
              placeholder="Descripcion del trabajo realizado..."
              className="rounded-lg px-2 py-1.5"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <IndustrialButton type="submit" disabled={saving} variant="primary" size="md" className="mt-3">
            {saving ? "Guardando..." : "Guardar registro"}
          </IndustrialButton>
        </form>
      </div>
    </div>
  );
}
