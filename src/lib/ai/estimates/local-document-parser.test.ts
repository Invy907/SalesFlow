import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { parseLocalDocument, LocalDocumentParseError } from "./local-document-parser";
import { normalizeExtraction, toReviewExtraction } from "./batch/normalize";
import { validateExtraction } from "./batch/validate";
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const csv = (text: string, documentKind: "estimate" | "price_list" = "price_list") => parseLocalDocument({ data: new Blob([text]), mimeType: "text/csv", documentKind });
const rejects = (promise: Promise<unknown>, code: string) => assert.rejects(promise, (error: unknown) => error instanceof LocalDocumentParseError && error.code === code);
function workbook(sheets: unknown[][][]) {
  const book = XLSX.utils.book_new();
  sheets.forEach((rows, i) => XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), `Sheet${i + 1}`));
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
const parseXlsx = (bytes: Buffer) => parseLocalDocument({ data: new Blob([new Uint8Array(bytes)]), mimeType: mime, documentKind: "price_list" });

test("3언어 CSV 헤더·인용부호·엔단가·단가표 기본수량을 보존한다", async () => {
  for (const header of ["품목명,단위,단가,세율,수량,세금포함", "品目名,単位,単価,税率,数量,税込区分", "Item,Unit,Unit price,Tax rate,Quantity,Tax mode"]) {
    const result = await csv(`\uFEFF${header}\r\n"Design, A",page,"¥12,000",10%,,excluded\r\n`);
    assert.equal(result.lines[0].rawItemName, "Design, A");
    assert.equal(result.lines[0].quantity, 1);
    assert.equal(result.lines[0].unitPrice, 12000);
    assert.equal(result.totals.taxMode, "excluded");
    assert.equal(toReviewExtraction(normalizeExtraction(result), "Rates").documentKind, "price_list");
  }
});
test("견적 수량은 추정하지 않고 할인·경감세율은 명시된 경우 보존한다", async () => {
  await rejects(csv("Item,Unit,Unit price,Tax rate\nDiscount,set,-100,10%", "estimate"), "LOCAL_MISSING_HEADERS");
  const result = await csv("Item,Unit,Unit price,Tax rate,Quantity\nDiscount,set,-100,reduced_8,1", "estimate");
  const review = toReviewExtraction(normalizeExtraction(result), "Quote");
  assert.equal(review.lines[0].unitPrice, -100);
  assert.equal(review.lines[0].taxCategory, "reduced_8");
});
test("모호한 숫자·0단가·잘못된 인용부호·중복헤더·세율을 거부한다", async () => {
  for (const value of ["0", "", "1.5", "=100", "NaN", "1e3", '"1,20"']) await rejects(csv(`Item,Unit,Unit price,Tax rate\nDesign,page,${value},10%`), "LOCAL_INVALID_NUMBER");
  await rejects(csv('Item,Unit,Unit price,Tax rate\n"Unclosed,page,100,10%'), "LOCAL_INVALID_CSV");
  await rejects(csv("Item,Name,Unit,Unit price,Tax rate\nA,B,page,100,10%"), "LOCAL_DUPLICATE_HEADER");
  await rejects(csv("Item,Unit,Unit price,Tax rate\nA,page,100,8%"), "LOCAL_AMBIGUOUS_TAX");
});
test("CSV 80행은 모두 가져오고 81행은 부분 저장하지 않는다", async () => {
  const header = "Item,Unit,Unit price,Tax rate\n";
  const rows = Array.from({ length: 80 }, (_, i) => `Item ${i},page,100,10%`).join("\n");
  assert.equal((await csv(header + rows)).lines.length, 80);
  await rejects(csv(header + rows + "\nExtra,page,100,10%"), "LOCAL_TOO_MANY_ROWS");
});
test("TXT/MD는 가격행 없이 본문 보존, UTF-8과 16000자 경계를 검증한다", async () => {
  const parse = (data: Blob) => parseLocalDocument({ data, mimeType: "text/markdown", documentKind: "work_scope" });
  const result = await parse(new Blob(["# Scope\nDesign three screens.\nExclude hosting."]));
  assert.deepEqual(result.lines, []);
  assert.match(result.workDetails!, /Exclude hosting/);
  const review = toReviewExtraction(normalizeExtraction(result), "Scope");
  assert.equal(review.lines.length, 0);
  assert.equal(review.workDetails, result.workDetails);
  assert.equal(validateExtraction(result, { confidenceThreshold: 0.8, totalToleranceMinorUnits: 1 }).isStructurallyValid, true);
  assert.equal((await parse(new Blob(["a".repeat(16000)]))).workDetails?.length, 16000);
  await rejects(parse(new Blob(["a".repeat(16001)])), "LOCAL_TEXT_TOO_LONG");
  await rejects(parse(new Blob([new Uint8Array([0xff, 0xff])])), "LOCAL_INVALID_ENCODING");
  await rejects(parseLocalDocument({ data: new Blob(["Text"]), mimeType: "text/plain", documentKind: "price_list" }), "LOCAL_TEXT_REQUIRES_CONTEXT_KIND");
});
test("XLSX 모든 시트 합계80행·수식·압축확장 크기를 검증한다", async () => {
  const header = ["Item", "Unit", "Unit price", "Tax rate"];
  const result = await parseXlsx(workbook([[header, ["First", "page", 100, "10%"]], [header, ["Second", "page", 200, "0%"]]]));
  assert.deepEqual(result.lines.map((line) => line.rawItemName), ["First", "Second"]);
  const forty = Array.from({ length: 40 }, (_, i) => [`Item ${i}`, "page", 100, "10%"]);
  await rejects(parseXlsx(workbook([[header, ...forty], [header, ...forty, ["Extra", "page", 100, "10%"]]])), "LOCAL_TOO_MANY_ROWS");
  const book = XLSX.utils.book_new(), sheet = XLSX.utils.aoa_to_sheet([header, ["Formula", "page", 100, "10%"]]);
  sheet.C2 = { t: "n", v: 100, f: "50+50" }; XLSX.utils.book_append_sheet(book, sheet, "Rates");
  await rejects(parseXlsx(XLSX.write(book, { type: "buffer", bookType: "xlsx" })), "LOCAL_FORMULA_NOT_ALLOWED");
  const bytes = workbook([[header, ["Item", "page", 100, "10%"]]]);
  const central = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])); assert.ok(central > 0);
  bytes.writeUInt32LE(65 * 1024 * 1024, central + 24);
  await rejects(parseXlsx(bytes), "LOCAL_XLSX_TOO_COMPLEX");
});

test("XLSX 명시적 퍼센트 서식은 세율로 읽고 외화 표기는 거부한다", async () => {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["Item", "Unit", "Unit price", "Tax rate"], ["Item", "page", 1000, 0.1]]);
  sheet.D2.z = "0%"; XLSX.utils.book_append_sheet(book, sheet, "Rates");
  assert.equal((await parseXlsx(XLSX.write(book, { type: "buffer", bookType: "xlsx" }))).lines[0].printedTaxRatePercent, 10);
  await rejects(csv("Item,Unit,Unit price,Tax rate,Currency\nItem,page,100,10%,USD"), "LOCAL_UNSUPPORTED_CURRENCY");
});
