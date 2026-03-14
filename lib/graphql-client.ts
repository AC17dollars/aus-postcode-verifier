import { Client, fetchExchange } from "urql";

/** Shared GraphQL client. No caching; every request hits the server. */
export const graphqlClient = new Client({
  url: "/api/graphql",
  fetchOptions: () => ({ credentials: "include" }),
  exchanges: [fetchExchange],
});
