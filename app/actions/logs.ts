"use server";

import { getSession } from "@/lib/session";
import { elasticClient, LOGS_INDEX } from "@/lib/elasticsearch";

export interface GraphQLLogEntry {
  id: string;
  userId: string;
  name: string;
  email: string;
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  postcode: string;
  suburb: string;
  state: string;
  status: string;
  errorMessage?: string;
  requestedAt: string;
}

export type LogSortField =
  | "requestedAt"
  | "name"
  | "email"
  | "postcode"
  | "state";
export type LogSortOrder = "asc" | "desc";

const SORT_FIELD_MAP: Record<LogSortField, string> = {
  requestedAt: "requestedAt",
  name: "name.keyword",
  email: "email",
  postcode: "postcode",
  state: "state",
} as const;

const PAGE_SIZE = 20;

export async function getLogs(options: {
  page?: number;
  pageSize?: number;
  sortBy?: LogSortField;
  sortOrder?: LogSortOrder;
  searchName?: string;
  searchEmail?: string;
}) {
  const session = await getSession();
  if (!session?.admin) {
    return { error: "Forbidden", logs: [], hasMore: false };
  }

  const page = options.page ?? 0;
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const sortBy = options.sortBy ?? "requestedAt";
  const sortOrder = options.sortOrder ?? "desc";

  const must: Array<{ match?: { name: string }; term?: { email: string } }> =
    [];
  if (options.searchName?.trim()) {
    must.push({ match: { name: options.searchName.trim() } });
  }
  if (options.searchEmail?.trim()) {
    must.push({
      term: { email: options.searchEmail.trim().toLowerCase() },
    });
  }

  try {
    const sortField = SORT_FIELD_MAP[sortBy];
    const query =
      must.length > 0
        ? {
            bool: { must } as {
              must: Array<
                { match: { name: string } } | { term: { email: string } }
              >;
            },
          }
        : { match_all: {} };

    const response = await elasticClient.search({
      index: LOGS_INDEX,
      from: page * pageSize,
      size: pageSize + 1,
      sort: [{ [sortField]: sortOrder }],
      query,
    });

    const hits = response.hits.hits;
    const hasMore = hits.length > pageSize;
    const logs = (hasMore ? hits.slice(0, pageSize) : hits).map((hit) => {
      const s = hit._source as Record<string, unknown>;
      return {
        id: hit._id ?? "",
        userId: (s.userId as string) ?? "",
        name: (s.name as string) ?? "",
        email: (s.email as string) ?? "",
        sessionId: (s.sessionId as string) ?? "",
        userAgent: (s.userAgent as string) ?? "",
        ipAddress: (s.ipAddress as string) ?? "",
        postcode: (s.postcode as string) ?? "",
        suburb: (s.suburb as string) ?? "",
        state: (s.state as string) ?? "",
        status: (s.status as string) ?? "",
        errorMessage: s.errorMessage as string | undefined,
        requestedAt: (s.requestedAt as string) ?? "",
      } as GraphQLLogEntry;
    });

    return { logs, hasMore };
  } catch (error) {
    console.error("getLogs error:", error);
    return { error: "Failed to fetch logs", logs: [], hasMore: false };
  }
}
