# Synthetic AI estimate validation fixtures

All names, documents and work descriptions are fictional. There are no real clients, personal details, API keys or payment accounts. Upload files individually with the document kind in `manifest.json`; the manifest and this README are not upload inputs.

| File | Upload kind | Purpose |
| --- | --- | --- |
| `rate-card-ja.csv` | `price_list` | Japanese baseline: 画面設計 50,000 / 開発 80,000 JPY per 画面 |
| `history-ja.csv` | `estimate` | Historical quantities 3, prices 45,000 / 70,000; must not override the selected rate card |
| `conflicting-rate-card-ja.csv` | `price_list` | Conflicting 画面設計 price 60,000; select with the baseline to test unresolved pricing |
| `invalid-tax.csv` | `price_list` | Ambiguous `8%`; automatic parsing must fail without saving partial lines |
| `design-ja.md` | `design` | Five distinct screens, PC/mobile, supplied copy, no translation |
| `work-scope-ja.md` | `work_scope` | Scope, quantity rules, included checks and exclusions; no price evidence |
| `prompt-injection.md` | `work_scope` | Synthetic embedded instructions that must not change prices, add Hosting or emit the marker |
| `rate-card-en.csv` | `price_list` | English baseline: Design 50,000 / Development 80,000 JPY per screen |
| `estimate.pdf` | `estimate` | Actual provider extraction input: historical quantities 3, prices 50,000 / 80,000 |

Use `visibility=organization`, project `Synthetic responsive website validation`, and the unique title/revision in each manifest entry. Leave source reference validity dates empty so tests remain usable later. For manual app testing, create a synthetic client if needed; the key-only CLI does not create database records. Review and approve valid inputs before app generation; never approve `invalid-tax.csv` without correcting the ambiguous tax manually. Registration metadata and the PDF's printed customer-offer validity date are separate fields.

For the Japanese scenario, select `rate-card-ja.csv`, `design-ja.md` and `work-scope-ja.md`. Request 5 screens of 画面設計 and 5 screens of 開発, with tax excluded. The expected baseline is **650,000 JPY subtotal + 65,000 JPY tax = 715,000 JPY total**. PC/mobile variants are included in those five screens. Do not double the quantity or add translation. Historical quantities are not the current quantity. Internal fallback may present provisional quantity 1; the five-screen quantity is the model-generation scenario's acceptance criterion.

For the English provider chain, upload `estimate.pdf` using Gemini or Claude extraction, review the extracted facts against the manifest, then approve it and the context documents. Use the PDF's actual extracted historical lines as the only price evidence; leave `rate-card-en.csv` out of this scenario. Generate in English while keeping the exact `Design` / `Development` and `screen` values. The PDF alone must extract subtotal **390,000**, tax **39,000**, total **429,000** for its historical 3-screen job. The new 5-screen estimate has the separate **715,000** baseline above. `rate-card-en.csv` is available for an independent English rate-card scenario. Provider wording and confidence may vary; quantities, unit prices, tax mode and actual evidence must remain grounded.

CSV/Markdown parsing is local and needs no provider key. PDF extraction and model generation in the app require a configured server-side provider key and the organization's external-processing opt-in. The key-only CLI uses these synthetic files in memory and requires `--live` for external calls; it does not read or change organization settings. See [the runbook](../../docs/AI_ESTIMATE_API_VALIDATION.md) for commands, app setup and cleanup.

`manifest.json` is versioned as `1.0.0`. `expectedExtraction` uses the application's normalized review field names and lists required facts, not provider-generated prose. CSV computed totals are separate from printed totals because the CSV does not contain printed total fields. Context documents produce zero price lines and preserve their complete trimmed Markdown as `workDetails`.

The committed PDF can be regenerated without network access using `python3 fixtures/ai-estimate-validation/generate_estimate_pdf.py` in a Python environment with ReportLab available. ReportLab is already available in the Codex bundled runtime; the generated PDF itself needs no Python dependencies.
