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
    },
  } as const;

  const sessionMapping = {
    properties: {
      userId: { type: "keyword" },
      sessionToken: { type: "keyword" },
      deviceInfo: { type: "text" },
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
          text: {
            type: "semantic_text" as const,
          },
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
  } catch (error) {
    console.error("Error initializing Elasticsearch:", error);
  }
}
