import { elasticClient, LOGS_INDEX, ensureLogsIndex } from "./elasticsearch";
import type { SessionPayload } from "./session";

const ERROR_MESSAGE_MAX_LENGTH = 200;

export interface GraphQLLogPayload {
  session: SessionPayload;
  sessionId: string | null;
  userAgent: string;
  ipAddress: string;
  postcode: string;
  suburb: string;
  state: string;
  success: boolean;
  errorMessage?: string;
}

function truncateError(msg: string): string {
  if (msg.length <= ERROR_MESSAGE_MAX_LENGTH) return msg;
  return msg.slice(0, ERROR_MESSAGE_MAX_LENGTH) + "…";
}

export async function logGraphQLAttempt(payload: GraphQLLogPayload) {
  try {
    await ensureLogsIndex();
    const doc: Record<string, unknown> = {
      userId: payload.session.userId,
      name: payload.session.name,
      email: payload.session.email,
      sessionId: payload.sessionId ?? "",
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
      postcode: payload.postcode,
      suburb: payload.suburb,
      state: payload.state,
      status: payload.success ? "success" : "failure",
      requestedAt: new Date().toISOString(),
    };
    if (payload.errorMessage) {
      doc.errorMessage = truncateError(payload.errorMessage);
    }
    await elasticClient.index({
      index: LOGS_INDEX,
      document: doc,
      refresh: "false",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GraphQL logs] Failed to store attempt:", msg);
    if (error instanceof Error && error.cause) {
      console.error("[GraphQL logs] Cause:", error.cause);
    }
  }
}
