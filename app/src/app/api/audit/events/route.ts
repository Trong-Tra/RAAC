import { and, count, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { auditEvents } from "@/server/db/schema";
import { eventTypes } from "@/server/events/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get("task_id");
    const eventType = url.searchParams.get("event_type");
    const limitRaw = url.searchParams.get("limit");
    const pageRaw = url.searchParams.get("page");
    const beforeRaw = url.searchParams.get("before_id");

    const limitParsed = limitRaw == null ? 20 : Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(limitParsed) || limitParsed < 1) {
      return Response.json(
        { ok: false, error: { code: "INVALID_REQUEST", message: "limit must be a positive integer" } },
        { status: 400 },
      );
    }
    const limit = Math.min(limitParsed, 100);
    const pageParsed = pageRaw == null ? 1 : Number.parseInt(pageRaw, 10);
    if (!Number.isFinite(pageParsed) || pageParsed < 1) {
      return Response.json(
        { ok: false, error: { code: "INVALID_REQUEST", message: "page must be a positive integer" } },
        { status: 400 },
      );
    }
    const page = Math.min(pageParsed, 1000);
    const offset = (page - 1) * limit;

    const filters = [];
    if (taskId != null) {
      if (!z.string().uuid().safeParse(taskId).success) {
        return Response.json(
          { ok: false, error: { code: "INVALID_REQUEST", message: "task_id must be a uuid" } },
          { status: 400 },
        );
      }
      filters.push(eq(auditEvents.taskId, taskId));
    }
    if (eventType != null) {
      if (!(eventTypes as readonly string[]).includes(eventType)) {
        return Response.json(
          { ok: false, error: { code: "INVALID_REQUEST", message: `unknown event_type: ${eventType}` } },
          { status: 400 },
        );
      }
      filters.push(eq(auditEvents.eventType, eventType));
    }
    if (beforeRaw != null) {
      const before = Number.parseInt(beforeRaw, 10);
      if (!Number.isFinite(before) || before < 0) {
        return Response.json(
          { ok: false, error: { code: "INVALID_REQUEST", message: "before_id must be a non-negative integer" } },
          { status: 400 },
        );
      }
      filters.push(lt(auditEvents.id, before));
    }

    // before_id cursor takes precedence over page offset when provided (legacy)
    let rows;
    let total = 0;
    if (beforeRaw != null) {
      rows = await db()
        .select()
        .from(auditEvents)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(auditEvents.id))
        .limit(limit);
    } else {
      const countRows = await db()
        .select({ c: count() })
        .from(auditEvents)
        .where(filters.length ? and(...filters) : undefined);
      total = Number(countRows[0]?.c ?? 0);
      rows = await db()
        .select()
        .from(auditEvents)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(auditEvents.id))
        .limit(limit)
        .offset(offset);
    }
    // when using before_id, still compute total for pagination display
    if (beforeRaw != null) {
      const countRows = await db()
        .select({ c: count() })
        .from(auditEvents)
        .where(filters.length ? and(...filters) : undefined);
      total = Number(countRows[0]?.c ?? 0);
    }

    return Response.json({
      ok: true,
      data: {
        events: rows.map((row) => ({
          id: row.id,
          event_type: row.eventType,
          tenant_id: row.tenantId,
          task_id: row.taskId,
          agent_id: row.agentId,
          payload: row.payload,
          created_at: row.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasMore: offset + rows.length < total,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { ok: false, error: { code: "INTERNAL", message } },
      { status: 500 },
    );
  }
}
