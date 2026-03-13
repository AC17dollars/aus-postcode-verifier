import { cookies } from "next/headers";
import crypto from "node:crypto";
import { elasticClient, SESSIONS_INDEX, USERS_INDEX } from "./elasticsearch";

const SESSION_EXPIRATION_DAYS = 30; // 30 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createSession(
  payload: SessionPayload,
  deviceInfo: string = "Unknown Device",
  userAgent: string = "Unknown Browser",
  ipAddress: string = "Unknown IP",
) {
  const sessionToken = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRATION_DAYS);

  // Store session token in Elasticsearch
  await elasticClient.index({
    index: SESSIONS_INDEX,
    document: {
      userId: payload.userId,
      sessionToken,
      deviceInfo,
      userAgent,
      ipAddress,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    },
  });

  const cookieStore = await cookies();

  cookieStore.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRATION_DAYS * 24 * 60 * 60, // 30 days
  });

  return sessionToken;
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (sessionToken) {
    // Revoke from Elasticsearch
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

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) return null;

  try {
    // 1. Find session in Elasticsearch
    const searchResponse = await elasticClient.search({
      index: SESSIONS_INDEX,
      query: {
        term: { sessionToken },
      },
    });

    const total = searchResponse.hits.total;
    const totalValue = typeof total === "number" ? total : (total?.value ?? 0);
    if (totalValue === 0) return null;

    const sessionDoc = searchResponse.hits.hits[0];
    const session = sessionDoc._source as { userId: string; expiresAt: string };

    // 2. Validate expiration
    if (new Date(session.expiresAt) < new Date()) {
      // Token expired, delete from ES
      await elasticClient.delete({
        index: SESSIONS_INDEX,
        id: sessionDoc._id as string,
        refresh: true,
      });
      cookieStore.delete("session_token");
      return null;
    }

    // 3. Fetch user details payload
    const userResponse = await elasticClient.get({
      index: USERS_INDEX,
      id: session.userId,
    });

    if (!userResponse.found) return null;
    const user = userResponse._source as { email: string; name: string };

    // 4. Update Elasticsearch record (Sliding Window) & Cookie
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRATION_DAYS);

      await elasticClient.update({
        index: SESSIONS_INDEX,
        id: sessionDoc._id as string,
        doc: {
          expiresAt: expiresAt.toISOString(),
        },
      });

      cookieStore.set("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_EXPIRATION_DAYS * 24 * 60 * 60,
      });
    } catch {}

    return {
      userId: session.userId,
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    console.error("Session verification failed", error);
    return null;
  }
}
