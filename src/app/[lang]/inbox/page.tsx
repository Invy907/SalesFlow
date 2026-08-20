import { requireActiveOrg } from "@/lib/guards";
import { getInboxMessages } from "@/lib/db/inbox";
import { InboxList, type InboxMessageRow } from "./inbox-list";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string; unread?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const unreadOnly = sp.unread === "1";

  const { messages, total } = await getInboxMessages(scope.orgId, {
    page,
    pageSize: 30,
    unreadOnly,
  });

  const rows: InboxMessageRow[] = messages.map((m) => ({
    id: m.id as string,
    kind: (m.kind as string) ?? "system",
    subject: (m.subject as string) ?? "",
    createdAt: (m.created_at as string) ?? "",
    isRead: Boolean(m.read_at),
  }));

  return (
    <InboxList
      rows={rows}
      total={total}
      page={page}
      pageSize={30}
      unreadOnly={unreadOnly}
    />
  );
}
