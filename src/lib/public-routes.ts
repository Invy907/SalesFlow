/** Only the token-based document views are public; the RPC validates each token. */
export function isPublicDocumentPath(pathname: string): boolean {
  return /^\/(?:ja|en|ko)\/(?:estimates|invoices)\/shared\/[^/]+\/?$/.test(pathname);
}
