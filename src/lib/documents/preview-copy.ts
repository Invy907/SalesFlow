export type DocumentPreviewCopy = {
  seal: string;
  itemName: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  receiptTitle: string;
  receiptAmountLabel: string;
  envelopePostalCode: string;
  envelopeAddress: string;
  envelopeRecipient: string;
  footerService: string;
};

const ko: DocumentPreviewCopy = {
  seal: "인감",
  itemName: "품번·품명",
  quantity: "수량",
  unitPrice: "단가",
  amount: "금액",
  subtotal: "소계",
  tax: "부가세(10%)",
  total: "합계",
  receiptTitle: "영수증",
  receiptAmountLabel: "영수 금액",
  envelopePostalCode: "〒462-0000",
  envelopeAddress: "아이치현 나고야시 4호",
  envelopeRecipient: "샘플 주식회사 귀중",
  footerService: "℗ SalesFlow · {document} 작성 서비스",
};

const ja: DocumentPreviewCopy = {
  seal: "認印",
  itemName: "品番・品名",
  quantity: "数量",
  unitPrice: "単価",
  amount: "金額",
  subtotal: "小計",
  tax: "消費税（10%）",
  total: "合計",
  receiptTitle: "領収書",
  receiptAmountLabel: "領収金額",
  envelopePostalCode: "〒462-0000",
  envelopeAddress: "愛知県名古屋市 4号",
  envelopeRecipient: "サンプル株式会社 様",
  footerService: "℗ SalesFlow · {document}作成サービス",
};

const en: DocumentPreviewCopy = {
  seal: "Seal",
  itemName: "Item no. / name",
  quantity: "Qty",
  unitPrice: "Unit price",
  amount: "Amount",
  subtotal: "Subtotal",
  tax: "Tax (10%)",
  total: "Total",
  receiptTitle: "Receipt",
  receiptAmountLabel: "Amount received",
  envelopePostalCode: "〒462-0000",
  envelopeAddress: "4, Nagoya, Aichi",
  envelopeRecipient: "Sample Corporation",
  footerService: "℗ SalesFlow · {document} service",
};

const COPY = { ko, ja, en } as const;

export function getDocumentPreviewCopy(locale: string): DocumentPreviewCopy {
  return COPY[locale as keyof typeof COPY] ?? ja;
}

export function formatPreviewFooter(copy: DocumentPreviewCopy, document: string): string {
  return copy.footerService.replace("{document}", document);
}
