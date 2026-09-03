import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

type AppContext = Context<{ Bindings: Env }>;

export const SESSION_COOKIE = "__Host-admin_session";
const SESSION_TTL = 4 * 60 * 60;

export async function createAdminSession(context: AppContext): Promise<void> {
  setCookie(context, SESSION_COOKIE, context.env.ACCESS_TOKEN, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function currentAdmin(context: AppContext): Promise<boolean> {
  const token = getCookie(context, SESSION_COOKIE);
  if (token && token === context.env.ACCESS_TOKEN) return true;
  deleteCookie(context, SESSION_COOKIE, { path: "/", secure: true });
  return false;
}

export async function revokeAdminSession(context: AppContext): Promise<void> {
  deleteCookie(context, SESSION_COOKIE, { path: "/", secure: true });
}

export async function requireAdmin(context: AppContext): Promise<boolean> {
  return currentAdmin(context);
}
