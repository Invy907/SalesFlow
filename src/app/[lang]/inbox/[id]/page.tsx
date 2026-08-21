import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getInboxMessageById } from "@/lib/db/inbox";
import { InboxDetailClient, type InboxDetail } from "./inbox-detail-client";

export const dynamic = "force-dynamic";

export default async function InboxDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const scope = await requireActiveOrg(lang);
  const message = await getInboxMessageById(scope.orgId, id);
  if (!message) notFound();

  const payload = (message.payload ?? {}) as {
    from?: string;
    attachments?: Array<{ id: string; filename: string; mimeType: string; size: number }>;
  };

  const detail: InboxDetail = {
    id: message.id as string,
    kind: (message.kind as string) ?? "system",
    subject: (message.subject as string) ?? "",
    body: (message.body as string) ?? "",
    from: payload.from ?? "",
    createdAt: (message.created_at as string) ?? "",
    isRead: Boolean(message.read_at),
    attachments: payload.attachments ?? [],
  };

  return <InboxDetailClient detail={detail} />;
}
