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

  type SearchPostcodeResult {
    success: Boolean!
    message: String
    matching: [Locality!]!
    others: [Locality!]!
  }

  type Query {
    searchPostcode(suburb: String!, state: String, postcode: String!): SearchPostcodeResult
  }
`;

function getLogPayload(
  context: GraphQLContext,
  session: SessionPayload,
  suburb: string,
  state: string | undefined,
  postcode: string,
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
    postcode,
    suburb: suburb ?? "",
    state: state ?? "",
  };
}

interface NormalizedLocality {
  id: number;
  location: string;
  postcode: string;
  state: string;
  latitude: number;
  longitude: number;
  category: string;
}

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") return Number.parseFloat(v) || 0;
  return 0;
}

function toString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function normalizeLocality(raw: unknown, index: number): NormalizedLocality {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof o.id === "number" ? o.id : index + 1,
    location: toString(o.location ?? o.name ?? o.locality ?? ""),
    postcode: toString(o.postcode ?? o.code ?? ""),
    state: toString(o.state ?? ""),
    latitude: toNumber(o.latitude ?? o.lat),
    longitude: toNumber(o.longitude ?? o.lng ?? o.lon),
    category: toString(o.category ?? o.type ?? ""),
  };
}

function parseLocalitiesFromResponse(data: {
  localities?: { locality?: unknown };
}): unknown[] {
  const raw = data?.localities?.locality;
  if (Array.isArray(raw)) return raw;
  if (raw !== undefined && raw !== null) return [raw];
  return [];
}

function splitMatchingAndOthers(
  normalized: NormalizedLocality[],
  postcode: string,
): { matching: NormalizedLocality[]; others: NormalizedLocality[] } {
  const q = postcode.trim();
  const matching: NormalizedLocality[] = [];
  const others: NormalizedLocality[] = [];
  for (const loc of normalized) {
    if ((loc.postcode ?? "").trim() === q) {
      matching.push(loc);
    } else {
      others.push(loc);
    }
  }
  return { matching, others };
}

async function fetchAusPostLocalities(url: URL): Promise<unknown[]> {
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${env.AUSPOST_API_KEY}` },
  });
  if (!response.ok) throw createGraphQLError("Address service error. Try again.");
  let data: { localities?: { locality?: unknown } };
  try {
    data = (await response.json()) as { localities?: { locality?: unknown } };
  } catch (parseError) {
    console.error("Address API invalid JSON:", parseError);
    throw createGraphQLError("Invalid response from address service.");
  }
  return parseLocalitiesFromResponse(data);
}

const resolvers = {
  Query: {
    searchPostcode: async (
      _: unknown,
      {
        suburb,
        state,
        postcode,
      }: { suburb: string; state?: string; postcode: string },
      context: GraphQLContext,
    ) => {
      const session = await getSession();
      if (!session) throw createGraphQLError("Unauthorized");

      const url = new URL(env.AUSPOST_API_URL);
      url.searchParams.append("q", suburb.trim());
      if (state?.trim()) url.searchParams.append("state", state.trim());

      const logPayload = getLogPayload(
        context,
        session,
        suburb.trim(),
        state,
        postcode.trim(),
      );

      try {
        let rawLocalities: unknown[];
        try {
          rawLocalities = await fetchAusPostLocalities(url);
        } catch (fetchError) {
          console.error("Address API fetch error:", fetchError);
          throw fetchError instanceof GraphQLError
            ? fetchError
            : createGraphQLError("Address service unavailable. Try again.");
        }

        if (rawLocalities.length === 0) {
          const stateLabel = (state ?? "").trim() || "the given state";
          const message = `${suburb.trim()} doesn't exist in ${stateLabel}`;
          await logGraphQLAttempt({
            ...logPayload,
            success: false,
            errorMessage: message,
          }).catch((e) => console.error("GraphQL log write failed:", e));
          return {
            success: false,
            message,
            matching: [],
            others: [],
          };
        }

        const normalized = rawLocalities.map((raw, i) =>
          normalizeLocality(raw, i),
        );
        const { matching, others } = splitMatchingAndOthers(
          normalized,
          postcode.trim(),
        );

        await logGraphQLAttempt({
          ...logPayload,
          success: true,
          errorMessage:
            matching.length === 0 && others.length > 0
              ? "No exact postcode match"
              : undefined,
        }).catch((e) => console.error("GraphQL log write failed:", e));

        return { success: true, message: null, matching, others };
      } catch (err) {
        if (err instanceof GraphQLError) {
          await logGraphQLAttempt({
            ...logPayload,
            success: false,
            errorMessage: err.message,
          }).catch((e) => console.error("GraphQL log write failed:", e));
          throw err;
        }
        const message =
          err instanceof Error ? err.message : "Request failed. Try again.";
        await logGraphQLAttempt({
          ...logPayload,
          success: false,
          errorMessage: message,
        }).catch((e) => console.error("GraphQL log write failed:", e));
        throw createGraphQLError(message);
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
