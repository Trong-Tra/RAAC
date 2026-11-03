"use client";

import { useEffect, useState } from "react";
import {
  EmptyState,
  ErrorWindow,
  PageHead,
  Panel,
  Skeleton,
  td,
  th,
} from "@/components/ConsoleBits";
import { eventSummary, fmtDateTime, shortId } from "@/components/console/derive";
import { getAuditEventsPage } from "@/lib/api";
import type { AuditEvent } from "@/lib/api";

const PAGE_SIZE = 20;

const EVENT_TYPES = [
  "paper.submitted",
  "agents.ranked",
  "council.proposed",
  "signature.verified",
  "council.opened",
  "discussion.message",
  "review.submitted",
  "paper.completed",
  "paper.failed",
];

export default function ConsoleAudit() {
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditEvent[] | null>(null);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number; hasMore: boolean } | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (p: number, f: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditEventsPage({ limit: PAGE_SIZE, page: p, eventType: f === "ALL" ? undefined : f });
      setData(res.events);
      setPagination(res.pagination);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError({ code: err.code ?? "INTERNAL", message: err.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, filter);
  }, [page, filter]);

  const reload = () => load(page, filter);
  const onFilterChange = (v: string) => {
    setFilter(v);
    setPage(1);
  };

  if (loading && !data) {
    return (
      <div>
        <PageHead title="Audit trace." sub="Most recent 20 per page — paginated, newest first. Private to this workspace." />
        <div style={{ marginTop: 28, display: "grid", gap: 10 }}>
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} height={40} />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <PageHead title="Audit trace." sub="Most recent 20 per page — paginated, newest first. Private to this workspace." />
        <div style={{ marginTop: 28 }}>
          <ErrorWindow code={error.code} message={error.message} title="Audit — error" />
          <button
            onClick={reload}
            className="btn-outline"
            style={{ marginTop: 18, cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const events = data ?? [];
  const total = pagination?.total ?? events.length;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div>
      <PageHead
        title="Audit trace."
        sub="Most recent 20 per page — paginated, newest first. Private to this workspace."
      />

      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <p className="sc" style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>
          Page {pagination?.page ?? page} of {totalPages} · {events.length} of {total} events — newest first
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            className="mono"
            aria-label="Filter audit events by type"
            style={{
              background: "var(--paper-raised)",
              border: "1px solid var(--rule-soft)",
              padding: "9px 12px",
              color: "var(--ink)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              outline: "none",
            }}
          >
            <option value="ALL">ALL EVENT TYPES</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="btn-outline"
            style={{ padding: "8px 12px", fontSize: 10, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? "default" : "pointer" }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="btn-outline"
            style={{ padding: "8px 12px", fontSize: 10, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? "default" : "pointer" }}
          >
            Next →
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Panel title={`Audit log${filter === "ALL" ? "" : ` — ${filter}`} · page ${page}/${totalPages}`}>
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Time</th>
                    <th style={th}>Event</th>
                    <th style={th}>Paper</th>
                    <th style={th}>Agent</th>
                    <th style={th}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td style={{ ...td, fontSize: 11, whiteSpace: "nowrap" }}>
                        {fmtDateTime(event.created_at)}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: "var(--ink)" }}>
                        {event.event_type}
                      </td>
                      <td style={{ ...td, fontSize: 11 }}>
                        {event.payload && typeof (event.payload as Record<string, unknown>).paper_id === "string" ? shortId((event.payload as Record<string, unknown>).paper_id as string, 8) : "—"}
                      </td>
                      <td style={{ ...td, fontSize: 11 }}>
                        {event.agent_id ? shortId(event.agent_id, 8) : "—"}
                      </td>
                      <td style={{ ...td, fontSize: 11, minWidth: 260 }}>
                        {eventSummary(event)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }} className="mono">
          <span style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-faint)" }}>
            Page {page} / {totalPages} · {total} total
          </span>
          <span style={{ fontSize: 10, color: "var(--rule-soft)" }}>·</span>
          <button onClick={() => setPage(1)} disabled={page === 1} className="mono" style={{ background: "transparent", border: "none", color: page === 1 ? "var(--rule-soft)" : "var(--vermilion-deep)", cursor: page === 1 ? "default" : "pointer", fontSize: 10, letterSpacing: "0.08em" }}>First</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="mono" style={{ background: "transparent", border: "none", color: page === 1 ? "var(--rule-soft)" : "var(--vermilion-deep)", cursor: page === 1 ? "default" : "pointer", fontSize: 10 }}>←</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="mono" style={{ background: "transparent", border: "none", color: page >= totalPages ? "var(--rule-soft)" : "var(--vermilion-deep)", cursor: page >= totalPages ? "default" : "pointer", fontSize: 10 }}>→</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="mono" style={{ background: "transparent", border: "none", color: page === totalPages ? "var(--rule-soft)" : "var(--vermilion-deep)", cursor: page === totalPages ? "default" : "pointer", fontSize: 10, letterSpacing: "0.08em" }}>Last</button>
        </div>
      </div>
    </div>
  );
}
