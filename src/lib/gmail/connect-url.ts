export function getGmailConnectUrl(lang: string) {
  return `/api/gmail/connect?lang=${encodeURIComponent(lang)}`;
}
