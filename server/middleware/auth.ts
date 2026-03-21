import { TRPCError } from "@trpc/server";
import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production"
);

export interface JWTPayload {
  userId: number;
  email: string;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
    };
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Token inválido ou expirado",
    });
  }
}

export function getUserFromCookie(cookies: Record<string, string | undefined>): string | null {
  return cookies?.token || null;
}
