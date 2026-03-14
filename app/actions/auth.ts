"use server";

import { elasticClient, USERS_INDEX, initElastic } from "@/lib/elasticsearch";
import argon2 from "argon2";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSession,
  revokeAllUserSessions,
  deleteSession,
} from "@/lib/session";
import { sendVerificationEmail } from "@/lib/email";

const VERIFICATION_TOKEN_EXPIRY_MINUTES = 10;

interface UserDocument {
  name: string;
  email: string;
  password: string;
  verified: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: string;
  createdAt: string;
  admin?: boolean;
  storagePreference?: "none" | "sessionStorage" | "localStorage";
}

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password || !name) {
    return { error: "Missing fields" };
  }

  try {
    // Ensure index and mappings are set
    await initElastic();

    // Check if user exists
    const searchResponse = await elasticClient.search({
      index: USERS_INDEX,
      query: {
        term: { email: email.toLowerCase() },
      },
    });

    const regTotal = searchResponse.hits.total;
    const regTotalValue =
      typeof regTotal === "number" ? regTotal : (regTotal?.value ?? 0);
    if (regTotalValue > 0) {
      return { error: "User already exists" };
    }

    const countResponse = await elasticClient.count({ index: USERS_INDEX });
    const isFirstUser = (countResponse.count ?? 0) === 0;

    const hashedPassword = await argon2.hash(password);
    const verificationToken = crypto.randomBytes(16).toString("hex");
    const verificationTokenExpiresAt = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    const indexResult = await elasticClient.index({
      index: USERS_INDEX,
      document: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        verified: false,
        verificationToken,
        verificationTokenExpiresAt,
        createdAt: new Date().toISOString(),
        admin: isFirstUser,
        storagePreference: "sessionStorage",
      },
      refresh: "wait_for",
    });

    const requestHeaders = await headers();
    const userAgent = requestHeaders.get("user-agent") || "Unknown Browser";
    const ipAddress = requestHeaders.get("x-forwarded-for") || "Unknown IP";

    await createSession(
      {
        userId: indexResult._id,
        email: email.toLowerCase(),
        name,
      },
      userAgent,
      ipAddress,
    );

    const sent = await sendVerificationEmail(
      email.toLowerCase(),
      verificationToken,
    );
    if (!sent.ok) {
      console.error("[AUTH] Verification email failed:", sent.error);
    }

    redirect("/verify-email");
  } catch (error) {
    const err = error as { digest?: string };
    if (err.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Registration error:", error);
    return { error: "Internal server error" };
  }
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Missing fields" };
  }

  try {
    const searchResponse = await elasticClient.search({
      index: USERS_INDEX,
      query: {
        term: { email: email.toLowerCase() },
      },
    });

    const total = searchResponse.hits.total;
    const totalValue = typeof total === "number" ? total : (total?.value ?? 0);
    if (totalValue === 0) {
      return { error: "Invalid credentials" };
    }

    const userDoc = searchResponse.hits.hits[0];
    const user = userDoc._source as UserDocument;

    const isValid = await argon2.verify(user.password, password);
    if (!isValid) {
      return { error: "Invalid credentials" };
    }

    const requestHeaders = await headers();
    const userAgent = requestHeaders.get("user-agent") || "Unknown Browser";
    const ipAddress = requestHeaders.get("x-forwarded-for") || "Unknown IP";

    await createSession(
      { userId: userDoc._id as string, email: user.email, name: user.name },
      userAgent,
      ipAddress,
    );

    if (!user.verified) {
      redirect("/verify-email");
    }

    redirect("/");
  } catch (error) {
    const err = error as { digest?: string };
    if (err.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Login error:", error);
    return { error: "Internal server error" };
  }
}

export async function resendVerification(email: string) {
  try {
    const searchResponse = await elasticClient.search({
      index: USERS_INDEX,
      query: { term: { email: email.toLowerCase() } },
    });

    const total = searchResponse.hits.total;
    const totalValue = typeof total === "number" ? total : (total?.value ?? 0);
    if (totalValue === 0) {
      return { error: "User not found" };
    }

    const userDoc = searchResponse.hits.hits[0];
    const user = userDoc._source as UserDocument;

    if (user.verified) {
      return { error: "Email is already verified" };
    }

    const verificationToken = crypto.randomBytes(16).toString("hex");
    const verificationTokenExpiresAt = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    await elasticClient.update({
      index: USERS_INDEX,
      id: userDoc._id as string,
      doc: {
        verificationToken,
        verificationTokenExpiresAt,
      },
      refresh: "wait_for",
    });

    const sent = await sendVerificationEmail(email, verificationToken);
    if (!sent.ok) {
      return { error: sent.error };
    }
    return { success: "Verification email sent! Check your inbox." };
  } catch (error) {
    console.error("Resend error:", error);
    return { error: "Internal server error" };
  }
}

export async function verifyEmail(token: string) {
  try {
    const searchResponse = await elasticClient.search({
      index: USERS_INDEX,
      query: {
        term: { verificationToken: token },
      },
    });

    const total = searchResponse.hits.total;
    const totalValue = typeof total === "number" ? total : (total?.value ?? 0);
    if (totalValue === 0) {
      return { error: "Invalid or expired token" };
    }

    const userDoc = searchResponse.hits.hits[0];
    const user = userDoc._source as UserDocument;
    const expiresAt = user.verificationTokenExpiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return {
        error: "Verification link has expired. Please request a new one.",
      };
    }

    const userId = userDoc._id;

    await elasticClient.update({
      index: USERS_INDEX,
      id: userId as string,
      script: {
        source:
          "ctx._source.verified = true; ctx._source.remove('verificationToken'); ctx._source.remove('verificationTokenExpiresAt');",
      },
      refresh: "wait_for",
    });

    return {
      success: "Email verified successfully! You can now log in.",
      email: user.email,
    };
  } catch (error) {
    console.error("Verification error:", error);
    return { error: "Internal server error" };
  }
}

export async function logout() {
  await deleteSession();
  redirect("/auth");
}

export async function revokeAllSessions(userId: string) {
  await revokeAllUserSessions(userId);
  await deleteSession();
  redirect("/auth");
}

export type StoragePreference = "none" | "sessionStorage" | "localStorage";

export async function updateStoragePreference(
  userId: string,
  storagePreference: StoragePreference,
) {
  try {
    await elasticClient.update({
      index: USERS_INDEX,
      id: userId,
      doc: { storagePreference },
      refresh: "wait_for",
    });
    return { success: true };
  } catch (error) {
    console.error("Update storage preference error:", error);
    return { error: "Failed to update preference" };
  }
}
