/** Disposable responsive QA fixtures. Only the isolated local API at :58321 is allowed. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { writeFile, readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { manualReviewScaffold } from '../../src/lib/ai/estimates/lifecycle';
import { aiEstimateExtractionSchema } from '../../src/lib/ai/estimates/schemas';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const endpoint = new URL(url);
assert.ok(['localhost', '127.0.0.1'].includes(endpoint.hostname) && endpoint.port === '58321' && endpoint.protocol === 'http:', 'Only the isolated local QA API is allowed');
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.any([AbortSignal.timeout(15000), ...(init?.signal ? [init.signal] : [])]) }) },
});
const manifestPath = '/tmp/salesflow-misoca-qa/responsive-fixtures.json';
type FixtureIds = Record<string, string>;

function validatedReview(overrides: Record<string, unknown>) {
  const result = aiEstimateExtractionSchema.safeParse({
    ...manualReviewScaffold(typeof overrides.subject === 'string' ? overrides.subject : 'Synthetic QA estimate'),
    ...overrides,
  });
  assert.ok(result.success, result.error?.message ?? 'Fixture extraction must match the application schema');
  return result.data;
}

async function repairExtractions(ids: FixtureIds) {
  for (const sourceId of [ids.source, ids.originalSource].filter(Boolean)) {
    const existing = await retry('Read fixture extraction', () => admin.from('ai_estimate_extractions').select('extracted_data').eq('organization_id', ids.orgId).eq('source_id', sourceId).single());
    assert.ok(existing, 'Fixture extraction must exist');
    const extraction = validatedReview(existing.extracted_data);
    const updated = await retry('Repair fixture extraction', () => admin.from('ai_estimate_extractions').update({ extracted_data: extraction }).eq('organization_id', ids.orgId).eq('source_id', sourceId).select('extracted_data').single());
    assert.ok(aiEstimateExtractionSchema.safeParse(updated?.extracted_data).success, 'Stored fixture must pass the application schema');
  }
  console.log('Both QA review extractions repaired and schema validated.');
}

// Only idempotent requests use this retry helper; an uncertain write keeps its ID.
async function retry<T>(stage: string, request: () => PromiseLike<{ data: T; error: { code?: string; message?: string; status?: number; statusCode?: string | number } | null }>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await request();
      if (!result.error) return result.data;
      const timedOut = /TimeoutError|AbortError|fetch failed|timed out/i.test(result.error.message ?? '');
      const code = result.error.code || String(result.error.statusCode ?? result.error.status ?? (timedOut ? 'TIMEOUT' : 'API_ERROR'));
      if ((!timedOut && !['57014', 'PGRST003', 'PGRST000', '500', '502', '503', '504'].includes(code)) || attempt === 2) {
        throw new Error(`${stage}: ${code}`);
      }
    } catch (error) {
      if (!(error instanceof Error) || !['TimeoutError', 'AbortError', 'TypeError'].includes(error.name) || attempt === 2) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
  }
  throw new Error(`${stage}: retries exhausted`);
}

function syntheticEstimatePdf(): Buffer {
  const lines = [
    'SYNTHETIC QA ESTIMATE - NOT A CUSTOMER DOCUMENT',
    'Estimate number: QA-PDF-20260924',
    'Date: 2026-09-24',
    'Client: Responsive International Design Consulting',
    'Subject: Responsive application design',
    '',
    'Description                          Qty   Unit price    Amount (JPY)',
    'User interface design                 10        50000          500000',
    'Tablet and mobile verification         4        30000          120000',
    'Project discount                       1       -20000          -20000',
    '',
    'Subtotal (tax excluded):                                      600000',
    'Consumption tax (10%):                                         60000',
    'Total:                                                       660000',
    '',
    'This local fixture was prepared manually. No external AI was called.',
  ];
  const content = ['BT /F1 10 Tf 48 780 Td 22 TL', ...lines.map((line, i) => `${i ? 'T* ' : ''}(${line.replace(/[\\()]/g, '\\$&')}) Tj`), 'ET'].join('\n');
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>', `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function addOriginalFixture(ids: FixtureIds) {
  assert.ok(ids.userId && ids.orgId, 'Existing QA user and organization are required');
  const member = await retry('Verify QA membership', () => admin.from('organization_members').select('user_id').eq('organization_id', ids.orgId).eq('user_id', ids.userId).single());
  assert.ok(member, 'QA organization membership must exist');
  ids.originalSource ??= randomUUID();
  ids.originalExtraction ??= randomUUID();
  const path = `${ids.orgId}/${ids.originalSource}/original.pdf`;
  assert.ok(!ids.originalStoragePath || ids.originalStoragePath === path, 'Fixture original path must be canonical');
  ids.originalStoragePath = path;
  // Persist before Storage/DB writes so an interrupted attempt can be resumed/cleaned.
  await writeFile(manifestPath, JSON.stringify(ids, null, 2));
  const bytes = syntheticEstimatePdf();
  const bucket = admin.storage.from('ai-estimate-sources');
  // Re-uploading the same deterministic fixture bytes is safe after an uncertain response.
  await retry('Upload synthetic original', () => bucket.upload(path, bytes, { contentType: 'application/pdf', upsert: true }));
  const downloaded = await retry('Verify original bytes', () => bucket.download(path));
  assert.ok(downloaded && Buffer.from(await downloaded.arrayBuffer()).equals(bytes), 'Original must round-trip through the Storage API');
  await retry('Create original review source', () => admin.from('ai_estimate_sources').upsert({
    id: ids.originalSource, organization_id: ids.orgId, uploaded_by: ids.userId,
    source_type: 'upload', title: 'PDF 원본 검수 / Responsive application design',
    original_file_name: 'synthetic-responsive-estimate.pdf', storage_path: path,
    mime_type: 'application/pdf', file_size: bytes.length, file_hash: createHash('sha256').update(bytes).digest('hex'),
    visibility: 'organization', status: 'review_required',
  }, { onConflict: 'id', ignoreDuplicates: true }));
  await retry('Create original review extraction', () => admin.from('ai_estimate_extractions').upsert({
    id: ids.originalExtraction, organization_id: ids.orgId, source_id: ids.originalSource,
    provider: 'manual', source_of_truth: 'human', confidence: 1,
    extracted_data: validatedReview({
      documentNumber: 'QA-PDF-20260924', issueDate: '2026-09-24', subject: 'Responsive application design',
      clientName: 'Responsive International Design Consulting', currency: 'JPY', taxMode: 'excluded', confidence: 1,
      warnings: ['합성 QA 원본입니다. PDF 내용과 검수 항목을 비교해 주세요.'],
      lines: [
        { name: 'User interface design', qty: 10, unit: 'day', unitPrice: 50000, taxCategory: 'standard_10', confidence: 1, reason: 'Manually prepared synthetic fixture' },
        { name: 'Tablet and mobile verification', qty: 4, unit: 'day', unitPrice: 30000, taxCategory: 'standard_10', confidence: 1, reason: 'Manually prepared synthetic fixture' },
        { name: 'Project discount', qty: 1, unit: 'project', unitPrice: -20000, taxCategory: 'standard_10', confidence: 1, reason: 'Manually prepared synthetic fixture' },
      ],
    }),
  }, { onConflict: 'source_id', ignoreDuplicates: true }));
  const detail = await retry('Verify original review relation', () => admin.from('ai_estimate_sources').select('id,organization_id,status,storage_path,ai_estimate_extractions(source_id)').eq('id', ids.originalSource).single());
  assert.equal(detail?.organization_id, ids.orgId);
  assert.equal(detail?.storage_path, path);
  assert.ok(detail?.ai_estimate_extractions, 'Review extraction must be readable');
  console.log('Original PDF review fixture ready: ' + ids.originalSource);
}

async function main() {
if (process.argv.includes('--cleanup')) {
  const fixture = JSON.parse(await readFile(manifestPath, 'utf8')) as FixtureIds;
  if (fixture.originalStoragePath) {
    assert.equal(fixture.originalStoragePath, `${fixture.orgId}/${fixture.originalSource}/original.pdf`);
    await retry('Remove synthetic original', () => admin.storage.from('ai-estimate-sources').remove([fixture.originalStoragePath]));
  }
  for (const [table, key, value] of [['ai_estimate_sources', 'organization_id', fixture.orgId], ['organizations', 'id', fixture.orgId]]) {
    const { error } = await admin.from(table).delete().eq(key, value);
    assert.ifError(error);
  }
  const { error } = await admin.auth.admin.deleteUser(fixture.userId);
  assert.ifError(error);
  console.log('Responsive QA fixtures removed.');
} else if (process.argv.includes('--add-original')) {
  await addOriginalFixture(JSON.parse(await readFile(manifestPath, 'utf8')) as FixtureIds);
} else if (process.argv.includes('--repair-extractions')) {
  await repairExtractions(JSON.parse(await readFile(manifestPath, 'utf8')) as FixtureIds);
} else {
  const { data: user, error } = await admin.auth.admin.createUser({ email: 'qa@salesflow.test', password: 'SalesFlow-QA-2026!', email_confirm: true, user_metadata: { full_name: '반응형 QA Responsive' } });
  assert.ifError(error); assert.ok(user.user);
  const userId = user.user.id;
  const { data: member, error: memberError } = await admin.from('organization_members').select('organization_id').eq('user_id', userId).single();
  assert.ifError(memberError); const orgId = member!.organization_id;
  const ids: Record<string, string> = { userId, orgId };
  // Persist cleanup IDs before inserting anything else.
  await writeFile(manifestPath, JSON.stringify(ids, null, 2));
  async function insert(table: string, payload: Record<string, unknown>) {
    const id = randomUUID();
    const { error } = await admin.from(table).insert({ id, ...payload });
    if (error) throw new Error(table + ': ' + error.message);
    return id;
  }
  const long = 'ResponsiveInternationalDesignConsulting';
  ids.client = await insert('clients', { organization_id: orgId, name: long, department: '글로벌디지털프로덕트전략및사용자경험디자인사업부', email: 'responsive-long-customer-address@example.invalid', memo: '긴 메모 검증 '.repeat(25) });
  ids.item = await insert('items', { organization_id: orgId, name: long.repeat(5), unit: '人日', unit_price: 987654321, tax_category: 'standard_10' });
  for (const [table, lines, route] of [['estimates', 'estimate_line_items', 'estimate'], ['invoices', 'invoice_line_items', 'invoice'], ['delivery_notes', 'delivery_note_line_items', 'delivery'], ['receipts', 'receipt_line_items', 'receipt']]) {
    ids[route] = await insert(table, { organization_id: orgId, client_id: ids.client, document_number: 'QA-20260924-000000001', subject: '모바일 PC 전체 화면 검증 / ResponsiveInternationalDesignConsulting', issue_date: '2026-09-24', status: 'draft', tax_display: 'separate', tax_rounding: 'round_down', subtotal: 9876543210, tax_amount: 987654321, created_by: userId, recipient_snapshot: { clientName: long, addressLine1: long.repeat(3), contact: '테스트담당자', email: 'qa@example.invalid' }, sender_snapshot: { companyName: 'SalesFlow 반응형 검증', tel: '03-1234-5678', email: 'qa@example.invalid' }, remarks: 'LongUnbrokenRemark'.repeat(30), output_locale: 'ko' });
    await insert(lines, { document_id: ids[route], line_no: 1, name_snapshot: long.repeat(5), qty: 10, unit_snapshot: '人日', unit_price_snapshot: 987654321, tax_category: 'standard_10', tax_rate_snapshot: 0.1 });
  }
  for (const [table, key] of [['estimates', 'estimate'], ['invoices', 'invoice']]) {
    const token = randomUUID();
    const { error } = await admin.from('share_tokens').insert({ token, organization_id: orgId,
      target_table: table, target_id: ids[key], created_by: userId });
    assert.ifError(error);
    ids[key + 'Share'] = token;
  }
  ids.schedule = await insert('periodic_invoice_schedules', { organization_id: orgId, client_id: ids.client, subject: '정기청구 / ResponsiveInternationalDesignConsulting', start_date: '2026-10-01', day_value: 1, is_paused: true });
  await insert('periodic_invoice_schedule_line_items', { schedule_id: ids.schedule, line_no: 1, name_template: long.repeat(4), qty: 10, unit_price_snapshot: 987654321, tax_category: 'standard_10', tax_rate_snapshot: 0.1 });
  ids.order = await insert('orders', { organization_id: orgId, client_id: ids.client, order_number: 'QA-ORD-00000001', order_date: '2026-09-24', subject: long.repeat(4), comment: long.repeat(10), subtotal: 9876543210, tax_amount: 987654321 });
  ids.orderForm = await insert('order_forms', { organization_id: orgId, name: long.repeat(3), subject: '반응형 주문서 확인', public_token: randomUUID(), is_published: false });
  ids.inbox = await insert('inbox_messages', { organization_id: orgId, kind: 'system', subject: long.repeat(4), body: ('긴 메모 ' + long).repeat(30), payload: { from: 'very-long-responsive-sender@example.invalid', attachments: [{ id: 'qa-attachment', filename: long.repeat(4) + '.pdf', mimeType: 'application/pdf', size: 10240 }] } });
  ids.source = await insert('ai_estimate_sources', { organization_id: orgId, source_type: 'estimate', imported_estimate_id: ids.estimate, title: long.repeat(5), visibility: 'organization', status: 'review_required', uploaded_by: userId });
  await insert('ai_estimate_extractions', { organization_id: orgId, source_id: ids.source, extracted_data: validatedReview({ subject: '반응형 검증 견적', clientName: long, currency: 'JPY', taxMode: 'excluded', confidence: 1, warnings: ['긴 검토 경고 ' + long.repeat(6)], lines: [{ name: long.repeat(5), qty: 10, unit: '人日', unitPrice: 987654321, taxCategory: 'standard_10', confidence: 1, reason: long.repeat(5) }] }), confidence: 1, provider: 'manual', source_of_truth: 'human' });
  await writeFile(manifestPath, JSON.stringify(ids, null, 2));
  await addOriginalFixture(ids);
  console.log('Responsive QA fixtures ready: ' + manifestPath);
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
