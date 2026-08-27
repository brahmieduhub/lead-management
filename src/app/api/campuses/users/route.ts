import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!isSuperAdmin(session)) {
      return NextResponse.json(
        { error: "Forbidden. Only Super Admin can create or assign center users." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, password, role, campusId } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: `User with email "${email}" already exists.` },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        passwordHash,
        role,
        campusId: campusId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        campusId: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
      message: `User "${user.name}" created with role ${user.role}.`,
    });
  } catch (e) {
    console.error("Failed to create user:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
