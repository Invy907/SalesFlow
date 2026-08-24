"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { BULK_CLIENT_MAX } from "@/lib/clients-bulk";
import {
  bulkClientRowSchema,
  createClientSchema,
  type BulkClientRow,
  type ClientDestinationInput,
  type CreateClientInput,
} from "@/lib/validators/client";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function parseEmailCc(value?: string): string[] | null {
  if (!value?.trim()) return null;
  const parts = value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function hasDestinationValue(dest: ClientDestinationInput): boolean {
  return Boolean(
    dest.postalCode?.trim() ||
      dest.addressLine1?.trim() ||
      dest.addressLine2?.trim() ||
      dest.mailingLine1?.trim() ||
      dest.mailingLine2?.trim() ||
      dest.mailingLine3?.trim() ||
      dest.mailingLine4?.trim() ||
      dest.honorific?.trim(),
  );
}

function destinationRow(dest: ClientDestinationInput) {
  return {
    postal_code: dest.postalCode?.trim() || null,
    address_line1: dest.addressLine1?.trim() || null,
    address_line2: dest.addressLine2?.trim() || null,
    mailing_line1: dest.mailingLine1?.trim() || null,
    mailing_line2: dest.mailingLine2?.trim() || null,
    mailing_line3: dest.mailingLine3?.trim() || null,
    mailing_line4: dest.mailingLine4?.trim() || null,
    honorific: dest.honorific?.trim() || null,
  };
}

export async function createClient(input: CreateClientInput): Promise<ActionResult<string>> {
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = msgs?.[0] ?? "Invalid";
    }
    return { ok: false, error: "Validation failed", fieldErrors };
  }

  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      organization_id: org.organization_id,
      name: parsed.data.name,
      furigana: parsed.data.furigana ?? null,
      corp_number: parsed.data.corpNumber ?? null,
      management_code: parsed.data.managementCode ?? null,
      department: parsed.data.department ?? null,
      email: parsed.data.email || null,
      email_cc: parseEmailCc(parsed.data.emailCc),
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      honorific: parsed.data.honorific ?? null,
      memo: parsed.data.memo ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };

  if (parsed.data.destination && hasDestinationValue(parsed.data.destination)) {
    const { error: destErr } = await supabase.from("client_destinations").insert({
      client_id: data.id,
      is_default: true,
      ...destinationRow(parsed.data.destination),
    });
    if (destErr) {
      await supabase.from("clients").delete().eq("id", data.id);
      return { ok: false, error: destErr.message };
    }
  }

  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: data.id };
}

export async function updateClient(
  clientId: string,
  input: Partial<CreateClientInput>,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.furigana !== undefined) updatePayload.furigana = input.furigana ?? null;
  if (input.corpNumber !== undefined) updatePayload.corp_number = input.corpNumber ?? null;
  if (input.managementCode !== undefined) updatePayload.management_code = input.managementCode ?? null;
  if (input.department !== undefined) updatePayload.department = input.department ?? null;
  if (input.email !== undefined) updatePayload.email = input.email || null;
  if (input.emailCc !== undefined) updatePayload.email_cc = parseEmailCc(input.emailCc);
  if (input.phone !== undefined) updatePayload.phone = input.phone ?? null;
  if (input.fax !== undefined) updatePayload.fax = input.fax ?? null;
  if (input.honorific !== undefined) updatePayload.honorific = input.honorific ?? null;
  if (input.memo !== undefined) updatePayload.memo = input.memo ?? null;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase.from("clients").update(updatePayload as never).eq("id", clientId);
    if (error) return { ok: false, error: error.message };
  }

  if (input.destination) {
    const dest = destinationRow(input.destination);
    const { data: existing } = await supabase
      .from("client_destinations")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_default", true)
      .maybeSingle();

    if (hasDestinationValue(input.destination)) {
      if (existing) {
        const { error: destErr } = await supabase
          .from("client_destinations")
          .update(dest)
          .eq("id", existing.id);
        if (destErr) return { ok: false, error: destErr.message };
      } else {
        const { error: destErr } = await supabase.from("client_destinations").insert({
          client_id: clientId,
          is_default: true,
          ...dest,
        });
        if (destErr) return { ok: false, error: destErr.message };
      }
    }
  }

  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: undefined };
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: undefined };
}

export async function toggleFavorite(
  clientId: string,
  isFavorite: boolean,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_favorite: isFavorite })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: undefined };
}

/* ── CSV 일괄 등록·업데이트 ─────────────────────────────────────────── */

const CLIENT_COLUMNS = [
  "name",
  "furigana",
  "corp_number",
  "management_code",
  "department",
  "email",
  "email_cc",
  "phone",
  "fax",
  "honorific",
  "memo",
] as const;

const CLIENT_SELECT =
  "id, name, furigana, corp_number, management_code, department, email, email_cc, phone, fax, honorific, memo";

const DESTINATION_COLUMNS = [
  "postal_code",
  "address_line1",
  "address_line2",
  "mailing_line1",
  "mailing_line2",
  "mailing_line3",
  "mailing_line4",
  "honorific",
] as const;

const DESTINATION_SELECT =
  "id, client_id, postal_code, address_line1, address_line2, mailing_line1, mailing_line2, mailing_line3, mailing_line4, honorific";

type Row = Record<string, unknown>;

/**
 * 빈 셀은 키 자체를 넣지 않는다. 갱신 시 "빈 칸 = 기존 값 유지" 가 되도록
 * 나중에 기존 행의 값으로 채운다.
 */
function bulkClientPayload(input: BulkClientRow): Row {
  const row: Row = { name: input.name.trim() };
  const put = (key: string, value: string | string[] | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") row[key] = value;
  };

  put("furigana", input.furigana?.trim());
  put("corp_number", input.corpNumber?.trim());
  put("management_code", input.managementCode?.trim());
  put("department", input.department?.trim());
  put("email", input.email?.trim());
  put("email_cc", parseEmailCc(input.emailCc));
  put("phone", input.phone?.trim());
  put("fax", input.fax?.trim());
  put("honorific", input.honorific?.trim());
  put("memo", input.memo?.trim());

  return row;
}

function bulkDestinationPayload(input: ClientDestinationInput): Row {
  const row: Row = {};
  const put = (key: string, value: string | undefined) => {
    if (value) row[key] = value;
  };

  put("postal_code", input.postalCode?.trim());
  put("address_line1", input.addressLine1?.trim());
  put("address_line2", input.addressLine2?.trim());
  put("mailing_line1", input.mailingLine1?.trim());
  put("mailing_line2", input.mailingLine2?.trim());
  put("mailing_line3", input.mailingLine3?.trim());
  put("mailing_line4", input.mailingLine4?.trim());
  put("honorific", input.honorific?.trim());

  return row;
}

/** PostgREST 는 배열 요소의 키가 모두 같아야 하므로 컬럼 집합을 통일한다. */
function mergeColumns(columns: readonly string[], incoming: Row, existing: Row | null): Row {
  const row: Row = {};
  for (const col of columns) {
    row[col] = col in incoming ? incoming[col] : (existing?.[col] ?? null);
  }
  return row;
}

/**
 * 관리 코드를 키로 기존 거래처는 갱신하고, 없으면 신규 등록한다.
 * 행 단위로 검증해 하나라도 실패하면 아무것도 쓰지 않는다(부분 성공 없음).
 */
export async function bulkUpsertClients(
  rows: BulkClientRow[],
): Promise<ActionResult<{ created: number; updated: number }>> {
  if (rows.length === 0) return { ok: false, error: "登録する取引先がありません" };
  if (rows.length > BULK_CLIENT_MAX) {
    return { ok: false, error: `一度に登録できるのは${BULK_CLIENT_MAX}件までです` };
  }

  const fieldErrors: Record<string, string> = {};
  const parsedRows: Array<{ row: number; client: Row; destination: Row | null; code: string | null }> = [];
  const seenCodes = new Map<string, number>();

  for (const r of rows) {
    const parsed = bulkClientRowSchema.safeParse(r);
    if (!parsed.success) {
      for (const [field, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
        fieldErrors[`${r.row}.${field}`] = msgs?.[0] ?? "Invalid";
      }
      continue;
    }

    const client = bulkClientPayload(parsed.data);
    const destination = parsed.data.destination
      ? bulkDestinationPayload(parsed.data.destination)
      : {};

    const code = typeof client.management_code === "string" ? client.management_code : null;
    if (code) {
      const firstRow = seenCodes.get(code);
      if (firstRow !== undefined) {
        fieldErrors[`${r.row}.managementCode`] = `${firstRow}行目と管理コードが重複しています`;
        continue;
      }
      seenCodes.set(code, r.row);
    }

    parsedRows.push({
      row: r.row,
      client,
      destination: Object.keys(destination).length > 0 ? destination : null,
      code,
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "CSVの内容を確認してください", fieldErrors };
  }

  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const codes = [...seenCodes.keys()];
  const existingByCode = new Map<string, Row>();
  if (codes.length > 0) {
    const { data, error } = await supabase
      .from("clients")
      .select(CLIENT_SELECT)
      .eq("organization_id", org.organization_id)
      .is("deleted_at", null)
      .in("management_code", codes);

    if (error) return { ok: false, error: error.message };
    for (const found of (data ?? []) as unknown as Row[]) {
      const code = found.management_code;
      if (typeof code === "string") existingByCode.set(code, found);
    }
  }

  const updateRows: Row[] = [];
  const insertRows: Row[] = [];
  const destinationOwners: Array<{ clientId: string; destination: Row }> = [];
  const insertedDestinations: Array<Row | null> = [];

  for (const p of parsedRows) {
    const existing = p.code ? existingByCode.get(p.code) : undefined;
    if (existing) {
      // upsert 는 INSERT 문이라 충돌 판정 전에 NOT NULL 과 RLS WITH CHECK 가 먼저
      // 평가된다. organization_id 를 빼면 갱신인데도 거기서 막힌다.
      updateRows.push({
        id: existing.id,
        organization_id: org.organization_id,
        ...mergeColumns(CLIENT_COLUMNS, p.client, existing),
      });
      if (p.destination) {
        destinationOwners.push({ clientId: existing.id as string, destination: p.destination });
      }
    } else {
      insertRows.push({
        organization_id: org.organization_id,
        ...mergeColumns(CLIENT_COLUMNS, p.client, null),
      });
      insertedDestinations.push(p.destination);
    }
  }

  if (updateRows.length > 0) {
    const { error } = await supabase.from("clients").upsert(updateRows as never);
    if (error) return { ok: false, error: error.message };
  }

  if (insertRows.length > 0) {
    const { data, error } = await supabase
      .from("clients")
      .insert(insertRows as never)
      .select("id");
    if (error) return { ok: false, error: error.message };

    const created = (data ?? []) as unknown as Row[];
    if (created.length !== insertRows.length) {
      return { ok: false, error: "取引先の登録件数が一致しません" };
    }

    created.forEach((client, index) => {
      const destination = insertedDestinations[index];
      if (destination) destinationOwners.push({ clientId: client.id as string, destination });
    });
  }

  if (destinationOwners.length > 0) {
    const { data, error } = await supabase
      .from("client_destinations")
      .select(DESTINATION_SELECT)
      .in("client_id", destinationOwners.map((owner) => owner.clientId))
      .eq("is_default", true);

    if (error) return { ok: false, error: error.message };

    const existingByClient = new Map<string, Row>();
    for (const found of (data ?? []) as unknown as Row[]) {
      existingByClient.set(found.client_id as string, found);
    }

    const destUpdates: Row[] = [];
    const destInserts: Row[] = [];

    for (const owner of destinationOwners) {
      const existing = existingByClient.get(owner.clientId);
      if (existing) {
        destUpdates.push({
          id: existing.id,
          client_id: owner.clientId,
          is_default: true,
          ...mergeColumns(DESTINATION_COLUMNS, owner.destination, existing),
        });
      } else {
        destInserts.push({
          client_id: owner.clientId,
          is_default: true,
          ...mergeColumns(DESTINATION_COLUMNS, owner.destination, null),
        });
      }
    }

    if (destUpdates.length > 0) {
      const { error: updateErr } = await supabase
        .from("client_destinations")
        .upsert(destUpdates as never);
      if (updateErr) return { ok: false, error: updateErr.message };
    }
    if (destInserts.length > 0) {
      const { error: insertErr } = await supabase
        .from("client_destinations")
        .insert(destInserts as never);
      if (insertErr) return { ok: false, error: insertErr.message };
    }
  }

  revalidatePath("/[lang]/clients", "page");
  return { ok: true, data: { created: insertRows.length, updated: updateRows.length } };
}
