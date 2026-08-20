import { requireActiveOrg } from "@/lib/guards";
import { getClients } from "@/lib/db/clients";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ClientsTable, type ClientRow } from "./clients-table";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; page?: string; fav?: string }>;
}) {
  const { lang } = await params;
  const scope = await requireActiveOrg(lang);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const query = sp.q?.trim() || undefined;

  const { clients, total } = await getClients(scope.orgId, {
    query,
    page,
    pageSize: 30,
    favoritesOnly: sp.fav === "1",
  });

  const ids = clients.map((c) => c.id as string);
  const supabase = await getSupabaseServerClient();
  const { data: destinations } = ids.length
    ? await supabase
        .from("client_destinations")
        .select("*")
        .in("client_id", ids)
        .eq("is_default", true)
    : { data: [] };

  const destByClient = new Map<string, Record<string, unknown>>();
  for (const d of destinations ?? []) destByClient.set(d.client_id as string, d);

  const rows: ClientRow[] = clients.map((c) => {
    const d = destByClient.get(c.id as string);
    return {
      id: c.id as string,
      name: (c.name as string) ?? "",
      furigana: (c.furigana as string) ?? "",
      corpNumber: (c.corp_number as string) ?? "",
      managementCode: (c.management_code as string) ?? "",
      department: (c.department as string) ?? "",
      email: (c.email as string) ?? "",
      emailCc: ((c.email_cc as string[] | null) ?? []).join(", "),
      phone: (c.phone as string) ?? "",
      fax: (c.fax as string) ?? "",
      honorific: (c.honorific as string) ?? "",
      memo: (c.memo as string) ?? "",
      isFavorite: Boolean(c.is_favorite),
      destination: {
        postalCode: String(d?.postal_code ?? ""),
        addressLine1: String(d?.address_line1 ?? ""),
        addressLine2: String(d?.address_line2 ?? ""),
        mailingLine1: String(d?.mailing_line1 ?? ""),
        mailingLine2: String(d?.mailing_line2 ?? ""),
        mailingLine3: String(d?.mailing_line3 ?? ""),
        mailingLine4: String(d?.mailing_line4 ?? ""),
        honorific: String(d?.honorific ?? ""),
      },
    };
  });

  return (
    <ClientsTable
      rows={rows}
      total={total}
      page={page}
      pageSize={30}
      query={query ?? ""}
      favoritesOnly={sp.fav === "1"}
    />
  );
}
