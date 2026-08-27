import type { SalesDocumentDetailUi } from "./detail-types";
import { getDocumentExportUiLabels } from "./export-ui-labels";

type InvoiceContentSlice = {
  listTitle: string;
  detailTitle: string;
  invoiceNumber: string;
  client: string;
  subject: string;
  issueDate: string;
  paymentDue: string;
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
  invoiceAmount: string;
  exportMenuEmail?: string;
  emailModal?: {
    title: string;
    description: string;
    fieldLabel: string;
    submit: string;
    success: string;
  };
};

export function buildInvoiceDetailUi(locale: string, ui: InvoiceContentSlice): SalesDocumentDetailUi {
  const exportUi = getDocumentExportUiLabels(locale);
  return {
    detailTitle: ui.detailTitle,
    listTitle: ui.listTitle,
    documentNumberLabel: ui.invoiceNumber,
    documentAmountLabel: ui.invoiceAmount,
    client: ui.client,
    subject: ui.subject,
    issueDate: ui.issueDate,
    secondaryDateLabel: ui.paymentDue,
    noDate: ui.noDate,
    status: ui.status,
    itemHeaders: ui.itemHeaders,
    subtotal: ui.subtotal,
    tax: ui.tax,
    total: ui.total,
    remarks: ui.remarks,
    noLineItems: ui.noLineItems,
    companyHonorific: ui.companyHonorific,
    previewLead: ui.previewLead,
    backToList: ui.backToList,
    exportAction: exportUi.exportAction,
    exportMenu: {
      ...exportUi.exportMenu,
      email: ui.exportMenuEmail,
    },
    emailModal: ui.emailModal,
    actions: exportUi.actions,
  };
}

type DeliveryNoteContentSlice = {
  listTitle: string;
  detailTitle: string;
  deliveryNumber: string;
  client: string;
  subject: string;
  issueDate: string;
  deliveryDate: string;
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
  deliveryAmount: string;
};

export function buildDeliveryNoteDetailUi(
  locale: string,
  ui: DeliveryNoteContentSlice,
): SalesDocumentDetailUi {
  const exportUi = getDocumentExportUiLabels(locale);
  return {
    detailTitle: ui.detailTitle,
    listTitle: ui.listTitle,
    documentNumberLabel: ui.deliveryNumber,
    documentAmountLabel: ui.deliveryAmount,
    client: ui.client,
    subject: ui.subject,
    issueDate: ui.issueDate,
    secondaryDateLabel: ui.deliveryDate,
    noDate: ui.noDate,
    status: ui.status,
    itemHeaders: ui.itemHeaders,
    subtotal: ui.subtotal,
    tax: ui.tax,
    total: ui.total,
    remarks: ui.remarks,
    noLineItems: ui.noLineItems,
    companyHonorific: ui.companyHonorific,
    previewLead: ui.previewLead,
    backToList: ui.backToList,
    exportAction: exportUi.exportAction,
    exportMenu: exportUi.exportMenu,
    actions: exportUi.actions,
  };
}

type ReceiptContentSlice = {
  listTitle: string;
  detailTitle: string;
  receiptNumber: string;
  client: string;
  subject: string;
  issueDate: string;
  transactionDate: string;
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
  receiptAmount: string;
};

export function buildReceiptDetailUi(locale: string, ui: ReceiptContentSlice): SalesDocumentDetailUi {
  const exportUi = getDocumentExportUiLabels(locale);
  return {
    detailTitle: ui.detailTitle,
    listTitle: ui.listTitle,
    documentNumberLabel: ui.receiptNumber,
    documentAmountLabel: ui.receiptAmount,
    client: ui.client,
    subject: ui.subject,
    issueDate: ui.issueDate,
    secondaryDateLabel: ui.transactionDate,
    noDate: ui.noDate,
    status: ui.status,
    itemHeaders: ui.itemHeaders,
    subtotal: ui.subtotal,
    tax: ui.tax,
    total: ui.total,
    remarks: ui.remarks,
    noLineItems: ui.noLineItems,
    companyHonorific: ui.companyHonorific,
    previewLead: ui.previewLead,
    backToList: ui.backToList,
    exportAction: exportUi.exportAction,
    exportMenu: exportUi.exportMenu,
    actions: exportUi.actions,
  };
}

type EstimateContentSlice = {
  listTitle: string;
  detailTitle: string;
  estimateNumber: string;
  client: string;
  subject: string;
  issueDate: string;
  expiryDate: string;
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
  estimateAmount: string;
};

export function buildEstimateDetailUi(
  locale: string,
  ui: EstimateContentSlice,
): SalesDocumentDetailUi {
  const exportUi = getDocumentExportUiLabels(locale);
  return {
    detailTitle: ui.detailTitle,
    listTitle: ui.listTitle,
    documentNumberLabel: ui.estimateNumber,
    documentAmountLabel: ui.estimateAmount,
    client: ui.client,
    subject: ui.subject,
    issueDate: ui.issueDate,
    secondaryDateLabel: ui.expiryDate,
    noDate: ui.noDate,
    status: ui.status,
    itemHeaders: ui.itemHeaders,
    subtotal: ui.subtotal,
    tax: ui.tax,
    total: ui.total,
    remarks: ui.remarks,
    noLineItems: ui.noLineItems,
    companyHonorific: ui.companyHonorific,
    previewLead: ui.previewLead,
    backToList: ui.backToList,
    exportAction: exportUi.exportAction,
    exportMenu: exportUi.exportMenu,
    actions: exportUi.actions,
  };
}
