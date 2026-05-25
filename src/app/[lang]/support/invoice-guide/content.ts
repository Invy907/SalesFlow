import type { AppLocale } from "@/contexts/language-context";

export type GuideTabKey = "basic" | "recipient" | "payment" | "tax" | "template";

export type GuideTip = {
  label: string;
  tip: string;
  required?: boolean;
};

export type GuideSection = {
  title: string;
  tips: GuideTip[];
};

const labels = {
  ja: {
    title: "請求書の作り方",
    intro:
      "新規作成画面と同じタブ構成で、各項目の入力ポイントを説明します。迷ったらこの順番で進めてください。",
    backToSupport: "サポートに戻る",
    createInvoice: "請求書を新規作成",
    legalTitle: "法令上の必須項目（5項目）",
    legalIntro:
      "国税庁では、適格請求書等の記載事項として次の5項目が求められています。",
    legalLink: "国税庁の案内を見る",
    legalItems: [
      "書類作成者の氏名又は名称",
      "取引年月日",
      "取引内容",
      "取引金額（税込み）",
      "書類の交付を受ける事業者の氏名又は名称",
    ],
    legalNote:
      "SalesFlowでは「基本情報」タブから順に入力すれば、これらを自然に満たせます。",
    sidebarTitle: "入力チェックリスト",
    sidebarHint: "保存前に確認",
    tabContent: {
      basic: {
        sections: [
          {
            title: "請求情報",
            tips: [
              {
                label: "取引先",
                required: true,
                tip: "会社名・屋号を正確に入力し、敬称（御中・様）を取引先の慣習に合わせて選びましょう。",
              },
              {
                label: "請求日",
                required: true,
                tip: "いつの取引に対する請求かが分かる日付を選びます。後から検索・管理しやすくなります。",
              },
              {
                label: "お支払い期限",
                tip: "取引先と事前に確認した日付を入力します。未確認のまま決めないようにしましょう。",
              },
              {
                label: "請求書番号",
                required: true,
                tip: "設定画面で形式を決めておくと、毎回の入力が楽になります。重複しない番号を使いましょう。",
              },
              {
                label: "件名",
                tip: "何の請求かが一目で分かる内容にします。社内メモ用ではなく、相手向けの説明として書きましょう。",
              },
            ],
          },
          {
            title: "請求元情報",
            tips: [
              {
                label: "自社名",
                required: true,
                tip: "請求書に表示される正式名称を入力します。登録情報と一致させると後からの照合がしやすくなります。",
              },
              {
                label: "詳細（住所, 連絡先など）",
                tip: "相手が問い合わせや振込確認をしやすいよう、住所・電話番号・メールを漏れなく入力しましょう。",
              },
            ],
          },
          {
            title: "品目・金額",
            tips: [
              {
                label: "品番・品名",
                required: true,
                tip: "相手の発注内容と一致する名称にします。略語だけにせず、内容が伝わる表現を心がけましょう。",
              },
              {
                label: "数量・単価",
                required: true,
                tip: "見積書や契約と数字がずれていないか、保存前にもう一度確認します。",
              },
              {
                label: "小計・消費税・合計",
                required: true,
                tip: "税区分と端数処理は取引先のルールに合わせます。不明な場合は先に確認してから入力しましょう。",
              },
              {
                label: "備考",
                tip: "振込先の補足や特記事項があれば記載します。長文より、相手が読みやすい要点を優先しましょう。",
              },
            ],
          },
        ],
      },
      recipient: {
        sections: [
          {
            title: "送付先",
            tips: [
              {
                label: "郵便番号・住所",
                tip: "郵送する場合は必須です。郵便番号から住所検索を使うと入力ミスを減らせます。",
              },
              {
                label: "名前",
                tip: "封筒宛名の1行目は特に重要です。部署名・担当者名まで正確に入力しましょう。",
              },
              {
                label: "請求月の表示",
                tip: "月次請求の場合、請求月を表示すると相手側の経理処理がスムーズになります。",
              },
            ],
          },
        ],
        note:
          "メール送付のみの場合でも、送付先を登録しておくと次回以降の作成が早くなります。",
      },
      payment: {
        sections: [
          {
            title: "決済オプション",
            tips: [
              {
                label: "カード決済+ / 出し払い+",
                tip: "取引先が利用できる決済方法か事前に確認してから有効にしましょう。",
              },
            ],
          },
          {
            title: "お振込先",
            tips: [
              {
                label: "銀行口座",
                required: true,
                tip: "支店名・口座種別・番号・名義を正確に入力します。名義のカタカナ表記も確認しましょう。",
              },
              {
                label: "振込手数料",
                tip: "先方負担か自社負担か、取引開始前に決めておくとトラブルを防げます。",
              },
            ],
          },
        ],
      },
      tax: {
        sections: [
          {
            title: "消費税設定",
            tips: [
              {
                label: "税別 / 税込表示",
                tip: "取引先の経理ルールに合わせて選びます。迷ったら先方に確認するのが確実です。",
              },
              {
                label: "消費税端数処理",
                tip: "切り捨てが多い業界もありますが、契約内容に合わせて設定しましょう。",
              },
            ],
          },
          {
            title: "源泉徴収",
            tips: [
              {
                label: "源泉徴収税種別",
                tip: "該当する取引かどうかを確認してから設定します。不明な場合は税理士や取引先に相談しましょう。",
              },
            ],
          },
        ],
        note: "初期値は設定画面の「課税設定」で変更できます。",
      },
      template: {
        sections: [
          {
            title: "テンプレート",
            tips: [
              {
                label: "レイアウト選択",
                tip: "自社のブランドや取引先の好みに合うテンプレートを選びます。プレビューで見た目を確認してから決めましょう。",
              },
            ],
          },
          {
            title: "保存後の送付",
            tips: [
              {
                label: "メール送付",
                tip: "PDFを添付して送る場合、件名と本文に請求書番号・金額・期限を明記すると確認が早くなります。",
              },
              {
                label: "郵送",
                tip: "封筒宛名プレビューと請求書内容の宛名が一致しているか、印刷前に必ず確認しましょう。",
              },
              {
                label: "PDF / 印刷",
                tip: "社内承認や控え保管用にPDFを保存しておくと、後からの問い合わせ対応が楽になります。",
              },
            ],
          },
        ],
        caution:
          "最も多いトラブルは、金額・期限・振込先の事前確認漏れです。保存前にもう一度見直しましょう。",
      },
    },
    ntaLink:
      "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/sonota/calculator/invoice/index.htm",
  },
  ko: {
    title: "청구서 작성 방법",
    intro:
      "신규 작성 화면과 같은 탭 구성으로 각 항목 입력 포인트를 설명합니다. 막히면 이 순서대로 진행하세요.",
    backToSupport: "지원으로 돌아가기",
    createInvoice: "청구서 신규 작성",
    legalTitle: "법령상 필수 항목(5가지)",
    legalIntro: "국세청에서는 적격 청구서 등에 아래 5가지 항목 기재를 요구합니다.",
    legalLink: "국세청 안내 보기",
    legalItems: [
      "서류 작성자의 성명 또는 명칭",
      "거래 연월일",
      "거래 내용",
      "거래 금액(세금 포함)",
      "서류를 교부받는 사업자의 성명 또는 명칭",
    ],
    legalNote: "SalesFlow에서는 「기본 정보」 탭부터 순서대로 입력하면 자연스럽게 충족할 수 있습니다.",
    sidebarTitle: "입력 체크리스트",
    sidebarHint: "저장 전 확인",
    tabContent: {
      basic: {
        sections: [
          {
            title: "청구 정보",
            tips: [
              {
                label: "거래처",
                required: true,
                tip: "회사명·상호를 정확히 입력하고, 거래처 관례에 맞는 호칭(귀중·님)을 선택하세요.",
              },
              {
                label: "청구일",
                required: true,
                tip: "어떤 거래에 대한 청구인지 알 수 있는 날짜를 선택하세요. 이후 검색·관리가 쉬워집니다.",
              },
              {
                label: "결제 기한",
                tip: "거래처와 사전에 확인한 날짜를 입력하세요. 확인 없이 임의로 정하지 마세요.",
              },
              {
                label: "청구서 번호",
                required: true,
                tip: "설정 화면에서 형식을 정해 두면 매번 입력이 편해집니다. 중복되지 않는 번호를 사용하세요.",
              },
              {
                label: "건",
                tip: "무엇에 대한 청구인지 한눈에 알 수 있게 작성하세요. 내부 메모가 아닌 상대방용 설명으로 쓰세요.",
              },
            ],
          },
          {
            title: "청구자 정보",
            tips: [
              {
                label: "자사명",
                required: true,
                tip: "청구서에 표시될 공식 명칭을 입력하세요. 등록 정보와 일치시키면 이후 대조가 쉽습니다.",
              },
              {
                label: "상세(주소, 연락처 등)",
                tip: "상대방이 문의나 송금 확인을 하기 쉽도록 주소·전화·이메일을 빠짐없이 입력하세요.",
              },
            ],
          },
          {
            title: "품목·금액",
            tips: [
              {
                label: "품번·품명",
                required: true,
                tip: "상대방 발주 내용과 일치하는 명칭으로 작성하세요. 약어만 쓰지 말고 내용이 전달되게 하세요.",
              },
              {
                label: "수량·단가",
                required: true,
                tip: "견적서나 계약과 숫자가 어긋나지 않았는지 저장 전 다시 확인하세요.",
              },
              {
                label: "소계·소비세·합계",
                required: true,
                tip: "세 구분과 절사 방식은 거래처 규칙에 맞춥니다. 불명확하면 먼저 확인 후 입력하세요.",
              },
              {
                label: "비고",
                tip: "송금처 보충이나 특기 사항이 있으면 기재하세요. 장문보다 읽기 쉬운 핵심을 우선하세요.",
              },
            ],
          },
        ],
      },
      recipient: {
        sections: [
          {
            title: "발송처",
            tips: [
              {
                label: "우편번호·주소",
                tip: "우편 발송 시 필수입니다. 우편번호 검색을 쓰면 입력 실수를 줄일 수 있습니다.",
              },
              {
                label: "이름",
                tip: "봉투 수신인 1행이 특히 중요합니다. 부서명·담당자명까지 정확히 입력하세요.",
              },
              {
                label: "청구월 표시",
                tip: "월별 청구인 경우 청구월을 표시하면 상대방 경리 처리가 수월해집니다.",
              },
            ],
          },
        ],
        note: "이메일 발송만 하더라도 발송처를 등록해 두면 다음 작성이 빨라집니다.",
      },
      payment: {
        sections: [
          {
            title: "결제 옵션",
            tips: [
              {
                label: "카드 결제+ / 선지급+",
                tip: "거래처가 이용 가능한 결제 방식인지 사전에 확인한 뒤 활성화하세요.",
              },
            ],
          },
          {
            title: "송금처",
            tips: [
              {
                label: "은행 계좌",
                required: true,
                tip: "지점명·계좌 종류·번호·명의를 정확히 입력하세요. 명의 표기도 확인하세요.",
              },
              {
                label: "송금 수수료",
                tip: "상대방 부담인지 자사 부담인지 거래 시작 전에 정하면 분쟁을 줄일 수 있습니다.",
              },
            ],
          },
        ],
      },
      tax: {
        sections: [
          {
            title: "소비세 설정",
            tips: [
              {
                label: "세별 / 세금 포함 표시",
                tip: "거래처 경리 규칙에 맞게 선택하세요. 애매하면 상대방에게 확인하는 것이 확실합니다.",
              },
              {
                label: "소비세 절사",
                tip: "절사가 많은 업종도 있지만, 계약 내용에 맞게 설정하세요.",
              },
            ],
          },
          {
            title: "원천징수",
            tips: [
              {
                label: "원천징수세 종류",
                tip: "해당 거래인지 확인 후 설정하세요. 불명확하면 세무사나 거래처에 문의하세요.",
              },
            ],
          },
        ],
        note: "기본값은 설정 화면의 「과세 설정」에서 변경할 수 있습니다.",
      },
      template: {
        sections: [
          {
            title: "템플릿",
            tips: [
              {
                label: "레이아웃 선택",
                tip: "자사 브랜드와 거래처 선호에 맞는 템플릿을 고르세요. 미리보기로 확인 후 결정하세요.",
              },
            ],
          },
          {
            title: "저장 후 발송",
            tips: [
              {
                label: "이메일 발송",
                tip: "PDF 첨부 시 제목·본문에 청구서 번호·금액·기한을 적으면 확인이 빨라집니다.",
              },
              {
                label: "우편",
                tip: "봉투 수신인 미리보기와 청구서 수신인이 일치하는지 인쇄 전 반드시 확인하세요.",
              },
              {
                label: "PDF / 인쇄",
                tip: "내부 승인이나 보관용 PDF를 남겨 두면 이후 문의 대응이 수월합니다.",
              },
            ],
          },
        ],
        caution:
          "가장 흔한 문제는 금액·기한·송금처 사전 확인 누락입니다. 저장 전 한 번 더 검토하세요.",
      },
    },
    ntaLink:
      "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/sonota/calculator/invoice/index.htm",
  },
  en: {
    title: "How to Create an Invoice",
    intro:
      "This guide follows the same tabs as the new invoice form. Work through them in order when you are unsure what to enter.",
    backToSupport: "Back to Support",
    createInvoice: "Create a new invoice",
    legalTitle: "Legally required fields (5 items)",
    legalIntro:
      "The National Tax Agency requires the following five items on qualified invoices.",
    legalLink: "View NTA guidance",
    legalItems: [
      "Name or title of the document creator",
      "Date of transaction",
      "Details of the transaction",
      "Transaction amount (tax included)",
      "Name or title of the recipient business",
    ],
    legalNote:
      'Filling out the "Basic info" tab first in SalesFlow naturally covers these requirements.',
    sidebarTitle: "Input checklist",
    sidebarHint: "Review before saving",
    tabContent: {
      basic: {
        sections: [
          {
            title: "Invoice details",
            tips: [
              {
                label: "Client",
                required: true,
                tip: "Enter the correct company or trade name and choose the honorific your client expects.",
              },
              {
                label: "Issue date",
                required: true,
                tip: "Pick a date that makes the billing period clear. It also helps with later search and reporting.",
              },
              {
                label: "Payment due date",
                tip: "Use a date agreed with the client in advance. Do not set it unilaterally.",
              },
              {
                label: "Invoice number",
                required: true,
                tip: "Configure the format in Settings to save time. Use unique numbers for each invoice.",
              },
              {
                label: "Subject",
                tip: "Write something the recipient can understand at a glance—not an internal note.",
              },
            ],
          },
          {
            title: "Sender details",
            tips: [
              {
                label: "Company name",
                required: true,
                tip: "Use the official name shown on the invoice. Keep it consistent with your registered profile.",
              },
              {
                label: "Details (address, contact, etc.)",
                tip: "Include address, phone, and email so the recipient can verify or follow up easily.",
              },
            ],
          },
          {
            title: "Line items and totals",
            tips: [
              {
                label: "Item name",
                required: true,
                tip: "Match the wording to the order or contract. Avoid abbreviations the client may not recognize.",
              },
              {
                label: "Quantity and unit price",
                required: true,
                tip: "Double-check figures against the estimate or contract before saving.",
              },
              {
                label: "Subtotal, tax, and total",
                required: true,
                tip: "Follow the client's tax display and rounding rules. Confirm first if you are unsure.",
              },
              {
                label: "Remarks",
                tip: "Add payment notes or special terms when needed. Keep it concise and easy to scan.",
              },
            ],
          },
        ],
      },
      recipient: {
        sections: [
          {
            title: "Recipient address",
            tips: [
              {
                label: "Postal code and address",
                tip: "Required for postal delivery. Use postal lookup to reduce typos.",
              },
              {
                label: "Name",
                tip: "The first line on the envelope matters most. Include department and contact name when relevant.",
              },
              {
                label: "Billing month display",
                tip: "For monthly billing, showing the billing month helps the client's accounting team.",
              },
            ],
          },
        ],
        note: "Even for email-only delivery, saving the recipient speeds up the next invoice.",
      },
      payment: {
        sections: [
          {
            title: "Payment options",
            tips: [
              {
                label: "Card payment+ / Pay advance+",
                tip: "Enable only after confirming the client can use those payment methods.",
              },
            ],
          },
          {
            title: "Bank transfer details",
            tips: [
              {
                label: "Bank account",
                required: true,
                tip: "Enter branch, account type, number, and holder name accurately—including katakana spelling.",
              },
              {
                label: "Transfer fees",
                tip: "Decide who pays the fee before the relationship starts to avoid disputes.",
              },
            ],
          },
        ],
      },
      tax: {
        sections: [
          {
            title: "Consumption tax",
            tips: [
              {
                label: "Tax-exclusive / tax-inclusive display",
                tip: "Match the client's accounting rules. When in doubt, ask them first.",
              },
              {
                label: "Tax rounding",
                tip: "Truncation is common in some industries, but follow the contract.",
              },
            ],
          },
          {
            title: "Withholding tax",
            tips: [
              {
                label: "Withholding type",
                tip: "Set this only when the transaction requires it. Consult your accountant if unsure.",
              },
            ],
          },
        ],
        note: 'Default values can be changed under Settings → "Tax settings".',
      },
      template: {
        sections: [
          {
            title: "Template",
            tips: [
              {
                label: "Layout selection",
                tip: "Pick a layout that fits your brand and client expectations. Preview before deciding.",
              },
            ],
          },
          {
            title: "After saving",
            tips: [
              {
                label: "Email",
                tip: "When attaching a PDF, mention the invoice number, amount, and due date in the subject or body.",
              },
              {
                label: "Postal mail",
                tip: "Make sure the envelope preview matches the name on the invoice before printing.",
              },
              {
                label: "PDF / print",
                tip: "Keep a PDF copy for approval workflows and future reference.",
              },
            ],
          },
        ],
        caution:
          "Most issues come from skipping upfront confirmation on amount, due date, and bank details. Review once more before saving.",
      },
    },
    ntaLink:
      "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/sonota/calculator/invoice/index.htm",
  },
} as const;

export function getInvoiceGuideContent(lang: AppLocale) {
  return labels[lang];
}

export const guideTabKeys: GuideTabKey[] = ["basic", "recipient", "payment", "tax", "template"];
