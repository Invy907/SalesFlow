import assert from "node:assert/strict";
import test from "node:test";
import { CLIENTS_TEMPLATE_COLUMNS, parseClientsCsv } from "./clients-bulk";

const header = CLIENTS_TEMPLATE_COLUMNS.join(",");

test("헤더를 건너뛰고 행 번호는 스프레드시트 기준으로 매긴다", () => {
  const rows = parseClientsCsv(`\ufeff${header}\r\nA社,,,,,,,,,,,,,,,,,,\r\nB社,,,,,,,,,,,,,,,,,,`);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].row, 2);
  assert.equal(rows[1].row, 3);
  assert.equal(rows[0].name, "A社");
});

test("빈 줄은 무시한다", () => {
  const rows = parseClientsCsv(`${header}\r\n\r\nA社,,,,,,,,,,,,,,,,,,\r\n\r\n`);
  assert.equal(rows.length, 1);
});

test("모든 열을 순서대로 매핑한다", () => {
  const cells = [
    "ラオン株式会社",
    "ラオン",
    "CODE-1",
    "1234567890123",
    "営業部 田中",
    "a@example.com",
    "b@example.com;c@example.com",
    "0312345678",
    "0387654321",
    "御中",
    "100-0001",
    "東京都千代田区",
    "1-2-3 ラオンビル",
    "ラオン株式会社",
    "営業部",
    "第一課",
    "田中太郎",
    "様",
    "備考メモ",
  ];
  const [row] = parseClientsCsv(`${header}\r\n${cells.join(",")}`);

  assert.equal(row.name, "ラオン株式会社");
  assert.equal(row.furigana, "ラオン");
  assert.equal(row.managementCode, "CODE-1");
  assert.equal(row.corpNumber, "1234567890123");
  assert.equal(row.department, "営業部 田中");
  assert.equal(row.email, "a@example.com");
  assert.equal(row.emailCc, "b@example.com;c@example.com");
  assert.equal(row.phone, "0312345678");
  assert.equal(row.fax, "0387654321");
  assert.equal(row.honorific, "御中");
  assert.equal(row.memo, "備考メモ");
  assert.deepEqual(row.destination, {
    postalCode: "100-0001",
    addressLine1: "東京都千代田区",
    addressLine2: "1-2-3 ラオンビル",
    mailingLine1: "ラオン株式会社",
    mailingLine2: "営業部",
    mailingLine3: "第一課",
    mailingLine4: "田中太郎",
    honorific: "様",
  });
});

test("따옴표 안의 쉼표와 이스케이프를 처리한다", () => {
  const [row] = parseClientsCsv(`${header}\r\n"A社, B事業部",,,,"1課, 2課",,,,,,,,,,,,,,"""引用"" あり"`);

  assert.equal(row.name, "A社, B事業部");
  assert.equal(row.department, "1課, 2課");
  assert.equal(row.memo, '"引用" あり');
});

test("짧은 행의 누락된 열은 빈 문자열로 채운다", () => {
  const [row] = parseClientsCsv(`${header}\r\nA社,,CODE-9`);

  assert.equal(row.managementCode, "CODE-9");
  assert.equal(row.memo, "");
  assert.equal(row.destination?.postalCode, "");
});
