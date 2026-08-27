import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PeriodicScheduleLineRow, PeriodicScheduleRow } from "@/lib/periodic/types";

export type PeriodicScheduleFilter = {
  trashed?: boolean;
  /** Client name / subject search */
  query?: string;
  page?: number;
  pageSize?: number;
};

export type PeriodicScheduleWithClient = PeriodicScheduleRow & {
  clients?: { id: string; name: string } | null;
};

export async function getPeriodicSchedules(orgId: string, filter: PeriodicScheduleFilter = {}) {
  const supabase = await getSupabaseServerClient();
  const { trashed = false, query, page = 1, pageSize = 30 } = filter;

  let q = supabase
    .from("periodic_invoice_schedules")
    .select("*, clients(id, name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  q = trashed ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);

  if (query) {
    // clients is a joined table, so or() cannot filter it directly.
    const { data: matchedClients } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", orgId)
      .ilike("name", `%${query}%`)
      .limit(200);

    const clientIds = (matchedClients ?? []).map((c) => c.id as string);
    const clauses = [`subject.ilike.%${query}%`];
    if (clientIds.length > 0) clauses.push(`client_id.in.(${clientIds.join(",")})`);
    q = q.or(clauses.join(","));
  }

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { schedules: (data ?? []) as PeriodicScheduleWithClient[], total: count ?? 0 };
}

export async function getPeriodicScheduleById(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("periodic_invoice_schedules")
    .select("*, clients(id, name), periodic_invoice_schedule_line_items(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .order("line_no", {
      referencedTable: "periodic_invoice_schedule_line_items",
      ascending: true,
    })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return data as PeriodicScheduleWithClient & {
    periodic_invoice_schedule_line_items: PeriodicScheduleLineRow[];
  };
}
