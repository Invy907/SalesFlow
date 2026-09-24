"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage } from "@/contexts/language-context";
import { createInvoice } from "@/lib/actions/invoices";
import { downloadCsv } from "@/lib/csv";
import { computeDocumentTotals } from "@/lib/tax";
import { INVOICE_CSV_HEADERS, parseInvoiceCsv, type InvoiceCsvDocument, type InvoiceCsvIssue } from "@/lib/invoice-csv";
import { getInvoiceContent } from "../content";
import { InvoiceSubNav } from "../invoice-sub-nav";
import type { InvoiceFormInitial, InvoiceClientOption, InvoiceBankAccount } from "../invoice-form-client";

const content = {
  ja: {
    description: "SalesFlow専用のUTF-8 CSVを読み込み、内容を確認して請求書の下書きを作成します。同じinvoice_keyの行は1枚の請求書にまとまります。",
    format: "1ファイル1MB・50件まで、1請求書80明細まで。日付はYYYY-MM-DD、数量の空欄は1、単価は0以上の整数、税率は10 / R8 / 8 / 5 / 0。税の表示と端数処理は文書初期設定を適用します。",
    template: "CSVテンプレートをダウンロード", review: "取込内容の確認", create: "確認した下書きを作成", retry: "未作成の下書きを作成", created: "作成済み", ready: "作成待ち", failed: "作成失敗", unknown: "結果を確認できません。再取込の前に請求書一覧を確認してください。", list: "請求書一覧を確認", total: "合計", lines: "明細", row: "行", size: "1MB以下のUTF-8 CSVを選択してください。", loading: "処理中…", success: "作成済みの請求書は再実行の対象になりません。", columns: "列名（テンプレートの順序を変更しないでください）", columnNote: "invoice_keyは取込内でのグループキーです。請求書番号は保存時に採番します。client_nameは登録済み取引先と完全一致すれば紐付け、未登録の場合は宛名として保存します。", scope: "CSVの取込ではメール・郵送を送信しません。",
    issues: { headers: "テンプレートとヘッダーが一致しません。", quotes: "引用符が正しく閉じられていません。", empty: "明細がありません。", limit: "請求書は50件までです。", columns: "列数が一致しません。", required: "必須項目です。", date: "有効なYYYY-MM-DDの日付を入力してください。", number: "有効な数量・単価を入力してください。", tax: "税率は10 / R8 / 8 / 5 / 0です。", conflict: "同じキーの宛先・日付・件名が一致しません。", lines: "1請求書80明細までです。", length: "文字数の上限を超えています。" },
  },
  ko: {
    description: "SalesFlow 전용 UTF-8 CSV를 읽고 내용을 확인한 뒤 청구서 초안을 만듭니다. 같은 invoice_key의 행은 하나의 청구서로 묶입니다.",
    format: "파일 1MB·청구서 50건 이하, 청구서당 명세 80행 이하. 날짜는 YYYY-MM-DD, 수량 공란은 1, 단가는 0 이상의 정수, 세율은 10 / R8 / 8 / 5 / 0. 세금 표시와 반올림은 문서 기본 설정을 적용합니다.",
    template: "CSV 템플릿 다운로드", review: "가져올 내용 확인", create: "확인한 초안 생성", retry: "미생성 초안 생성", created: "생성 완료", ready: "생성 대기", failed: "생성 실패", unknown: "생성 결과를 확인할 수 없습니다. 다시 가져오기 전에 청구서 목록을 확인해 주세요.", list: "청구서 목록 확인", total: "합계", lines: "명세", row: "행", size: "1MB 이하 UTF-8 CSV 파일을 선택해 주세요.", loading: "처리 중…", success: "생성 완료한 청구서는 다시 실행해도 중복 생성하지 않습니다.", columns: "열 이름 (템플릿의 순서를 유지해 주세요)", columnNote: "invoice_key는 이번 가져오기 안의 그룹 키입니다. 청구서 번호는 저장 시 자동 생성합니다. client_name이 등록된 거래처명과 정확히 같으면 연결하며, 미등록 이름은 문서 수신자로 저장합니다.", scope: "CSV 가져오기는 이메일이나 우편을 발송하지 않습니다.",
    issues: { headers: "헤더가 템플릿과 일치하지 않습니다.", quotes: "따옴표가 올바르게 닫히지 않았습니다.", empty: "명세가 없습니다.", limit: "청구서는 50건까지 가능합니다.", columns: "열 개수가 일치하지 않습니다.", required: "필수 항목입니다.", date: "유효한 YYYY-MM-DD 날짜를 입력해 주세요.", number: "올바른 수량·단가를 입력해 주세요.", tax: "세율은 10 / R8 / 8 / 5 / 0입니다.", conflict: "같은 키의 거래처·날짜·제목이 다릅니다.", lines: "청구서당 명세 80행까지 가능합니다.", length: "최대 글자 수를 초과했습니다." },
  },
  en: {
    description: "Read a SalesFlow UTF-8 CSV, review it, and create invoice drafts. Rows sharing an invoice_key become one invoice.",
    format: "Maximum 1MB, 50 invoices, and 80 items per invoice. Dates: YYYY-MM-DD; blank quantity: 1; unit price: nonnegative integer; tax rate: 10 / R8 / 8 / 5 / 0. Tax display and rounding follow document defaults.",
    template: "Download CSV template", review: "Review import", create: "Create reviewed drafts", retry: "Create remaining drafts", created: "Created", ready: "Ready", failed: "Failed", unknown: "The outcome is unknown. Check the invoice list before importing again.", list: "Check invoice list", total: "Total", lines: "Items", row: "Row", size: "Choose a UTF-8 CSV file up to 1MB.", loading: "Processing…", success: "Successfully created invoices are skipped when retrying this import.", columns: "Column names (keep the template order)", columnNote: "invoice_key groups rows within this import. Invoice numbers are assigned on save. An exact, unique client_name match links the registered client; other names are saved as the recipient.", scope: "Importing CSV does not send email or postal mail.",
    issues: { headers: "Headers do not match the template.", quotes: "Invalid or unclosed quotation marks.", empty: "No line items found.", limit: "Up to 50 invoices are allowed.", columns: "Incorrect column count.", required: "This field is required.", date: "Enter a valid YYYY-MM-DD date.", number: "Enter a valid quantity or unit price.", tax: "Use 10 / R8 / 8 / 5 / 0 for tax rate.", conflict: "Recipient, dates, or subject differ for the same key.", lines: "Up to 80 items per invoice are allowed.", length: "The character limit was exceeded." },
  },
};

type ImportResult = { id?: string; error?: string; unknown?: boolean };

export function InvoiceCsvUploadClient({ initial, clients, bankAccounts }: { initial: InvoiceFormInitial; clients: InvoiceClientOption[]; bankAccounts: InvoiceBankAccount[] }) {
  const { lang } = useLanguage();
  const ui = getInvoiceContent(lang);
  const labels = content[lang];
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [documents, setDocuments] = useState<InvoiceCsvDocument[]>([]);
  const [issues, setIssues] = useState<InvoiceCsvIssue[]>([]);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<Record<string, ImportResult>>({});
  const [pending, setPending] = useState(false);
  const running = useRef(false);

  async function selectFile(file?: File) {
    setDocuments([]); setIssues([]); setResults({}); setMessage(""); setFilename(file?.name ?? "");
    if (!file) return;
    if (file.size > 1024 * 1024 || !file.name.toLowerCase().endsWith(".csv")) { setMessage(labels.size); return; }
    setPending(true);
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const parsed = parseInvoiceCsv(text);
      setDocuments(parsed.documents); setIssues(parsed.issues);
    } catch { setMessage(labels.size); }
    finally { setPending(false); }
  }

  async function createDrafts() {
    if (running.current || issues.length || !documents.length) return;
    running.current = true; setPending(true);
    try {
      for (const document of documents) {
        if (results[document.key]?.id || results[document.key]?.unknown) continue;
        const matches = clients.filter((client) => client.name === document.clientName);
        const client = matches.length === 1 ? matches[0] : undefined;
        try {
          const result = await createInvoice({
            clientId: client?.id ?? null,
            subject: document.subject,
            issueDate: new Date(`${document.issueDate}T00:00:00Z`),
            paymentDue: document.paymentDue ? new Date(`${document.paymentDue}T00:00:00Z`) : null,
            taxDisplay: initial.taxDisplay, taxRounding: initial.taxRounding, withholdingType: "none",
            templateKey: initial.templateKey, outputLocale: initial.outputLocale,
            clientHonorific: initial.clientHonorific ?? "onchu", showSeal: true,
            templateMessage: initial.templateMessage, remarks: initial.remarks,
            bankAccountIds: initial.bankAccountIds,
            recipientSnapshot: { clientName: document.clientName, companyName: document.clientName,
              postalCode: client?.postalCode ?? "", addressLine1: client?.addressLine1 ?? "",
              addressLine2: client?.addressLine2 ?? "", department: client?.department ?? "", phone: client?.phone ?? "" },
            senderSnapshot: { ...initial.sender, companyName: initial.senderCompanyName, bankAccounts: bankAccounts.filter((account) => initial.bankAccountIds.includes(account.id)).map((account) => account.label) },
            lineItems: document.lineItems,
          });
          setResults((current) => ({ ...current, [document.key]: result.ok ? { id: result.data } : { error: [result.error, ...Object.values(result.fieldErrors ?? {})].join(" · ") } }));
        } catch {
          setResults((current) => ({ ...current, [document.key]: { error: labels.unknown, unknown: true } }));
          break;
        }
      }
      router.refresh();
    } finally { running.current = false; setPending(false); }
  }

  const remaining = documents.filter((document) => !results[document.key]?.id && !results[document.key]?.unknown).length;
  const created = Object.values(results).filter((result) => result.id).length;
  return (
    <SalesFlowShell activeItem="invoices">
      <InvoiceSubNav active="csv_upload" />
      <div className="mx-auto max-w-[1260px] space-y-6 px-4 py-8 sm:px-6">
        <div><h1 className="text-2xl font-bold text-slate-900">{ui.csvUploadTitle}</h1><p className="mt-3 text-slate-600">{labels.description}</p></div>
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <button type="button" className="text-[#0A4D34] underline" onClick={() => downloadCsv("salesflow-invoices-template.csv", `${INVOICE_CSV_HEADERS.join(",")}\r\nA001,Sample client,${initial.issueDate.replace(/\//g, "-")},,Sample invoice,Sample service,1,pcs,1000,10\r\n`)}>{labels.template}</button>
          <p className="text-sm leading-6 text-slate-600">{labels.format}</p>
          <label className="block text-sm font-medium">{ui.csvUploadChoose}<input type="file" accept=".csv,text/csv" disabled={pending} onChange={(event) => void selectFile(event.target.files?.[0])} className="mt-2 block w-full rounded border border-slate-300 p-3" /></label>
          {filename && <p className="text-sm text-slate-500">{filename}</p>}
          {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
          {issues.length > 0 && <ul role="alert" className="max-h-56 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-red-600">{issues.map((issue, index) => <li key={index}>{labels.row} {issue.row} {issue.column && `· ${issue.column}`}: {labels.issues[issue.code]}</li>)}</ul>}
        </section>
        {documents.length > 0 && !issues.length && <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">{labels.review} · {documents.length}</h2>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50"><tr>{["invoice_key", ui.client, ui.issueDate, ui.subject, labels.lines, labels.total, ""].map((label) => <th key={label} className="border-b px-3 py-3">{label}</th>)}</tr></thead><tbody>{documents.map((document) => {
            const result = results[document.key];
            const total = computeDocumentTotals(document.lineItems, initial.taxRounding, { taxDisplay: initial.taxDisplay, documentType: "invoice" }).total;
            return <tr key={document.key}><td className="border-b px-3 py-3">{document.key}</td><td className="border-b px-3 py-3">{document.clientName}</td><td className="border-b px-3 py-3">{document.issueDate}</td><td className="border-b px-3 py-3"><details><summary className="cursor-pointer text-[#0A4D34]">{document.subject || labels.lines}</summary><div className="mt-2 space-y-2 text-xs text-slate-600"><p>{ui.paymentDue}: {document.paymentDue || "—"}</p>{document.lineItems.map((line, index) => <p key={index}>{line.name} · {line.qty} {line.unit} × ¥{line.unitPrice.toLocaleString()} · {line.taxCategory === "reduced_8" ? "R8" : `${line.taxRateSnapshot * 100}%`}</p>)}</div></details></td><td className="border-b px-3 py-3">{document.lineItems.length}</td><td className="border-b px-3 py-3 tabular-nums">¥{total.toLocaleString()}</td><td className="max-w-xs border-b px-3 py-3">{result?.id ? <Link className="text-[#0A4D34] underline" href={`/${lang}/invoices/${result.id}`}>{labels.created}</Link> : result?.error ? <span className="text-red-600">{labels.failed}: {result.error}</span> : labels.ready}</td></tr>;
          })}</tbody></table></div>
          <p className="mt-4 text-sm text-slate-500">{labels.scope}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" disabled={pending || !remaining} onClick={() => void createDrafts()} className="rounded bg-[#0A4D34] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? labels.loading : created ? labels.retry : labels.create} {remaining > 0 && `(${remaining})`}</button><Link href={`/${lang}/invoices`} className="text-[#0A4D34] underline">{labels.list}</Link></div>
          {created > 0 && <p role="status" className="mt-4 text-sm text-emerald-700">{labels.created}: {created} · {labels.success}</p>}
        </section>}
        <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"><h2 className="font-semibold">{labels.columns}</h2><p className="mt-3 break-words font-mono text-sm text-slate-700">{INVOICE_CSV_HEADERS.join(", ")}</p><p className="mt-3 text-sm leading-6 text-slate-600">{labels.columnNote}</p></section>
      </div>
    </SalesFlowShell>
  );
}
