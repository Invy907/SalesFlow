const STATUS_STYLE = {
  uploaded: "bg-slate-100 text-slate-700",
  processing: "bg-blue-100 text-blue-700",
  review_required: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  excluded: "bg-slate-200 text-slate-500",
} as const;

const STATUS_LABEL = {
  ja: { uploaded: "アップロード済み", processing: "分析中", review_required: "確認が必要", approved: "承認済み", failed: "失敗", excluded: "除外" },
  ko: { uploaded: "업로드됨", processing: "분석 중", review_required: "검수 필요", approved: "승인됨", failed: "실패", excluded: "제외" },
  en: { uploaded: "Uploaded", processing: "Processing", review_required: "Review needed", approved: "Approved", failed: "Failed", excluded: "Excluded" },
} as const;

export function AiSourceStatusBadge({
  status,
  lang,
}: {
  status: keyof typeof STATUS_STYLE;
  lang: keyof typeof STATUS_LABEL;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[lang][status]}
    </span>
  );
}
