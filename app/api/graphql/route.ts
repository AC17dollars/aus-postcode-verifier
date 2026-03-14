import type { NextRequest } from "next/server";
import { GraphQLError } from "graphql";
import { createYoga, createSchema, createGraphQLError } from "graphql-yoga";
import { getSession, type SessionPayload } from "@/lib/session";
import { env } from "@/lib/env";
import { logGraphQLAttempt } from "@/lib/graphql-logs";

function getSessionIdFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const re = /session_token=([^;]+)/;
  const match = re.exec(cookieHeader);
  return match ? match[1].trim() : null;
}

interface GraphQLContext {
  request: Request;
}

const typeDefs = /* GraphQL */ `
  type Locality {
    id: Int
    location: String
    postcode: String
    state: String
    latitude: Float
    longitude: Float
    category: String
  }

  type Query {
    searchPostcode(q: String!, state: String, suburb: String): [Locality]
  }
`;

function getLogPayload(
  context: GraphQLContext,
  session: SessionPayload,
  q: string,
  suburb: string | undefined,
  state: string | undefined,
) {
  const cookieHeader = context.request.headers.get("cookie");
  return {
    session,
    sessionId: getSessionIdFromCookieHeader(cookieHeader),
    userAgent: context.request.headers.get("user-agent") ?? "",
    ipAddress:
      context.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      context.request.headers.get("x-real-ip") ??
      "",
    postcode: q,
    suburb: suburb ?? "",
    state: state ?? "",
  };
}

function filterBySuburb(
  rawLocalities: unknown[],
  suburb: string,
): unknown[] {
  const lowerSuburb = suburb.trim().toLowerCase();
  return rawLocalities.filter((loc) => {
    const locObj = loc as { location?: string };
    return (locObj.location ?? "").toLowerCase().includes(lowerSuburb);
  });
}

function parseLocalitiesFromResponse(
  data: { localities?: { locality?: unknown } },
): unknown[] {
  const raw = data?.localities?.locality;
  if (Array.isArray(raw)) return raw;
  if (raw !== undefined && raw !== null) return [raw];
  return [];
}

const resolvers = {
  Query: {
    searchPostcode: async (
      _: unknown,
      { q, state, suburb }: { q: string; state?: string; suburb?: string },
      context: GraphQLContext,
    ) => {
      const session = await getSession();
      if (!session) throw createGraphQLError("Unauthorized");

      const url = new URL(env.AUSPOST_API_URL);
      url.searchParams.append("q", q);
      if (state) url.searchParams.append("state", state);

      const logPayload = getLogPayload(context, session, q, suburb, state);

      try {
        let response: Response;
        try {
          response = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${env.AUSPOST_API_KEY}`,
            },
          });
        } catch (fetchError) {
          console.error("Address API fetch error:", fetchError);
          throw createGraphQLError("Address service unavailable. Try again.");
        }

        if (!response.ok) {
          throw createGraphQLError("Address service error. Try again.");
        }

        let data: { localities?: { locality?: unknown } };
        try {
          data = (await response.json()) as {
            localities?: { locality?: unknown };
          };
        } catch (parseError) {
          console.error("Address API invalid JSON:", parseError);
          throw createGraphQLError("Invalid response from address service.");
        }

        const rawLocalities = parseLocalitiesFromResponse(data);

        if (rawLocalities.length === 0) {
          throw createGraphQLError("Invalid postcode and state combination.");
        }

        const suburbTrimmed = suburb?.trim();
        const result = suburbTrimmed
          ? filterBySuburb(rawLocalities, suburbTrimmed)
          : rawLocalities;

        if (suburbTrimmed && result.length === 0) {
          throw createGraphQLError("Suburb not found for postcode.");
        }

        logGraphQLAttempt({
          ...logPayload,
          success: true,
        }).catch(() => {});

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Request failed. Try again.";

        logGraphQLAttempt({
          ...logPayload,
          success: false,
          errorMessage: message,
        }).catch(() => {});

        if (err instanceof GraphQLError) throw err;
        throw createGraphQLError("Unexpected error.");
      }
    },
  },
};

const { handleRequest } = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
  context: ({ request }) => ({ request }),
});

const emptyContext = {};
export async function GET(request: NextRequest) {
  return handleRequest(request, emptyContext);
}
export async function POST(request: NextRequest) {
  return handleRequest(request, emptyContext);
}
export async function OPTIONS(request: NextRequest) {
  return handleRequest(request, emptyContext);
}
