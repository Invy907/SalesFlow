import type { SpreadsheetLineItem } from "./export-spreadsheet";

export type SalesDocumentDetail = {
  id: string;
  documentNumber: string;
  clientName: string;
  subject: string;
  issueDate: string;
  secondaryDate?: string;
  status: string;
  templateMessage: string;
  remarks: string;
  subtotal: number;
  tax: number;
  total: number;
  lines: SpreadsheetLineItem[];
  sender: { companyName: string; tel: string; email: string };
};

export type SalesDocumentDetailUi = {
  detailTitle: string;
  listTitle: string;
  documentNumberLabel: string;
  documentAmountLabel: string;
  client: string;
  subject: string;
  issueDate: string;
  secondaryDateLabel?: string;
  noDate: string;
  status: string;
  itemHeaders: readonly string[];
  subtotal: string;
  tax: string;
  total: string;
  remarks: string;
  noLineItems: string;
  companyHonorific?: string;
  previewLead: string;
  backToList: string;
  exportAction: string;
  exportMenu: {
    download: string;
    excel: string;
    print: string;
  };
  actions: {
    downloaded: string;
    excelDownloaded: string;
    printing: string;
  };
};
