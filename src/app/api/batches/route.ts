import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const userCampusId = session?.campusId;

    const { searchParams } = new URL(req.url);
    const filterCampusId = searchParams.get("campusId");

    // Center Admin / Read-only is strictly bound to their campus
    const targetCampusId = userCampusId || filterCampusId;

    const batches = await prisma.batch.findMany({
      where: targetCampusId ? { campusId: targetCampusId } : undefined,
      include: {
        campus: true,
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ batches });
  } catch (e) {
    console.error("Failed to fetch batches:", e);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}
