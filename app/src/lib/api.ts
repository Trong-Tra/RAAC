import { useCallback, useEffect, useRef, useState } from "react";

export type ApiErrorCode =
  | "AGENT_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "INVALID_REQUEST"
  | "INTERNAL";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { cache: "no-store", ...init });
  } catch (err) {
    throw new ApiError(
      "INTERNAL",
      err instanceof Error ? err.message : "network request failed",
    );
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    body = null;
  }
  if (!body) {
    throw new ApiError("INTERNAL", `unexpected response (${res.status})`, res.status);
  }
  if (!body.ok) {
    throw new ApiError(body.error.code, body.error.message, res.status);
  }
  return body.data;
}

export interface AuditEvent {
  id: number;
  event_type: string;
  tenant_id: string | null;
  agent_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface NetworkEvent {
  id: number;
  event_type: string;
  agent_pseudonym: string;
  agent_category: string;
  action_class: string;
  outcome: string;
  risk_class: string;
  created_at: string;
}

export interface NetworkStats {
  agents_observed: number;
  papers_submitted: number;
  councils_formed: number;
  reviews_submitted: number;
  reviews_anchored: number;
  agents_registered: number;
}

export function getAuditEventsPage(
  opts: { limit?: number; page?: number; eventType?: string } = {},
): Promise<{ events: AuditEvent[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }> {
  const params = new URLSearchParams();
  params.set("limit", String(opts.limit ?? 20));
  params.set("page", String(opts.page ?? 1));
  if (opts.eventType) params.set("event_type", opts.eventType);
  return request<{ events: AuditEvent[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }>(`/api/audit/events?${params}`);
}

export function getNetworkEvents(
  opts: { limit?: number; beforeId?: number } = {},
): Promise<NetworkEvent[]> {
  const params = new URLSearchParams();
  params.set("limit", String(opts.limit ?? 100));
  if (opts.beforeId != null) params.set("before_id", String(opts.beforeId));
  return request<{ events: NetworkEvent[] }>(`/api/network/events?${params}`).then(
    (data) => data.events,
  );
}

export function getNetworkStats(): Promise<NetworkStats> {
  return request<NetworkStats>("/api/network/stats");
}

export function mergeNetworkEvents(
  a: NetworkEvent[],
  b: NetworkEvent[],
): NetworkEvent[] {
  const byId = new Map<number, NetworkEvent>();
  for (const event of a) byId.set(event.id, event);
  for (const event of b) byId.set(event.id, event);
  if (byId.size === a.length) return a;
  return [...byId.values()].sort((x, y) => x.id - y.id);
}

export function useApi<T>(
  key: string,
  loader: () => Promise<T>,
): { data: T | null; error: ApiError | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((result) => {
        if (!alive) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError("INTERNAL", err instanceof Error ? err.message : String(err)),
        );
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

const STREAM_BUFFER = 500;

export function useNetworkStream(): {
  events: NetworkEvent[];
  connected: boolean;
  error: string | null;
} {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/network/stream");

    const onNetwork = (message: MessageEvent) => {
      let row: NetworkEvent;
      try {
        row = JSON.parse(message.data as string) as NetworkEvent;
      } catch {
        return;
      }
      if (typeof row?.id !== "number") return;
      setEvents((prev) => {
        if (prev.some((e) => e.id === row.id)) return prev;
        const next = [...prev, row];
        return next.length > STREAM_BUFFER ? next.slice(next.length - STREAM_BUFFER) : next;
      });
    };

    source.onopen = () => {
      setConnected(true);
      setError(null);
    };
    source.onerror = () => {
      setConnected(false);
      setError("live stream disconnected — retrying");
    };
    source.addEventListener("network", onNetwork as EventListener);

    return () => {
      source.removeEventListener("network", onNetwork as EventListener);
      source.close();
    };
  }, []);

  return { events, connected, error };
}
