"use client";

import { useEffect, useRef, useState } from "react";
import { IndustrialAlert, IndustrialButton, IndustrialInput, IndustrialSelect } from "./ui/industrial-ui";

type Props = {
  mechanics: string[];
  onClose: () => void;
};

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function QuickEntryModal({ mechanics, onClose }: Props) {
  const [plate, setPlate] = useState("");
  const [mechanic, setMechanic] = useState(mechanics[0] ?? "");
  const [date, setDate] = useState(todayIso());
  const [actualMinutes, setActualMinutes] = useState("");
  const [billableMinutes, setBillableMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const plateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    plateRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const actual = Number(actualMinutes);
    const billable = Number(billableMinutes);
    if (!plate.trim()) { setError("La placa es obligatoria."); return; }
    if (!mechanic) { setError("Selecciona un mecánico."); return; }
    if (!actualMinutes || isNaN(actual) || actual < 1) { setError("Introduce minutos reales válidos (mín. 1)."); return; }
    if (!billableMinutes || isNaN(billable) || billable < 0) { setError("Introduce minutos facturables válidos."); return; }

    setSaving(true);
    const res = await fetch("/api/quick-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehiclePlate: plate.trim().toUpperCase(), mechanicName: mechanic, date, actualMinutes: actual, billableMinutes: billable, notes }),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Error al guardar el registro.");
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Registro Express</h2>
          <IndustrialButton type="button" onClick={onClose} variant="ghost" size="sm" className="px-2 py-1 text-slate-400 hover:text-slate-700">✕</IndustrialButton>
        </div>

        {success ? (
          <p className="py-6 text-center text-sm font-medium text-emerald-600">✓ Registro guardado</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <IndustrialInput
                ref={plateRef}
                label="Placa"
                wrapperClassName="flex-1"
                labelClassName="uppercase tracking-wide text-slate-500"
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="1234ABC"
                className="tracking-wider focus:ring-2 focus:ring-red-200"
              />
              <IndustrialInput
                label="Fecha"
                wrapperClassName="flex-1"
                labelClassName="uppercase tracking-wide text-slate-500"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="focus:ring-2 focus:ring-red-200"
              />
            </div>

            <IndustrialSelect
              label="Mecánico"
              wrapperClassName="text-xs text-slate-600"
              labelClassName="uppercase tracking-wide text-slate-500"
              value={mechanic}
              onChange={(e) => setMechanic(e.target.value)}
              required
            >
              {mechanics.map((m) => <option key={m} value={m}>{m}</option>)}
            </IndustrialSelect>

            <div className="flex gap-3">
              <IndustrialInput
                label="Min. reales"
                wrapperClassName="flex-1"
                labelClassName="uppercase tracking-wide text-slate-500"
                type="number"
                value={actualMinutes}
                onChange={(e) => { setActualMinutes(e.target.value); if (!billableMinutes) setBillableMinutes(e.target.value); }}
                min={1}
                placeholder="15"
                className="focus:ring-2 focus:ring-red-200"
              />
              <IndustrialInput
                label="Min. facturables"
                wrapperClassName="flex-1"
                labelClassName="uppercase tracking-wide text-slate-500"
                type="number"
                value={billableMinutes}
                onChange={(e) => setBillableMinutes(e.target.value)}
                min={0}
                placeholder="15"
                className="focus:ring-2 focus:ring-red-200"
              />
            </div>

            <IndustrialInput
              label="Notas (opcional)"
              labelClassName="uppercase tracking-wide text-slate-500"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pinchazo rueda delantera..."
              className="focus:ring-2 focus:ring-red-200"
            />

            {error ? <IndustrialAlert variant="danger" className="text-xs">{error}</IndustrialAlert> : null}

            <div className="flex justify-end gap-2 pt-1">
              <IndustrialButton type="button" onClick={onClose} variant="secondary" size="md" className="font-medium">
                Cancelar
              </IndustrialButton>
              <IndustrialButton
                type="submit"
                disabled={saving}
                variant="primary"
                size="md"
                className="px-5 disabled:opacity-40"
              >
                {saving ? "Guardando…" : "Guardar"}
              </IndustrialButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
