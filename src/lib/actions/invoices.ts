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

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

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
    revalidatePath(`/[lang]/invoices/${invoiceId}`, "page");
  }
  return result;
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
