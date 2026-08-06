import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        service: "seo-ot",
        checks: {
          database: "ok",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "database check failed";

    return NextResponse.json(
      {
        status: "error",
        service: "seo-ot",
        checks: {
          database: "error",
        },
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
