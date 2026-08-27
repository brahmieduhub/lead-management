import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession(req);
  const userCampusId = session?.campusId;
  const assessments = await prisma.assessment.findMany({
    where: userCampusId ? { batch: { campusId: userCampusId } } : undefined,
    orderBy: { examDate: 'desc' },
    select: { id: true, title: true, examDate: true, batch: { select: { name: true, campus: { select: { name: true } } } } },
    take: 50,
  });
  return NextResponse.json({ assessments });
}