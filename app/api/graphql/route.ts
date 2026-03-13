import { createYoga, createSchema } from "graphql-yoga";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";

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
    searchPostcode(q: String!, state: String): [Locality]
  }
`;

const resolvers = {
  Query: {
    searchPostcode: async (
      _: unknown,
      { q, state }: { q: string; state?: string },
    ) => {
      const session = await getSession();
      if (!session) {
        throw new Error("Unauthorized");
      }

      const url = new URL(env.AUSPOST_API_URL);
      url.searchParams.append("q", q);
      if (state) {
        url.searchParams.append("state", state);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${env.AUSPOST_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch from Australia Post API");
      }

      const data = await response.json();
      const localities = data.localities?.locality;

      if (!localities) return [];

      return Array.isArray(localities) ? localities : [localities];
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
});

export { handleRequest as GET, handleRequest as POST };
