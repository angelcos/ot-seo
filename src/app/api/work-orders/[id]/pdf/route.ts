import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { formatWorkOrderNumber } from "@/lib/work-orders";

const PALETTE = {
  ink: rgb(0.12, 0.2, 0.24),
  accent: rgb(0.27, 0.45, 0.5),
};

type TemplateBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  const order = await prisma.workOrder.findUnique({
    where: { id: parsedId },
  });

  if (!order) {
    return NextResponse.json({ message: "OT no encontrada" }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const templateBox = await drawTemplateBackground(pdf, page);
  drawOverlayData(page, regular, bold, templateBox, order);

  const number = formatWorkOrderNumber(order.id, order.createdAt);
  const bytes = await pdf.save();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${number}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
  });
}

async function drawTemplateBackground(pdf: PDFDocument, page: PDFPage): Promise<TemplateBox> {
  const templatePath = path.join(process.cwd(), "public", "ot-seo-clean.png");
  const bytes = await fs.readFile(templatePath);
  const image = await pdf.embedPng(bytes);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const imageWidth = image.width;
  const imageHeight = image.height;

  // Use contain fit to avoid any distortion/cropping across different template sizes.
  const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const offsetX = (pageWidth - drawWidth) / 2;
  const offsetY = (pageHeight - drawHeight) / 2;

  page.drawImage(image, {
    x: offsetX,
    y: offsetY,
    width: drawWidth,
    height: drawHeight,
  });

  return {
    x: offsetX,
    y: offsetY,
    width: drawWidth,
    height: drawHeight,
    imageWidth,
    imageHeight,
  };
}

function drawOverlayData(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  templateBox: TemplateBox,
  order: {
    id: number;
    createdAt: Date;
    customerName: string;
    customerPhone: string;
    assignedMechanic: string;
    vehiclePlate: string | null;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: string | null;
    mileage: number | null;
    issueDescription: string | null;
  },
) {
  const number = formatWorkOrderNumber(order.id, order.createdAt).replace("OT-", "");

  drawMappedText(page, bold, templateBox, number, 1150, 246, 22, PALETTE.accent);

  drawMappedText(page, bold, templateBox, toDateText(order.createdAt), 1048, 350, 12, PALETTE.ink);
  drawMappedText(page, bold, templateBox, toTimeText(order.createdAt), 1520, 350, 12, PALETTE.ink);

  drawMappedFittedText(page, regular, templateBox, order.customerName, 200, 545, 12, PALETTE.ink, 360);
  drawMappedFittedText(page, regular, templateBox, order.customerPhone, 162, 607, 12, PALETTE.ink, 398);
  drawMappedFittedText(
    page,
    regular,
    templateBox,
    order.assignedMechanic || "Sin asignar",
    317,
    669,
    12,
    PALETTE.ink,
    252,
  );

  drawMappedFittedText(page, bold, templateBox, order.vehiclePlate ?? "", 660, 632, 12, PALETTE.ink, 205);
  drawMappedFittedText(page, bold, templateBox, order.vehicleBrand, 890, 632, 12, PALETTE.ink, 212);
  drawMappedFittedText(
    page,
    bold,
    templateBox,
    `${order.vehicleModel}${order.vehicleYear ? ` (${order.vehicleYear})` : ""}`,
    1110,
    632,
    11,
    PALETTE.ink,
    332,
  );
  drawMappedFittedText(
    page,
    bold,
    templateBox,
    order.mileage !== null ? `${order.mileage}` : "",
    1468,
    632,
    11,
    PALETTE.ink,
    130,
  );

  const issueLines = splitTextByWidth(order.issueDescription ?? "", regular, 11, mapWidth(templateBox, 1650)).slice(0, 3);
  let y = 946;
  for (const line of issueLines) {
    drawMappedFittedText(page, regular, templateBox, line, 70, y, 11, PALETTE.ink, 1650, 10);
    y += 53;
  }
}

function drawMappedText(
  page: PDFPage,
  font: PDFFont,
  templateBox: TemplateBox,
  value: string,
  templateX: number,
  templateYFromTop: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  if (!value.trim()) {
    return;
  }

  const x = mapX(templateBox, templateX);
  const y = mapYFromTop(templateBox, templateYFromTop);

  page.drawText(value, { x, y, size, font, color });
}

function drawMappedFittedText(
  page: PDFPage,
  font: PDFFont,
  templateBox: TemplateBox,
  value: string,
  templateX: number,
  templateYFromTop: number,
  baseSize: number,
  color: ReturnType<typeof rgb>,
  maxWidthInTemplate: number,
  minSize = 9,
) {
  const raw = value.trim();
  if (!raw) {
    return;
  }

  const maxWidth = mapWidth(templateBox, maxWidthInTemplate);
  let finalSize = baseSize;

  while (finalSize > minSize && font.widthOfTextAtSize(raw, finalSize) > maxWidth) {
    finalSize -= 0.25;
  }

  let finalText = raw;
  if (font.widthOfTextAtSize(finalText, finalSize) > maxWidth) {
    finalText = truncateToWidth(finalText, font, finalSize, maxWidth, "...");
  }

  drawMappedText(page, font, templateBox, finalText, templateX, templateYFromTop, finalSize, color);
}

function mapX(box: TemplateBox, xInTemplate: number): number {
  return box.x + (xInTemplate / box.imageWidth) * box.width;
}

function mapYFromTop(box: TemplateBox, yFromTop: number): number {
  return box.y + box.height - (yFromTop / box.imageHeight) * box.height;
}

function mapWidth(box: TemplateBox, widthInTemplate: number): number {
  return (widthInTemplate / box.imageWidth) * box.width;
}

function truncateToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  suffix: string,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  const suffixWidth = font.widthOfTextAtSize(suffix, size);
  if (suffixWidth > maxWidth) {
    return "";
  }

  let end = text.length;
  while (end > 0) {
    const candidate = `${text.slice(0, end).trimEnd()}${suffix}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      return candidate;
    }
    end -= 1;
  }

  return suffix;
}

function splitTextByWidth(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function toDateText(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day} / ${month} / ${year}`;
}

function toTimeText(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
