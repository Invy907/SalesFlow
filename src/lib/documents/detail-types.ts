import type { SpreadsheetLineItem } from "./export-spreadsheet";
import type { ClientHonorific } from "./client-honorific";
import type { DocumentOutputLocale } from "./output-locale";

export type SalesDocumentDetail = {
  id: string;
  documentNumber: string;
  clientName: string;
  subject: string;
  issueDate: string;
  secondaryDate?: string;
  status: string;
  outputLocale: DocumentOutputLocale;
  showClientHonorific: boolean;
  /** 御中 / 様 / hidden */
  clientHonorific: ClientHonorific;
  templateMessage: string;
  remarks: string;
  subtotal: number;
  tax: number;
  total: number;
  lines: SpreadsheetLineItem[];
  recipient?: {
    postalCode: string;
    addressLine1: string;
    addressLine2: string;
    department: string;
    section: string;
    contact: string;
    phone: string;
  };
  /** Account text frozen when the invoice was saved. */
  bankAccounts?: string[];
  /** Whether the seal is stamped on this document */
  showSeal: boolean;
  sender: {
    companyName: string;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
    tel: string;
    fax?: string;
    email: string;
    registrationNumber?: string;
    /** Seal image (signed URL). Nothing is stamped without it. */
    sealUrl?: string | null;
  };
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
  bankAccountLabel?: string;
  registrationNumberLabel?: string;
  noLineItems: string;
  companyHonorific?: string;
  previewLead: string;
  backToList: string;
  exportAction: string;
  exportMenu: {
    download: string;
    excel: string;
    print: string;
    email?: string;
  };
  emailModal?: {
    title: string;
    description: string;
    fieldLabel: string;
    submit: string;
    success: string;
    toLabel: string;
    ccLabel: string;
    senderNameLabel: string;
    replyToLabel: string;
    subjectLabel: string;
    bodyLabel: string;
    attachmentLabel: string;
    attachmentHint: string;
    attachmentTooLarge: string;
    subjectTemplate: string;
    bodyTemplate: string;
  };
  actions: {
    downloaded: string;
    excelDownloaded: string;
    printing: string;
  };
};
