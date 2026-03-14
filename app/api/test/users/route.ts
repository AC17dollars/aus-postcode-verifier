import { NextRequest } from "next/server";
import argon2 from "argon2";
import crypto from "node:crypto";
import { elasticClient, USERS_INDEX, initElastic } from "@/lib/elasticsearch";

const ALLOW = process.env.ALLOW_TEST_ROUTES === "true";
/** Default password for test users when not provided (e2e only, ALLOW_TEST_ROUTES). */
const DEFAULT_PW = "5c5569be4814ec6acb";
const VERIFICATION_TOKEN_EXPIRY_MINUTES = 10;

/**
 * Only available when ALLOW_TEST_ROUTES=true (e.g. e2e).
 * POST with JSON body: { email: string, password?: string, name?: string, verified?: boolean, admin?: boolean }
 * Creates a user in ES. Returns { email, password, name } for login and cleanup.
 */
export async function POST(request: NextRequest) {
  if (!ALLOW) {
    return new Response(null, { status: 404 });
  }
  let body: {
    email?: string;
    password?: string;
    name?: string;
    verified?: boolean;
    admin?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  if (!email) {
    return Response.json({ error: "Missing or invalid email" }, { status: 400 });
  }
  const password =
    typeof body.password === "string" && body.password.length > 0
      ? body.password
      : DEFAULT_PW;
  const name =
    typeof body.name === "string" && body.name.length > 0
      ? body.name
      : "E2E Test User";
  const verified = body.verified === true;
  const admin = body.admin === true;

  try {
    await initElastic();
    const searchResponse = await elasticClient.search({
      index: USERS_INDEX,
      query: { term: { email } },
    });
    const total = searchResponse.hits.total;
    const totalValue =
      typeof total === "number" ? total : (total?.value ?? 0);
    if (totalValue > 0) {
      return Response.json(
        { error: "User with this email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await argon2.hash(password);
    const now = new Date().toISOString();
    const doc: Record<string, unknown> = {
      name,
      email,
      password: hashedPassword,
      verified,
      createdAt: now,
      admin,
      storagePreference: "sessionStorage",
    };
    if (!verified) {
      doc.verificationToken = crypto.randomBytes(16).toString("hex");
      doc.verificationTokenExpiresAt = new Date(
        Date.now() + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000,
      ).toISOString();
    }

    await elasticClient.index({
      index: USERS_INDEX,
      document: doc,
      refresh: "wait_for",
    });

    return Response.json({
      email,
      password,
      name,
    });
  } catch (err) {
    console.error("[TEST] create user error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
