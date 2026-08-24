/**
 * 거래처 CSV 일괄 등록·업데이트의 계약(템플릿 열 순서·상한·파서).
 * 서버 액션 파일("use server")은 async 함수만 export 할 수 있어서 여기로 분리했다.
 */

import { parseCsvRows } from "@/lib/csv";
import type { BulkClientRow } from "@/lib/validators/client";

export const BULK_CLIENT_MAX = 1000;

/** 템플릿 열 순서. 파싱은 헤더 이름이 아니라 이 순서를 기준으로 한다. */
export const CLIENTS_TEMPLATE_COLUMNS = [
  "取引先名",
  "フリガナ",
  "管理コード",
  "法人番号",
  "部署・担当者",
  "メールアドレス",
  "メールアドレス(CC)",
  "電話番号",
  "FAX番号",
  "敬称",
  "郵便番号",
  "住所1",
  "住所2",
  "郵送先1",
  "郵送先2",
  "郵送先3",
  "郵送先4",
  "郵送先敬称",
  "メモ",
] as const;

export function parseClientsCsv(text: string): BulkClientRow[] {
  return parseCsvRows(text).map(({ row, cols }) => {
    const at = (index: number) => cols[index] ?? "";
    return {
      row,
      name: at(0),
      furigana: at(1),
      managementCode: at(2),
      corpNumber: at(3),
      department: at(4),
      email: at(5),
      emailCc: at(6),
      phone: at(7),
      fax: at(8),
      honorific: at(9),
      memo: at(18),
      destination: {
        postalCode: at(10),
        addressLine1: at(11),
        addressLine2: at(12),
        mailingLine1: at(13),
        mailingLine2: at(14),
        mailingLine3: at(15),
        mailingLine4: at(16),
        honorific: at(17),
      },
    };
  });
}
