import { cache } from "react";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { elasticClient, SESSIONS_INDEX, USERS_INDEX } from "./elasticsearch";

const SESSION_EXPIRATION_DAYS = 14; // 14 days

export type StoragePreference = "none" | "sessionStorage" | "localStorage";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  verified: boolean;
  admin?: boolean;
  storagePreference?: StoragePreference;
}

export async function createSession(
  payload: Omit<SessionPayload, "verified">,
  userAgent: string = "Unknown Browser",
  ipAddress: string = "Unknown IP",
) {
  const sessionToken = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRATION_DAYS);

  await elasticClient.index({
    index: SESSIONS_INDEX,
    document: {
      userId: payload.userId,
      sessionToken,
      userAgent,
      ipAddress,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    },
    refresh: "wait_for",
  });

  const cookieStore = await cookies();

  cookieStore.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRATION_DAYS * 24 * 60 * 60,
  });

  return sessionToken;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (sessionToken) {
    try {
      await elasticClient.deleteByQuery({
        index: SESSIONS_INDEX,
        query: {
          term: { sessionToken },
        },
      });
    } catch (e) {
      console.error("Failed to revoke session on logout", e);
    }
  }

  cookieStore.delete("session_token");
}

export async function revokeAllUserSessions(userId: string) {
  try {
    await elasticClient.deleteByQuery({
      index: SESSIONS_INDEX,
      query: {
        term: { userId },
      },
      refresh: true,
    });
  } catch (e) {
    console.error("Failed to revoke all user sessions", e);
  }
}

const SESSION_PAYLOAD_HEADER = "x-session-payload";

/** Encodes session for proxy-set request header. */
export function encodeSessionHeader(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

/** Decodes session from proxy-set request header. */
export function decodeSessionHeader(value: string): SessionPayload | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    const data = JSON.parse(json) as unknown;
    if (
      data &&
      typeof data === "object" &&
      "userId" in data &&
      "email" in data &&
      "name" in data &&
      "verified" in data
    ) {
      return data as SessionPayload;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Header name set by proxy when session is valid. */
export { SESSION_PAYLOAD_HEADER };

/**
 * Validates token against ES and returns session payload or null.
 * Deletes invalid/expired session from ES. Used by proxy and getSession fallback.
 */
export async function validateSessionToken(
  sessionToken: string,
): Promise<SessionPayload | null> {
  try {
    const searchResponse = await elasticClient.search({
      index: SESSIONS_INDEX,
      query: { term: { sessionToken } },
    });

    const total = searchResponse.hits.total;
    const totalValue = typeof total === "number" ? total : (total?.value ?? 0);
    if (totalValue === 0) return null;

    const sessionDoc = searchResponse.hits.hits[0];
    const session = sessionDoc._source as { userId: string; expiresAt: string };

    if (new Date(session.expiresAt) < new Date()) {
      await elasticClient.delete({
        index: SESSIONS_INDEX,
        id: sessionDoc._id as string,
        refresh: true,
      });
      return null;
    }

    const userResponse = await elasticClient.get({
      index: USERS_INDEX,
      id: session.userId,
    });

    if (!userResponse.found) {
      await elasticClient.delete({
        index: SESSIONS_INDEX,
        id: sessionDoc._id as string,
        refresh: true,
      });
      return null;
    }

    const user = userResponse._source as {
      email: string;
      name: string;
      verified?: boolean;
      admin?: boolean;
      storagePreference?: string;
    };

    const storagePreference =
      user.storagePreference as SessionPayload["storagePreference"];
    const validPref =
      storagePreference === "none" ||
      storagePreference === "sessionStorage" ||
      storagePreference === "localStorage"
        ? storagePreference
        : "sessionStorage";

    return {
      userId: session.userId,
      email: user.email,
      name: user.name,
      verified: user.verified === true,
      admin: user.admin === true,
      storagePreference: validPref,
    };
  } catch (error) {
    console.error("Session verification failed", error);
    return null;
  }
}

async function getSessionUncached(): Promise<SessionPayload | null> {
  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const encoded = headerStore.get(SESSION_PAYLOAD_HEADER);
  if (encoded) {
    const session = decodeSessionHeader(encoded);
    if (session) return session;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return null;

  return validateSessionToken(sessionToken);
}

/** Cached per request so layout and pages can call it without duplicate work. */
export const getSession = cache(getSessionUncached);
