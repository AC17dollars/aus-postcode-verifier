"use server";

import { elasticClient, USERS_INDEX, initElastic } from "@/lib/elasticsearch";
import argon2 from "argon2";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { createSession, logout, revokeAllUserSessions } from "@/lib/session";

interface UserDocument {
  name: string;
  email: string;
  password: string;
  verified: boolean;
  verificationToken?: string;
  createdAt: string;
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

    const hashedPassword = await argon2.hash(password);
    const verificationToken = crypto.randomBytes(16).toString("hex");

    await elasticClient.index({
      index: USERS_INDEX,
      document: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        verified: false,
        verificationToken,
        createdAt: new Date().toISOString(),
      },
      refresh: "wait_for",
    });

    console.log(
      `[AUTH] Verification mail for ${email}: http://localhost:3000/verify?token=${verificationToken}`,
    );

    return {
      success:
        "Registration successful! Please check console for verification link.",
    };
  } catch (error) {
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

    if (!user.verified) {
      return {
        error:
          "Please check your email to verify your account or resend the verification email.",
        needsVerification: true,
        email: user.email,
      };
    }

    const isValid = await argon2.verify(user.password, password);
    if (!isValid) {
      return { error: "Invalid credentials" };
    }

    const requestHeaders = await headers();
    const userAgent = requestHeaders.get("user-agent") || "Unknown Browser";
    const ipAddress = requestHeaders.get("x-forwarded-for") || "Unknown IP";

    await createSession(
      { userId: userDoc._id as string, email: user.email, name: user.name },
      "Web Browser",
      userAgent,
      ipAddress,
    );

    return { success: `Welcome back, ${user.name}!` };
  } catch (error) {
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

    await elasticClient.update({
      index: USERS_INDEX,
      id: userDoc._id as string,
      doc: {
        verificationToken,
      },
      refresh: "wait_for",
    });

    console.log(
      `[AUTH] Verification mail for ${email}: http://localhost:3000/verify?token=${verificationToken}`,
    );

    return { success: "Verification email sent! Please check your console." };
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
    const userId = userDoc._id;

    await elasticClient.update({
      index: USERS_INDEX,
      id: userId as string,
      script: {
        source:
          "ctx._source.verified = true; ctx._source.remove('verificationToken')",
      },
      refresh: "wait_for",
    });

    return { success: "Email verified successfully! You can now log in." };
  } catch (error) {
    console.error("Verification error:", error);
    return { error: "Internal server error" };
  }
}

export { logout };

export async function revokeAllSessions(userId: string) {
  await revokeAllUserSessions(userId);
  await logout();
}
