import { z } from "zod";

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().nonnegative().optional());

export const createWorkOrderSchema = z.object({
  customerName: z.string().trim().min(2, "El nombre del cliente es obligatorio"),
  customerPhone: z.string().trim().min(5, "El telefono es obligatorio"),
  vehiclePlate: z.string().trim().max(12, "La matricula no debe superar 12 caracteres").optional(),
  vehicleBrand: z.string().trim().min(2, "La marca es obligatoria"),
  vehicleModel: z.string().trim().min(1, "El modelo es obligatorio"),
  vehicleYear: z.string().trim().optional(),
  mileage: optionalNumber,
  assignedMechanic: z.string().trim().optional(),
  issueDescription: z.string().trim().optional(),
});

export const updateWorkOrderSchema = z
  .object({
    customerName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
    customerPhone: z.string().trim().min(5, "El telefono debe tener al menos 5 caracteres").optional(),
    vehiclePlate: z.string().trim().max(12, "La matricula no puede superar 12 caracteres").optional(),
    vehicleBrand: z.string().trim().min(2, "La marca debe tener al menos 2 caracteres").optional(),
    vehicleModel: z.string().trim().min(1, "El modelo es obligatorio").optional(),
    vehicleYear: z.string().trim().optional(),
    mileage: optionalNumber,
    assignedMechanic: z.string().trim().optional(),
    issueDescription: z.string().trim().optional(),
    status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "DELIVERED", "CANCELED"]).optional(),
  })
  .refine(
    (v) =>
      v.customerName !== undefined || v.customerPhone !== undefined || v.vehiclePlate !== undefined ||
      v.vehicleBrand !== undefined || v.vehicleModel !== undefined || v.vehicleYear !== undefined ||
      v.mileage !== undefined || v.assignedMechanic !== undefined || v.issueDescription !== undefined ||
      v.status !== undefined,
    { message: "Debes enviar al menos un campo para actualizar" },
  );

export const createTimeEntrySchema = z.object({
  mechanicName: z.string().trim().min(1, "El mecanico es obligatorio"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida (YYYY-MM-DD)"),
  actualHours: z.number().positive("Las horas reales deben ser positivas").max(24),
  billableHours: z.number().nonnegative("Las horas facturables no pueden ser negativas").max(24),
  notes: z.string().trim().optional(),
});

export const updateTimeEntrySchema = z
  .object({
    actualHours: z.number().positive().max(24).optional(),
    billableHours: z.number().nonnegative().max(24).optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (v) => v.actualHours !== undefined || v.billableHours !== undefined || v.notes !== undefined,
    { message: "Debes enviar al menos un campo para actualizar" },
  );

export const createCatalogEntrySchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio"),
  dailyCapacityHours: z.number().positive().max(24).optional(),
});

export const updateCatalogEntrySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    isActive: z.boolean().optional(),
    dailyCapacityHours: z.number().positive().max(24).optional(),
  })
  .refine(
    (v) => v.name !== undefined || v.isActive !== undefined || v.dailyCapacityHours !== undefined,
    { message: "Debes enviar al menos un campo para actualizar" },
  );

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

export type WorkOrderDTO = {
  id: number;
  number: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string | null;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string | null;
  mileage: number | null;
  assignedMechanic: string;
  issueDescription: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "DELIVERED" | "CANCELED";
  timeEntriesCount: number;
  timeEntriesActualHours: number;
  timeEntriesBillableHours: number;
};

export type WorkTimeEntryDTO = {
  id: number;
  workOrderId: number;
  mechanicName: string;
  date: string;
  actualHours: number;
  billableHours: number;
  notes: string | null;
  createdAt: string;
};

export type MechanicDTO = {
  id: number;
  name: string;
  isActive: boolean;
  dailyCapacityHours: number;
};

export type BrandDTO = {
  id: number;
  name: string;
  isActive: boolean;
};

export function formatWorkOrderNumber(id: number, createdAt: Date): string {
  const year = createdAt.getFullYear();
  return `OT-${year}-${id.toString().padStart(6, "0")}`;
}

export function normalizeOptionalText(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeCatalogNameKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-ES");
}

export function toSafeNumber(value?: number): number | null {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  return value;
}
