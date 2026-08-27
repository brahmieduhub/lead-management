import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

export type Role = "ADMIN" | "FACULTY" | "CAMPUS_HEAD" | "TELE_CALLER" | "VIEWER";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const COOKIE = "session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  campusId: string | null;
  campusName?: string | null;
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

function verify(token: string, payload: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSessionToken(user: SessionUser): string {
  const payload = JSON.stringify(user);
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function parseSessionToken(token: string): SessionUser | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  if (!verify(sig, payload)) return null;
  try {
    return JSON.parse(payload) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(req?: Request): Promise<SessionUser | null> {
  // If req is provided, check cookie header first
  if (req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
    if (match) {
      return parseSessionToken(match[1]);
    }
  }

  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    return parseSessionToken(token);
  } catch {
    return null;
  }
}

export async function requireUser(req?: Request): Promise<SessionUser> {
  const user = await getSession(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(roles: Role[], req?: Request): Promise<SessionUser> {
  const user = await requireUser(req);
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  return !!user && user.role === "ADMIN" && !user.campusId;
}

export function isCenterAdmin(user: SessionUser | null): boolean {
  return !!user && user.role === "CAMPUS_HEAD" && !!user.campusId;
}

export function isReadOnly(user: SessionUser | null): boolean {
  return !user || user.role === "VIEWER" || user.role === "TELE_CALLER" || user.role === "FACULTY";
}

export function canUpload(user: SessionUser | null): boolean {
  if (!user) return false;
  // Center Admins can only upload to their own center
  if (user.role === "CAMPUS_HEAD") return !!user.campusId;
  return user.role === "ADMIN"; // Super Admin can upload anywhere
}

export function canManageCenters(user: SessionUser | null): boolean {
  return isSuperAdmin(user);
}

/**
 * Returns the campusId scope for the current user.
 * - Center Admins: always returns their campusId (cannot be overridden)
 * - Super Admins: returns null (unrestricted) or optional filter
 * - Others: returns null or requested filter
 */
export function getCampusScope(user: SessionUser | null): { campusId: string } | null {
  if (!user) return null;
  if (user.campusId) return { campusId: user.campusId }; // Center-bound
  return null; // Super Admin - no automatic scope
}

/**
 * Resolves the effective campus ID for queries.
 * - If user is a Center Admin or Read-only Center user: returns user.campusId (cannot be overridden).
 * - If user is Super Admin: returns requestedCampusId (or null for all centers).
 */
export function getScopedCampusId(
  user: SessionUser | null,
  requestedCampusId?: string | null
): string | null {
  if (!user) return null;
  if (user.campusId) return user.campusId; // Center-bound
  return requestedCampusId || null; // Super Admin can filter or view all
}

/**
 * Checks if user can access data for a specific campusId.
 * - Super Admins can access any campus.
 * - Center Admins can only access their assigned campus.
 */
export function canAccessCampus(user: SessionUser | null, campusId: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (isCenterAdmin(user)) return user.campusId === campusId;
  return false;
}

export async function authenticate(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { campus: true },
  });
  if (!user) return null;
  const { compare } = await import("bcryptjs");
  const ok = await compare(password, user.passwordHash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    campusId: user.campusId,
    campusName: user.campus?.name ?? null,
  };
}

export const SESSION_COOKIE = COOKIE;