import { Client } from "@elastic/elasticsearch";
import { env } from "./env";

export const elasticClient = new Client({
  node: env.ELASTIC_NODE,
  auth: {
    apiKey: env.ELASTIC_API_KEY,
  },
  serverMode: "serverless",
});
export const USERS_INDEX = "abhinav-chalise-users";
export const SESSIONS_INDEX = "abhinav-chalise-sessions";
export const LOGS_INDEX = "abhinav-chalise-graphql-logs";

const LOGS_MAPPING = {
  properties: {
    userId: { type: "keyword" as const },
    name: {
      type: "text" as const,
      fields: { keyword: { type: "keyword" as const } },
    },
    email: { type: "keyword" as const },
    sessionId: { type: "keyword" as const },
    userAgent: { type: "text" as const },
    ipAddress: { type: "keyword" as const },
    postcode: { type: "keyword" as const },
    suburb: { type: "text" as const },
    state: { type: "keyword" as const },
    status: { type: "keyword" as const },
    errorMessage: { type: "text" as const },
    requestedAt: { type: "date" as const },
  },
} as const;

export async function initElastic() {
  const mapping = {
    properties: {
      text: {
        type: "semantic_text",
      },
      email: { type: "keyword" },
      password: { type: "text" },
      name: { type: "text" },
      verified: { type: "boolean" },
      verificationToken: { type: "keyword" },
      verificationTokenExpiresAt: { type: "date" },
      admin: { type: "boolean" },
      storagePreference: { type: "keyword" },
    },
  } as const;

  const sessionMapping = {
    properties: {
      userId: { type: "keyword" },
      sessionToken: { type: "keyword" },
      userAgent: { type: "text" },
      ipAddress: { type: "keyword" },
      expiresAt: { type: "date" },
      createdAt: { type: "date" },
    },
  } as const;

  try {
    const exists = await elasticClient.indices.exists({ index: USERS_INDEX });
    if (exists) {
      await elasticClient.indices.putMapping({
        index: USERS_INDEX,
        properties: {
          text: { type: "semantic_text" as const },
          verificationTokenExpiresAt: { type: "date" },
          admin: { type: "boolean" },
          storagePreference: { type: "keyword" },
        },
      });
      console.log(`Mapping updated for ${USERS_INDEX}.`);
    } else {
      await elasticClient.indices.create({
        index: USERS_INDEX,
        mappings: mapping,
      });
      console.log(`Index ${USERS_INDEX} created.`);
    }

    const sessionsExists = await elasticClient.indices.exists({
      index: SESSIONS_INDEX,
    });
    if (!sessionsExists) {
      await elasticClient.indices.create({
        index: SESSIONS_INDEX,
        mappings: sessionMapping,
      });
      console.log(`Index ${SESSIONS_INDEX} created.`);
    }

    const logsExists = await elasticClient.indices.exists({
      index: LOGS_INDEX,
    });
    if (!logsExists) {
      await elasticClient.indices.create({
        index: LOGS_INDEX,
        mappings: LOGS_MAPPING,
      });
      console.log(`Index ${LOGS_INDEX} created.`);
    }
  } catch (error) {
    console.error("Error initializing Elasticsearch:", error);
  }
}

export async function ensureLogsIndex() {
  try {
    const exists = await elasticClient.indices.exists({ index: LOGS_INDEX });
    if (!exists) {
      await elasticClient.indices.create({
        index: LOGS_INDEX,
        mappings: LOGS_MAPPING,
      });
      console.log(`Index ${LOGS_INDEX} created.`);
    }
  } catch (error) {
    console.error("Error ensuring logs index:", error);
  }
}
