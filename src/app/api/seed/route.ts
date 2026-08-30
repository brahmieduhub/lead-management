import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { ExamType, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    
    // Create Campuses
    const campusHyd = await prisma.campus.upsert({
      where: { id: "hyd-main" },
      update: {},
      create: { id: "hyd-main", name: "Hyderabad Central", city: "Hyderabad", state: "Telangana" },
    });

    const campusDelhi = await prisma.campus.upsert({
      where: { id: "delhi-ncr" },
      update: {},
      create: { id: "delhi-ncr", name: "Delhi NCR Center", city: "Delhi", state: "Delhi" },
    });

    // Create Super Admin & Faculty Users
    const passwordHash = await hash("password123", 10);

    await prisma.user.upsert({
      where: { email: "superadmin@eduhub.com" },
      update: { passwordHash },
      create: {
        email: "superadmin@eduhub.com",
        name: "Super Administrator",
        passwordHash,
        role: Role.ADMIN,
        campusId: null,
      },
    });

    await prisma.user.upsert({
      where: { email: "admin@delhincr.com" },
      update: { passwordHash },
      create: {
        email: "admin@delhincr.com",
        name: "Delhi Center Head",
        passwordHash,
        role: Role.CAMPUS_HEAD,
        campusId: campusDelhi.id,
      },
    });

    // Create Batches
    const batchNeet = await prisma.batch.create({
      data: {
        name: "NEET Elite 2026",
        stream: ExamType.NEET,
        sessionYear: "2025-26",
        campusId: campusHyd.id,
      },
    }).catch(() => null);

    const batchJee = await prisma.batch.create({
      data: {
        name: "JEE Mains 2026",
        stream: ExamType.JEE,
        sessionYear: "2025-26",
        campusId: campusDelhi.id,
      },
    }).catch(() => null);

    // Create Sample Students
    if (batchNeet) {
      const studentsData = [
        { rollNo: "STU-001", name: "Aarav Sharma", phone: "9876543210", batchId: batchNeet.id },
        { rollNo: "STU-002", name: "Ananya Verma", phone: "9876543211", batchId: batchNeet.id },
        { rollNo: "STU-003", name: "Rahul Gupta", phone: "9876543212", batchId: batchNeet.id },
        { rollNo: "STU-004", name: "Diya Pillai", phone: "9876543213", batchId: batchNeet.id },
        { rollNo: "STU-005", name: "Kavya Reddy", phone: "9876543214", batchId: batchNeet.id },
      ];
      for (const s of studentsData) {
        await prisma.student.upsert({
          where: { rollNo: s.rollNo },
          update: {},
          create: s,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
      credentials: {
        superadmin: { email: "superadmin@eduhub.com", password: "password123" },
        campusAdmin: { email: "admin@delhincr.com", password: "password123" },
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message || "Failed to seed" }, { status: 500 });
  }
}
