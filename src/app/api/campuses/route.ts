import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isSuperAdmin, isCenterAdmin, getCampusScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSuperAdmin(session)) {
    // Super Admin sees all campuses
    const campuses = await prisma.campus.findMany({
      include: {
        users: true,
        batches: true,
        rankSummaries: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ campuses });
  }

  if (isCenterAdmin(session)) {
    // Center Admin only sees their own campus
    const scope = getCampusScope(session);
    if (scope?.campusId) {
      const campus = await prisma.campus.findUnique({
        where: { id: scope.campusId },
        include: {
          users: true,
          batches: true,
          rankSummaries: true,
        },
      });
      return NextResponse.json({ campus });
    }
    return NextResponse.json({ campus: null });
  }

  // Read-only users see no campuses
  return NextResponse.json({ campuses: [] });
}

export async function POST(req: Request) {
  const session = await getSession(req);

  if (!isSuperAdmin(session)) {
    return NextResponse.json(
      { error: "Forbidden. Only Super Admin can create campuses." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, city, state } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Campus name is required" },
        { status: 400 }
      );
    }

    const campus = await prisma.campus.create({
      data: {
        name,
        city: city || "",
        state: state || "",
      },
      include: {
        users: true,
        batches: true,
      },
    });

    return NextResponse.json({ campus }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create campus" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getSession(req);

  if (!isSuperAdmin(session)) {
    return NextResponse.json(
      { error: "Forbidden. Only Super Admin can delete campuses." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get("campusId");

    if (!campusId) {
      return NextResponse.json({ error: "campusId parameter required" }, { status: 400 });
    }

    // Check if campus has users or batches before deleting
    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      include: { users: true, batches: true },
    });

    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    if (campus.users.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete campus with existing users. Reassign or delete users first." },
        { status: 400 }
      );
    }

    if (campus.batches.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete campus with existing batches. Delete batches first." },
        { status: 400 }
      );
    }

    await prisma.campus.delete({
      where: { id: campusId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete campus" },
      { status: 500 }
    );
  }
}
