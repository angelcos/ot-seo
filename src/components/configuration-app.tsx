"use client";

import { useState } from "react";
import type { BrandDTO, MechanicDTO } from "@/lib/work-orders";
import { IndustrialAlert, IndustrialButton, IndustrialHeader, IndustrialHeaderActionLink, IndustrialInput } from "./ui/industrial-ui";

export function ConfigurationApp({
  initialMechanics,
  initialBrands,
}: {
  initialMechanics: MechanicDTO[];
  initialBrands: BrandDTO[];
}) {
  const [mechanics, setMechanics] = useState(initialMechanics);
  const [brands, setBrands] = useState(initialBrands);
  const [mechanicName, setMechanicName] = useState("");
  const [mechanicCapacity, setMechanicCapacity] = useState("8");
  const [editingMechanicId, setEditingMechanicId] = useState<number | null>(null);
  const [brandName, setBrandName] = useState("");
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    kind: "mechanic" | "brand";
    id: number;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const normalizedBrandPreview = brandName.trim().replace(/\s+/g, " ");
  const brandLooksComposite = normalizedBrandPreview.split(" ").filter(Boolean).length >= 2;

  async function refreshCatalogs() {
    const [mechanicsResponse, brandsResponse] = await Promise.all([
      fetch("/api/mechanics", { cache: "no-store" }),
      fetch("/api/brands", { cache: "no-store" }),
    ]);

    if (!mechanicsResponse.ok || !brandsResponse.ok) {
      throw new Error("No se pudieron recargar catalogos");
    }

    setMechanics((await mechanicsResponse.json()) as MechanicDTO[]);
    setBrands((await brandsResponse.json()) as BrandDTO[]);
  }

  async function addMechanic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = mechanicName.trim();
    if (!name) {
      return;
    }

    const normalizedHours = Number(mechanicCapacity);
    if (Number.isNaN(normalizedHours) || normalizedHours <= 0) {
      setError("La capacidad diaria debe ser mayor a 0");
      return;
    }

    try {
      const response = await fetch(
        editingMechanicId ? `/api/mechanics/${editingMechanicId}` : "/api/mechanics",
        {
          method: editingMechanicId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, dailyCapacityHours: normalizedHours }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(
          payload.message ??
            (editingMechanicId
              ? "No se pudo actualizar el mecanico"
              : "No se pudo crear el mecanico"),
        );
      }

      setMechanicName("");
      setMechanicCapacity("8");
      setEditingMechanicId(null);
      await refreshCatalogs();
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Error al guardar mecanico");
    }
  }

  function startEditMechanic(item: MechanicDTO) {
    setEditingMechanicId(item.id);
    setMechanicName(item.name);
    setMechanicCapacity(String(item.dailyCapacityHours));
    setError(null);
  }

  function cancelEditMechanic() {
    setEditingMechanicId(null);
    setMechanicName("");
    setMechanicCapacity("8");
    setError(null);
  }

  async function toggleMechanic(id: number, isActive: boolean) {
    try {
      const response = await fetch(`/api/mechanics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el mecanico");
      }

      await refreshCatalogs();
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Error al actualizar mecanico");
    }
  }

  async function deleteMechanic(id: number) {
    try {
      const response = await fetch(`/api/mechanics/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "No se pudo eliminar el mecanico");
      }

      await refreshCatalogs();
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Error al eliminar mecanico");
    }
  }

  async function addBrand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = brandName.trim();
    if (!name) {
      return;
    }

    try {
      const response = await fetch(editingBrandId ? `/api/brands/${editingBrandId}` : "/api/brands", {
        method: editingBrandId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(
          payload.message ?? (editingBrandId ? "No se pudo actualizar la marca" : "No se pudo crear la marca"),
        );
      }

      setBrandName("");
      setEditingBrandId(null);
      await refreshCatalogs();
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Error al guardar marca");
    }
  }

  function startEditBrand(item: BrandDTO) {
    setEditingBrandId(item.id);
    setBrandName(item.name);
    setError(null);
  }

  function cancelEditBrand() {
    setEditingBrandId(null);
    setBrandName("");
    setError(null);
  }

  async function toggleBrand(id: number, isActive: boolean) {
    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar la marca");
      }

      await refreshCatalogs();
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Error al actualizar marca");
    }
  }

  async function deleteBrand(id: number) {
    try {
      const response = await fetch(`/api/brands/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "No se pudo eliminar la marca");
      }
      await refreshCatalogs();
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Error al eliminar marca");
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) {
      return;
    }

    try {
      setIsDeleting(true);
      if (deleteDialog.kind === "mechanic") {
        await deleteMechanic(deleteDialog.id);
      } else {
        await deleteBrand(deleteDialog.id);
      }
      setDeleteDialog(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col">
      <IndustrialHeader
        title="Configuracion"
        actions={(
          <IndustrialHeaderActionLink href="/">
            ← Volver a OT
          </IndustrialHeaderActionLink>
        )}
      />
      <div className="mx-4 flex flex-col gap-6 py-6 md:mx-8">

      {error ? <IndustrialAlert variant="danger">{error}</IndustrialAlert> : null}

      <section className="grid gap-5 md:grid-cols-2">
        <MechanicPanel
          mechanics={mechanics}
          mechanicName={mechanicName}
          mechanicCapacity={mechanicCapacity}
          onNameChange={setMechanicName}
          onCapacityChange={setMechanicCapacity}
          onSubmit={addMechanic}
          editingMechanicId={editingMechanicId}
          onCancelEdit={cancelEditMechanic}
          onToggle={toggleMechanic}
          onEdit={startEditMechanic}
          onDelete={(id, name) => setDeleteDialog({ kind: "mechanic", id, name })}
        />

        <CatalogPanel
          title="Marcas"
          placeholder="Nueva marca"
          value={brandName}
          onChange={setBrandName}
          onSubmit={addBrand}
          editingBrandId={editingBrandId}
          onCancelEdit={cancelEditBrand}
          helperText="Usa solo la marca. El modelo se informa en la OT."
          warningText={brandLooksComposite ? "Revisa si has escrito marca y modelo juntos. Marcas compuestas reales como Alfa Romeo o Aston Martin si son validas." : null}
          items={brands.map((item) => ({
            id: item.id,
            name: item.name,
            isActive: item.isActive,
            onToggle: () => toggleBrand(item.id, item.isActive),
            onEdit: () => startEditBrand(item),
            onDelete: () => setDeleteDialog({ kind: "brand", id: item.id, name: item.name }),
          }))}
        />
      </section>

      {deleteDialog ? (
        <DeleteConfirmModal
          title={deleteDialog.kind === "mechanic" ? "Eliminar mecanico" : "Eliminar marca"}
          name={deleteDialog.name}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setDeleteDialog(null);
            }
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
      </div>
    </div>
  );
}


function MechanicPanel({
  mechanics,
  mechanicName,
  mechanicCapacity,
  onNameChange,
  onCapacityChange,
  onSubmit,
  editingMechanicId,
  onCancelEdit,
  onToggle,
  onEdit,
  onDelete,
}: {
  mechanics: import("@/lib/work-orders").MechanicDTO[];
  mechanicName: string;
  mechanicCapacity: string;
  onNameChange: (v: string) => void;
  onCapacityChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  editingMechanicId: number | null;
  onCancelEdit: () => void;
  onToggle: (id: number, isActive: boolean) => void;
  onEdit: (item: MechanicDTO) => void;
  onDelete: (id: number, name: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Mecanicos</h2>
      <form className="mt-4 flex gap-2" onSubmit={onSubmit}>
        <div className="flex flex-1 flex-col gap-2">
          <IndustrialInput
            placeholder="Nombre del mecanico"
            value={mechanicName}
            onChange={(e) => onNameChange(e.target.value)}
            required
          />
          <IndustrialInput
            label="Horas/dia disponibles"
            type="number"
            min="1"
            max="24"
            step="0.5"
            value={mechanicCapacity}
            onChange={(e) => onCapacityChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <IndustrialButton variant="primary" size="md" type="submit">
            {editingMechanicId ? "Actualizar" : "Agregar"}
          </IndustrialButton>
          {editingMechanicId ? (
            <IndustrialButton
              type="button"
              onClick={onCancelEdit}
              variant="secondary"
              size="md"
            >
              Cancelar
            </IndustrialButton>
          ) : null}
        </div>
      </form>
      <ul className="mt-4 space-y-2">
        {mechanics.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-800">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{item.dailyCapacityHours}h/dia</span>
                <IndustrialButton
                  type="button"
                  onClick={() => onEdit(item)}
                  variant="ghost"
                  size="sm"
                  className="px-2 py-1 text-xs text-slate-600"
                >
                  Editar
                </IndustrialButton>
                <button
                  type="button"
                  onClick={() => onToggle(item.id, item.isActive)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    item.isActive
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  {item.isActive ? "Activo" : "Baja"}
                </button>
                {!item.isActive ? (
                  <IndustrialButton
                    type="button"
                    onClick={() => onDelete(item.id, item.name)}
                    variant="danger"
                    size="sm"
                    className="border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
                    title="Esta accion no se puede deshacer"
                  >
                    Eliminar
                  </IndustrialButton>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function CatalogPanel({
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  editingBrandId,
  onCancelEdit,
  helperText,
  warningText,
  items,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  editingBrandId: number | null;
  onCancelEdit: () => void;
  helperText?: string;
  warningText?: string | null;
  items: Array<{
    id: number;
    name: string;
    isActive: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }>;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <form className="mt-4 grid gap-2" onSubmit={onSubmit}>
        <div className="flex gap-2">
          <IndustrialInput
            className="w-full"
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <IndustrialButton variant="primary" size="md" type="submit">
            {editingBrandId ? "Actualizar" : "Agregar"}
          </IndustrialButton>
          {editingBrandId ? (
            <IndustrialButton
              type="button"
              onClick={onCancelEdit}
              variant="secondary"
              size="md"
            >
              Cancelar
            </IndustrialButton>
          ) : null}
        </div>
        {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
        {warningText ? <IndustrialAlert variant="warning" className="text-xs">{warningText}</IndustrialAlert> : null}
      </form>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-800">{item.name}</span>
              <div className="flex items-center gap-2">
                <IndustrialButton
                  type="button"
                  onClick={item.onEdit}
                  variant="ghost"
                  size="sm"
                  className="px-2 py-1 text-xs text-slate-600"
                >
                  Editar
                </IndustrialButton>
                <button
                  type="button"
                  onClick={item.onToggle}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    item.isActive
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  {item.isActive ? "Activo" : "Baja"}
                </button>
                {!item.isActive ? (
                  <IndustrialButton
                    type="button"
                    onClick={item.onDelete}
                    variant="danger"
                    size="sm"
                    className="border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
                    title="Esta accion no se puede deshacer"
                  >
                    Eliminar
                  </IndustrialButton>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DeleteConfirmModal({
  title,
  name,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  name: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">
          Vas a eliminar definitivamente <strong>&quot;{name}&quot;</strong>.
        </p>
        <p className="mt-1 text-sm text-red-700">Esta accion no se puede deshacer.</p>

        <div className="mt-5 flex justify-end gap-2">
          <IndustrialButton
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            variant="secondary"
            size="md"
            className="font-medium"
          >
            Cancelar
          </IndustrialButton>
          <IndustrialButton
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            variant="danger"
            size="md"
            className="border-0 bg-red-700 text-white hover:bg-red-800"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </IndustrialButton>
        </div>
      </div>
    </div>
  );
}
