import { z } from "zod";

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

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
    assignedMechanic: z.string().trim().optional(),
    status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "DELIVERED"]).optional(),
  })
  .refine((value) => value.assignedMechanic !== undefined || value.status !== undefined, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const createCatalogEntrySchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio"),
});

export const updateCatalogEntrySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: "Debes enviar al menos un campo para actualizar",
  });

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
  assignedMechanic: string;
  issueDescription: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "DELIVERED";
};

export type MechanicDTO = {
  id: number;
  name: string;
  isActive: boolean;
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
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toSafeNumber(value?: number): number | null {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }

  return value;
}
