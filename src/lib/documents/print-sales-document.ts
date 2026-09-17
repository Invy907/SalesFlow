const BODY_CLASS = "salesflow-printing-document";

/** Open the browser print dialog with only `.sales-document-print` visible. */
export function printSalesDocument(): void {
  if (typeof document === "undefined") return;

  document.body.classList.add(BODY_CLASS);

  const cleanup = () => {
    document.body.classList.remove(BODY_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}
