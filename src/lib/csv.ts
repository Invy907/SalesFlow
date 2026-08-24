/**
 * CSV 일괄 등록 화면(품목·거래처)이 공유하는 파서.
 * 원래 각 bulk 페이지에 같은 구현이 복사돼 있었다.
 */

/** CSV 한 줄 파싱. 따옴표 안의 쉼표와 이스케이프("")를 처리한다. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export type CsvDataRow = {
  /** 스프레드시트에서 보이는 행 번호(헤더가 1행). 에러 메시지에 그대로 쓴다. */
  row: number;
  cols: string[];
};

/** BOM 제거 → 빈 줄 제거 → 헤더 1행 스킵. */
export function parseCsvRows(text: string): CsvDataRow[] {
  const lines = text
    .replace(/^\ufeff/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  return lines.slice(1).map((line, idx) => ({ row: idx + 2, cols: parseCsvLine(line) }));
}

/** Excel 이 UTF-8 로 열도록 BOM 을 붙여 CSV 를 내려준다. */
export function downloadCsv(fileName: string, body: string, { bom = true } = {}) {
  const blob = new Blob([bom ? `\ufeff${body}` : body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
