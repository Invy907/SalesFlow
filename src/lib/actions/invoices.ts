"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/db/organizations";
import { createInvoiceSchema, type CreateInvoiceInput } from "@/lib/validators/document";
import { hasContentLineItem } from "@/lib/validators/document";
import { computeDocumentTotals } from "@/lib/tax";
import { mapSalesDocumentDetail } from "@/lib/documents/map-document-detail";
import { getDocumentSealUrl } from "@/lib/documents/seal-url";
import type { SalesDocumentDetail } from "@/lib/documents/detail-types";
import { sendSalesDocumentEmail } from "@/lib/documents/send-document-email";
import type { DocumentEmailComposeInput } from "@/lib/documents/send-document-email";
import { getServerSiteUrl } from "@/lib/site-url.server";
import { newShareToken, shareExpiryFromNow } from "@/lib/share-tokens";
import { logInvoiceStatusEvent, markInvoiceIssued } from "@/lib/documents/invoice-status";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DOCUMENT_STATUSES = ["draft", "issued", "sent", "confirmed", "overdue"] as const;
type InvoiceStatus = (typeof DOCUMENT_STATUSES)[number];

function uniqueValidIds(ids: string[]): string[] {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return [...new Set(ids)].filter((id) => typeof id === "string" && UUID_RE.test(id));
}

export async function createInvoice(
  formData: CreateInvoiceInput,
): Promise<ActionResult<string>> {
  const parsed = createInvoiceSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = msgs?.[0] ?? "Invalid";
    }
    return { ok: false, error: "Validation failed", fieldErrors };
  }

  if (!hasContentLineItem(parsed.data.lineItems)) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: { lineItems: "明細を1行以上入力してください" },
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const requestedNumber = parsed.data.documentNumber?.trim() ?? "";
  let documentNumber = requestedNumber;
  if (requestedNumber) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from("invoices")
      .select("id")
      .eq("organization_id", org.organization_id)
      .eq("document_number", requestedNumber)
      .limit(1)
      .maybeSingle();
    if (duplicateError) return { ok: false, error: duplicateError.message };
    if (duplicate) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: { documentNumber: "この請求書番号はすでに使用されています" },
      };
    }
  } else {
    const { data: docNum, error: seqErr } = await supabase.rpc("next_document_number", {
      _org: org.organization_id,
      _doc_type: "invoice",
      _issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
    });
    if (seqErr) return { ok: false, error: seqErr.message };
    documentNumber = String(docNum ?? "");
  }

  const totals = computeDocumentTotals(parsed.data.lineItems, parsed.data.taxRounding);

  const { data: invoice, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      organization_id: org.organization_id,
      client_id: parsed.data.clientId ?? null,
      client_destination_id: parsed.data.clientDestinationId ?? null,
      document_number: documentNumber,
      subject: parsed.data.subject ?? null,
      issue_date: parsed.data.issueDate.toISOString().slice(0, 10),
      payment_due: parsed.data.paymentDue?.toISOString().slice(0, 10) ?? null,
      delivery_date: parsed.data.deliveryDate?.toISOString().slice(0, 10) ?? null,
      billing_month: parsed.data.billingMonth ?? null,
      status: "draft",
      tax_display: parsed.data.taxDisplay,
      tax_rounding: parsed.data.taxRounding,
      withholding_type: parsed.data.withholdingType,
      template_key: parsed.data.templateKey ?? null,
      output_locale: parsed.data.outputLocale,
      client_honorific: parsed.data.clientHonorific,
      show_seal: parsed.data.showSeal,
      // 기존 조회 코드 호환용으로 같은 뜻을 boolean 으로도 남긴다.
      show_client_honorific: parsed.data.clientHonorific !== "none",
      template_message: parsed.data.templateMessage ?? null,
      remarks: parsed.data.remarks ?? null,
      internal_memo: parsed.data.internalMemo ?? null,
      recipient_snapshot: parsed.data.recipientSnapshot ?? null,
      sender_snapshot: parsed.data.senderSnapshot ?? null,
      bank_account_ids: parsed.data.bankAccountIds ?? null,
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !invoice) return { ok: false, error: insertErr?.message ?? "Insert failed" };

  if (parsed.data.lineItems.length > 0) {
    const lines = parsed.data.lineItems.map((li, idx) => ({
      document_id: invoice.id,
      line_no: idx + 1,
      item_id: li.itemId ?? null,
      name_snapshot: li.name,
      qty: li.qty,
      unit_snapshot: li.unit ?? null,
      unit_price_snapshot: li.unitPrice,
      tax_category: li.taxCategory,
      tax_rate_snapshot: li.taxRateSnapshot,
      withholding_exempt_snapshot: li.withholdingExempt ?? null,
    }));

    const { error: lineErr } = await supabase.from("invoice_line_items").insert(lines);
    if (lineErr) return { ok: false, error: lineErr.message };
  }

  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: invoice.id };
}

/**
 * Read one invoice for the in-list preview, so the list can show the document
 * without navigating away. Uses the same mapper as the detail page.
 */
export async function getInvoicePreview(
  invoiceId: string,
): Promise<ActionResult<SalesDocumentDetail>> {
  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, clients(name), invoice_line_items(*)")
    .eq("id", invoiceId)
    .order("line_no", { referencedTable: "invoice_line_items", ascending: true })
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!invoice || invoice.organization_id !== org.organization_id) {
    return { ok: false, error: "Invoice not found" };
  }

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("company_name_line1, postal_code, address_line1, address_line2, address_line3, tel, fax, email, invoice_registration_number, seal_path")
    .eq("organization_id", org.organization_id)
    .maybeSingle();

  const selectedBankIds = (invoice.bank_account_ids as string[] | null) ?? [];
  const { data: bankRows } = selectedBankIds.length
    ? await supabase
        .from("bank_accounts")
        .select("id, bank_name, branch_name, account_number, account_holder")
        .eq("organization_id", org.organization_id)
        .in("id", selectedBankIds)
    : { data: [] };
  const bankAccounts = (bankRows ?? []).map((bank) =>
    [bank.bank_name, bank.branch_name, bank.account_number, bank.account_holder]
      .filter(Boolean)
      .join(" / "),
  );

  const detail = mapSalesDocumentDetail(
    { ...invoice, clients: invoice.clients } as Parameters<typeof mapSalesDocumentDetail>[0],
    invoice.invoice_line_items as Parameters<typeof mapSalesDocumentDetail>[1],
    {
      companyName: (profile?.company_name_line1 as string | null) ?? "",
      postalCode: (profile?.postal_code as string | null) ?? "",
      addressLine1: (profile?.address_line1 as string | null) ?? "",
      addressLine2: (profile?.address_line2 as string | null) ?? "",
      addressLine3: (profile?.address_line3 as string | null) ?? "",
      tel: (profile?.tel as string | null) ?? "",
      fax: (profile?.fax as string | null) ?? "",
      email: (profile?.email as string | null) ?? "",
      registrationNumber: (profile?.invoice_registration_number as string | null) ?? "",
      sealUrl:
        invoice.show_seal !== false
          ? await getDocumentSealUrl(profile?.seal_path as string | null)
          : null,
    },
    {
      secondaryDate: (invoice.payment_due as string | null) ?? undefined,
      bankAccounts,
    },
  );

  return { ok: true, data: detail };
}

export async function recordPayment(
  invoiceId: string,
  amount: number,
  method: "bank" | "card" | "cash" | "other",
  paidAt: string,
  memo?: string,
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: inv } = await supabase
    .from("invoices")
    .select("client_id, paid_amount")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { ok: false, error: "Invoice not found" };

  const { error } = await supabase.from("payments").insert({
    organization_id: org.organization_id,
    invoice_id: invoiceId,
    client_id: inv.client_id,
    paid_at: paidAt,
    amount,
    method,
    memo: memo ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const newPaid = (inv.paid_amount ?? 0) + amount;
  await supabase.from("invoices").update({ paid_amount: newPaid }).eq("id", invoiceId);

  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: undefined };
}

export async function sendInvoiceEmail(
  invoiceId: string,
  compose: DocumentEmailComposeInput,
): Promise<
  ActionResult<{
    messageId: string;
    shareToken: string;
    shareExpiresAt: string;
    shareUrl: string;
  }>
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const origin = await getServerSiteUrl();
  const result = await sendSalesDocumentEmail(supabase, {
    organizationId: org.organization_id,
    userId: user.id,
    origin,
    kind: "invoice",
    documentId: invoiceId,
    recipientEmail: compose.recipientEmail,
    compose,
  });

  if (result.ok) {
    // 依頼2 2): 請求書メールを送信したら発行済とみなす。
    await markInvoiceIssued(supabase, { orgId: org.organization_id, userId: user.id }, invoiceId, "email");
    revalidatePath("/[lang]/invoices", "page");
    revalidatePath(`/[lang]/invoices/${invoiceId}`, "page");
  }
  return result;
}

/**
 * 依頼2 2): 郵送手続き完了の記録。物理配送業者連携はまだ無いため、
 * 印刷して発送したことを記録する運用。
 */
export async function markInvoiceMailed(invoiceId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  await markInvoiceIssued(supabase, { orgId: org.organization_id, userId: user.id }, invoiceId, "mail");
  revalidatePath("/[lang]/invoices", "page");
  revalidatePath(`/[lang]/invoices/${invoiceId}`, "page");
  return { ok: true, data: undefined };
}

/** 依頼2 2): 共有可能なリンクを取得したら発行済とみなす。 */
export async function shareInvoice(
  invoiceId: string,
  days?: number,
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: existing } = await supabase
    .from("invoices")
    .select("share_token")
    .eq("id", invoiceId)
    .maybeSingle();

  if (existing?.share_token) {
    await supabase
      .from("share_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", existing.share_token);
  }

  const token = newShareToken();
  const expiresAt = shareExpiryFromNow(days);

  const { error } = await supabase.from("share_tokens").insert({
    token,
    organization_id: org.organization_id,
    target_table: "invoices",
    target_id: invoiceId,
    created_by: user.id,
    expires_at: expiresAt,
    revoked_at: null,
  });

  if (error) return { ok: false, error: error.message };

  await supabase.from("invoices").update({ share_token: token }).eq("id", invoiceId);
  await markInvoiceIssued(supabase, { orgId: org.organization_id, userId: user.id }, invoiceId, "share");

  revalidatePath("/[lang]/invoices", "page");
  revalidatePath(`/[lang]/invoices/${invoiceId}`, "page");
  return { ok: true, data: { token, expiresAt } };
}

export async function revokeShareInvoice(invoiceId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("share_token")
    .eq("id", invoiceId)
    .single();

  if (invoice?.share_token) {
    await supabase
      .from("share_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", invoice.share_token);
  }

  const { error } = await supabase
    .from("invoices")
    .update({ share_token: null })
    .eq("id", invoiceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/[lang]/invoices/${invoiceId}`, "page");
  return { ok: true, data: undefined };
}

/** 依頼2 3): 入金ステータス(payment_marked_at)の手動トグル。 */
export async function toggleInvoicePaymentFlag(invoiceId: string): Promise<ActionResult<boolean>> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const { data: current, error: readErr } = await supabase
    .from("invoices")
    .select("payment_marked_at")
    .eq("id", invoiceId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: "請求書が見つかりません" };

  const next = current.payment_marked_at ? null : new Date().toISOString();
  const { error } = await supabase.from("invoices").update({ payment_marked_at: next }).eq("id", invoiceId);
  if (error) return { ok: false, error: error.message };

  await logInvoiceStatusEvent(supabase, {
    orgId: org.organization_id,
    userId: user.id,
    invoiceId,
    statusType: "payment",
    previousValue: current.payment_marked_at ? "paid" : "unpaid",
    newValue: next ? "paid" : "unpaid",
    source: "manual",
  });

  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: Boolean(next) };
}

export async function bulkSetInvoicesStatus(
  ids: string[],
  status: InvoiceStatus,
): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "請求書が選択されていません" };
  if (!DOCUMENT_STATUSES.includes(status)) return { ok: false, error: "ステータスの指定が正しくありません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .in("id", validIds)
    .eq("organization_id", org.organization_id)
    .select("id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: { updated: data?.length ?? 0 } };
}

/** 依頼3: 체크박스 일괄 "処理済みにする". status を confirmed 로. */
export async function bulkMarkInvoicesProcessed(ids: string[]) {
  return bulkSetInvoicesStatus(ids, "confirmed");
}

/**
 * 依頼3: "未処理に戻す". 発行 배지(issued_marked_at)가 있으면 issued로, 없으면 draft로
 * 되돌린다(대상들의 발행 배지 상태가 다를 수 있어 건별로 계산한다).
 */
export async function bulkUnmarkInvoicesProcessed(ids: string[]): Promise<ActionResult<{ updated: number }>> {
  const validIds = uniqueValidIds(ids);
  if (validIds.length === 0) return { ok: false, error: "請求書が選択されていません" };

  const org = await getActiveOrganization();
  if (!org) return { ok: false, error: "No active organization" };

  const supabase = await getSupabaseServerClient();
  const { data: rows, error: readErr } = await supabase
    .from("invoices")
    .select("id, issued_marked_at")
    .in("id", validIds)
    .eq("organization_id", org.organization_id);
  if (readErr) return { ok: false, error: readErr.message };

  let updated = 0;
  for (const row of rows ?? []) {
    const { error } = await supabase
      .from("invoices")
      .update({ status: row.issued_marked_at ? "issued" : "draft" })
      .eq("id", row.id);
    if (!error) updated += 1;
  }

  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: { updated } };
}

export async function deleteInvoice(invoiceId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("invoices")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", invoiceId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/[lang]/invoices", "page");
  return { ok: true, data: undefined };
}
