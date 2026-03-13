import { Client, cacheExchange, fetchExchange } from "urql";
import { requestPolicyExchange } from "@urql/exchange-request-policy";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/** Shared GraphQL client. Uses GET when URL is short, POST for longer queries.
 * Success responses are cached; errors are not. */
export const graphqlClient = new Client({
  url: "/api/graphql",
  fetchOptions: () => ({ credentials: "include" }),
  exchanges: [
    requestPolicyExchange({ ttl: CACHE_TTL_MS }),
    cacheExchange,
    fetchExchange,
  ],
});
