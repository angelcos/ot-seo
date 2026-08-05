"use client";

import Link from "next/link";
import { useState } from "react";
import type { BrandDTO, MechanicDTO } from "@/lib/work-orders";

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
  const [brandName, setBrandName] = useState("");
  const [error, setError] = useState<string | null>(null);

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

    try {
      const response = await fetch("/api/mechanics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "No se pudo crear el mecanico");
      }

      setMechanicName("");
      await refreshCatalogs();
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Error al guardar mecanico");
    }
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

  async function addBrand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = brandName.trim();
    if (!name) {
      return;
    }

    try {
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "No se pudo crear la marca");
      }

      setBrandName("");
      await refreshCatalogs();
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Error al guardar marca");
    }
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      <header className="rounded-3xl border border-cyan-200 bg-[linear-gradient(130deg,#5f969c_0%,#8bc4cb_100%)] px-6 py-7 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">SEO MECANICA</p>
            <h1 className="mt-2 text-3xl font-semibold">Configuracion</h1>
            <p className="mt-2 text-sm text-cyan-50">Gestiona mecanicos y marcas del formulario.</p>
          </div>
          <Link href="/" className="rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25">
            Volver a OT
          </Link>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2">
        <CatalogPanel
          title="Mecanicos"
          placeholder="Nuevo mecanico"
          value={mechanicName}
          onChange={setMechanicName}
          onSubmit={addMechanic}
          items={mechanics.map((item) => ({
            id: item.id,
            name: item.name,
            isActive: item.isActive,
            onToggle: () => toggleMechanic(item.id, item.isActive),
          }))}
        />

        <CatalogPanel
          title="Marcas"
          placeholder="Nueva marca"
          value={brandName}
          onChange={setBrandName}
          onSubmit={addBrand}
          items={brands.map((item) => ({
            id: item.id,
            name: item.name,
            isActive: item.isActive,
            onToggle: () => toggleBrand(item.id, item.isActive),
          }))}
        />
      </section>
    </div>
  );
}

function CatalogPanel({
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  items,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  items: Array<{ id: number; name: string; isActive: boolean; onToggle: () => void }>;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <form className="mt-4 flex gap-2" onSubmit={onSubmit}>
        <input
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800" type="submit">
          Agregar
        </button>
      </form>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
            <span className="text-sm text-slate-800">{item.name}</span>
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
          </li>
        ))}
      </ul>
    </article>
  );
}
