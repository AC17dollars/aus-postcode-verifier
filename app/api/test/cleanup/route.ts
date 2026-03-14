import { NextRequest } from "next/server";
import {
  elasticClient,
  USERS_INDEX,
  SESSIONS_INDEX,
  LOGS_INDEX,
} from "@/lib/elasticsearch";

const ALLOW = process.env.ALLOW_TEST_ROUTES === "true";

/**
 * Only available when ALLOW_TEST_ROUTES=true (e.g. e2e).
 * DELETE with ?email=... to remove one user + their sessions + logs.
 * DELETE with ?emailPrefix=... to remove all users whose email starts with prefix + their sessions + logs.
 */
export async function DELETE(request: NextRequest) {
  if (!ALLOW) {
    return new Response(null, { status: 404 });
  }
  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email");
  const emailPrefix = searchParams.get("emailPrefix");

  if (email) {
    return deleteByEmail(email);
  }
  if (emailPrefix) {
    return deleteByEmailPrefix(emailPrefix);
  }
  return Response.json(
    { error: "Provide query param 'email' or 'emailPrefix'" },
    { status: 400 },
  );
}

async function deleteByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }
  try {
    const searchResponse = await elasticClient.search({
      index: USERS_INDEX,
      query: { term: { email: normalizedEmail } },
      _source: false,
    });
    const total = searchResponse.hits.total;
    const totalValue = typeof total === "number" ? total : (total?.value ?? 0);
    if (totalValue === 0) {
      return Response.json({ deleted: 0, message: "User not found" });
    }
    const userId = searchResponse.hits.hits[0]._id as string;
    const { sessionsDeleted, logsDeleted } = await deleteUserData(userId);
    await elasticClient.delete({
      index: USERS_INDEX,
      id: userId,
      refresh: "wait_for",
    });
    return Response.json({
      deleted: 1,
      userId,
      sessionsDeleted,
      logsDeleted,
    });
  } catch (err) {
    console.error("[TEST] cleanup by email error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function deleteByEmailPrefix(prefix: string) {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return Response.json({ error: "Invalid emailPrefix" }, { status: 400 });
  }
  try {
    const searchResponse = await elasticClient.search({
      index: USERS_INDEX,
      query: { prefix: { email: trimmed.toLowerCase() } },
      _source: false,
      size: 10_000,
    });
    const hits = searchResponse.hits.hits;
    if (hits.length === 0) {
      return Response.json({ deleted: 0, message: "No matching users" });
    }
    let sessionsDeleted = 0;
    let logsDeleted = 0;
    for (const hit of hits) {
      const userId = hit._id as string;
      const result = await deleteUserData(userId);
      sessionsDeleted += result.sessionsDeleted;
      logsDeleted += result.logsDeleted;
      await elasticClient.delete({
        index: USERS_INDEX,
        id: userId,
        refresh: "wait_for",
      });
    }
    return Response.json({
      deleted: hits.length,
      sessionsDeleted,
      logsDeleted,
    });
  } catch (err) {
    console.error("[TEST] cleanup by emailPrefix error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function deleteUserData(userId: string): Promise<{
  sessionsDeleted: number;
  logsDeleted: number;
}> {
  const [sessionsResult, logsResult] = await Promise.all([
    elasticClient.deleteByQuery({
      index: SESSIONS_INDEX,
      query: { term: { userId } },
      refresh: true,
    }),
    elasticClient.deleteByQuery({
      index: LOGS_INDEX,
      query: { term: { userId } },
      refresh: true,
    }),
  ]);
  const s = sessionsResult as { deleted?: number };
  const l = logsResult as { deleted?: number };
  return {
    sessionsDeleted: typeof s.deleted === "number" ? s.deleted : 0,
    logsDeleted: typeof l.deleted === "number" ? l.deleted : 0,
  };
}
