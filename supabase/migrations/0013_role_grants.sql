-- 0013_role_grants.sql
-- The project was created with "Automatically expose new tables" off, so no
-- table privileges are handed to the API roles by default and RLS policies
-- alone are not enough: PostgREST would answer "permission denied for table".
-- Privileges are therefore granted explicitly, following the spec 7.3 matrix.
--
-- Any table added later needs its own GRANT here; nothing is automatic.

-- anon reaches data only through the security definer token RPCs.
grant usage on schema public to anon, authenticated, service_role;

-- Trusted server-side role: full access, RLS is bypassed by its bypassrls flag.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Org lifecycle is service-role work; members may read and rename.
grant select, update on public.organizations to authenticated;
grant select, update on public.profiles to authenticated;

grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.organization_invitations to authenticated;

-- Settings rows are seeded by handle_new_user; insert stays available so a
-- missing row can be repaired without service-role access.
grant select, insert, update on public.company_profiles to authenticated;
grant select, insert, update on public.document_defaults to authenticated;
grant select, insert, update on public.display_settings to authenticated;
grant select, insert, update on public.feature_flags to authenticated;

grant select, insert, update, delete on public.bank_accounts to authenticated;

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.client_destinations to authenticated;
grant select, insert, update, delete on public.items to authenticated;

grant select, insert, update, delete on public.estimates to authenticated;
grant select, insert, update, delete on public.estimate_line_items to authenticated;
grant select, insert, update, delete on public.delivery_notes to authenticated;
grant select, insert, update, delete on public.delivery_note_line_items to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_line_items to authenticated;
grant select, insert, update, delete on public.receipts to authenticated;
grant select, insert, update, delete on public.receipt_line_items to authenticated;

grant select, insert, update, delete on public.payments to authenticated;

grant select, insert, update, delete on public.order_statuses to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_line_items to authenticated;

grant select, insert, update, delete on public.order_forms to authenticated;
grant select, insert, update, delete on public.order_form_line_items to authenticated;

-- Rows are created by submit_public_order_form for unauthenticated visitors, so
-- members triage rather than insert.
grant select, update, delete on public.order_form_submissions to authenticated;

grant select, insert, update, delete on public.periodic_invoice_schedules to authenticated;
grant select, insert, update, delete on public.periodic_invoice_schedule_line_items to authenticated;

-- Delivered by the backend; the client only marks them read or clears them.
grant select, update, delete on public.inbox_messages to authenticated;
grant select, update on public.notifications to authenticated;

-- Metering and audit trails are append-only from the server's side.
grant select on public.usage_events to authenticated;
grant select on public.audit_log to authenticated;

-- Read access lets the UI show whether a document is currently shared.
grant select, insert, update, delete on public.share_tokens to authenticated;

grant select on public.estimates_trashed to authenticated;
grant select on public.delivery_notes_trashed to authenticated;
grant select on public.invoices_trashed to authenticated;
grant select on public.receipts_trashed to authenticated;
grant select on public.orders_trashed to authenticated;

-- document_sequences is reached only through next_document_number(), which is
-- security definer; leaving it ungranted keeps the counters tamper-proof.
revoke all on public.document_sequences from anon, authenticated;
