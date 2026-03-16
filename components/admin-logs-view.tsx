"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, ChevronDown, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getLogs,
  type GraphQLLogEntry,
  type LogSortField,
  type LogSortOrder,
} from "@/app/actions/logs";

const SORT_FIELDS: { value: LogSortField; label: string }[] = [
  { value: "requestedAt", label: "Date / time" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "postcode", label: "Postcode" },
  { value: "state", label: "State" },
];

function formatRequestedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function LogStatusCell({ log }: Readonly<{ log: GraphQLLogEntry }>) {
  if (log.status === "success" && !log.errorMessage) {
    return <span className="text-emerald-500 font-medium">Success</span>;
  }
  if (log.status === "success" && log.errorMessage) {
    return (
      <span
        className="text-yellow-500 font-medium break-words"
        title={log.errorMessage}
      >
        {log.errorMessage}
      </span>
    );
  }
  return (
    <span className="text-rose-500 break-words" title={log.errorMessage}>
      {log.errorMessage || "Failure"}
    </span>
  );
}

export function AdminLogsView() {
  const [logs, setLogs] = useState<GraphQLLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<LogSortField>("requestedAt");
  const [sortOrder, setSortOrder] = useState<LogSortOrder>("desc");
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchNameDebounced, setSearchNameDebounced] = useState("");
  const [searchEmailDebounced, setSearchEmailDebounced] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(0);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      const result = await getLogs({
        page: pageNum,
        pageSize: 20,
        sortBy,
        sortOrder,
        searchName: searchNameDebounced || undefined,
        searchEmail: searchEmailDebounced || undefined,
      });
      setLoading(false);
      if (result.error && !result.logs.length) return;
      setLogs((prev) => (append ? [...prev, ...result.logs] : result.logs));
      setHasMore(result.hasMore);
    },
    [sortBy, sortOrder, searchNameDebounced, searchEmailDebounced],
  );

  useEffect(() => {
    nextPageRef.current = 0;
    const t = setTimeout(() => {
      setHasMore(true);
      loadPage(0, false);
    }, 0);
    return () => clearTimeout(t);
  }, [loadPage]);

  useEffect(() => {
    const t = setTimeout(() => setSearchNameDebounced(searchName), 300);
    return () => clearTimeout(t);
  }, [searchName]);
  useEffect(() => {
    const t = setTimeout(() => setSearchEmailDebounced(searchEmail), 300);
    return () => clearTimeout(t);
  }, [searchEmail]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          nextPageRef.current += 1;
          loadPage(nextPageRef.current, true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadPage]);

  const handleSortChange = (field: LogSortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    nextPageRef.current = 0;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#050505]/95 backdrop-blur supports-[backdrop-filter]:bg-[#050505]/80 px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white/60" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">GraphQL Logs</h1>
            <p className="text-xs text-gray-500">Admin view</p>
          </div>
        </div>
        <Link
          href="/"
          title="Go back / Home"
          aria-label="Go back to home"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-white/50 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Go back / Home</span>
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[140px] max-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                type="text"
                placeholder="Search by name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9 bg-white/[0.04] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="relative flex-1 min-w-[140px] max-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                type="text"
                placeholder="Search by email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-9 bg-white/[0.04] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort:</span>
              <div className="flex flex-wrap gap-1">
                {SORT_FIELDS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleSortChange(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sortBy === value
                        ? "bg-white/10 text-white"
                        : "text-gray-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                    {sortBy === value && (
                      <ChevronDown
                        className={`inline-block w-3 h-3 ml-1 align-middle transition-transform ${
                          sortOrder === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Query
                    </th>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Date / time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="p-4 align-top">
                        <div>
                          <p className="font-medium text-white">{log.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {log.email}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-1 text-xs text-gray-400">
                          <p>
                            <span className="text-gray-500">Session:</span>{" "}
                            {log.sessionId
                              ? `${log.sessionId.slice(0, 12)}…`
                              : "—"}
                          </p>
                          <p>
                            <span className="text-gray-500">User agent:</span>{" "}
                            {log.userAgent || "—"}
                          </p>
                          <p>
                            <span className="text-gray-500">IP:</span>{" "}
                            {log.ipAddress || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-1 text-xs text-gray-400">
                          <p>
                            <span className="text-gray-500">Postcode:</span>{" "}
                            {log.postcode || "—"}
                          </p>
                          <p>
                            <span className="text-gray-500">Suburb:</span>{" "}
                            {log.suburb || "—"}
                          </p>
                          <p>
                            <span className="text-gray-500">State:</span>{" "}
                            {log.state || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="text-xs">
                          <LogStatusCell log={log} />
                        </div>
                      </td>
                      <td className="p-4 align-top text-xs text-gray-400 whitespace-nowrap">
                        {formatRequestedAt(log.requestedAt)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loading && (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading…
              </div>
            )}
            <div ref={sentinelRef} className="h-4" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
