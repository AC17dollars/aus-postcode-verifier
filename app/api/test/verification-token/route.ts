import { NextRequest } from "next/server";
import { elasticClient, USERS_INDEX } from "@/lib/elasticsearch";

/** Only available when ALLOW_TEST_ROUTES=true (e.g. e2e). Returns verification token for a user by email. */
export async function GET(request: NextRequest) {
  if (process.env.ALLOW_TEST_ROUTES !== "true") {
    return new Response(null, { status: 404 });
  }
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return Response.json({ error: "Missing email" }, { status: 400 });
  }
  try {
    const searchResponse = await elasticClient.search({
      index: USERS_INDEX,
      query: { term: { email: email.toLowerCase() } },
    });
    const total = searchResponse.hits.total;
    const totalValue =
      typeof total === "number" ? total : (total?.value ?? 0);
    if (totalValue === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const user = searchResponse.hits.hits[0]._source as {
      verificationToken?: string;
      verified?: boolean;
    };
    if (user.verified) {
      return Response.json({ error: "Already verified" }, { status: 400 });
    }
    if (!user.verificationToken) {
      return Response.json(
        { error: "No verification token" },
        { status: 404 },
      );
    }
    return Response.json({ token: user.verificationToken });
  } catch (err) {
    console.error("[TEST] verification-token error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
