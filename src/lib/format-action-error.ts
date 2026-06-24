import type { AppLocale } from "@/contexts/language-context";

const AUTH_ERRORS: Record<
  string,
  Record<AppLocale, string>
> = {
  AUTH_FIELDS_REQUIRED: {
    ja: "メールアドレスとパスワードを入力してください。",
    ko: "이메일과 비밀번호를 입력해 주세요.",
    en: "Enter your email and password.",
  },
  AUTH_INVALID_CREDENTIALS: {
    ja: "メールアドレスまたはパスワードが正しくありません。",
    ko: "이메일 또는 비밀번호가 올바르지 않습니다.",
    en: "Email or password is incorrect.",
  },
  AUTH_EMAIL_NOT_CONFIRMED: {
    ja: "メールアドレスの確認が完了していません。受信トレイをご確認ください。",
    ko: "이메일 인증이 완료되지 않았습니다. 받은편지함을 확인해 주세요.",
    en: "Email is not confirmed yet. Check your inbox.",
  },
  AUTH_USER_EXISTS: {
    ja: "このメールアドレスはすでに登録されています。",
    ko: "이미 등록된 이메일입니다.",
    en: "This email is already registered.",
  },
  AUTH_PASSWORD_TOO_SHORT: {
    ja: "パスワードは8文字以上にしてください。",
    ko: "비밀번호는 8자 이상이어야 합니다.",
    en: "Password must be at least 8 characters.",
  },
  AUTH_PASSWORD_MISMATCH: {
    ja: "パスワードが一致しません。",
    ko: "비밀번호가 일치하지 않습니다.",
    en: "Passwords do not match.",
  },
  AUTH_EMAIL_REQUIRED: {
    ja: "メールアドレスを入力してください。",
    ko: "이메일을 입력해 주세요.",
    en: "Enter your email address.",
  },
  AUTH_PASSWORD_REQUIRED: {
    ja: "新しいパスワードを入力してください。",
    ko: "새 비밀번호를 입력해 주세요.",
    en: "Enter a new password.",
  },
  AUTH_GENERIC: {
    ja: "リクエストを処理できませんでした。",
    ko: "요청을 처리하지 못했습니다.",
    en: "Could not complete the request.",
  },
  AUTH_GOOGLE_FAILED: {
    ja: "Googleサインインを開始できませんでした。しばらくしてからもう一度お試しください。",
    ko: "Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    en: "Could not start Google sign-in. Try again shortly.",
  },
  AUTH_RESET_SUCCESS: {
    ja: "パスワードを更新しました。新しいパスワードでサインインしてください。",
    ko: "비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.",
    en: "Password updated. Sign in with your new password.",
  },
  AUTH_SIGNUP_SUCCESS: {
    ja: "確認メールを送信しました。受信トレイをご確認ください。",
    ko: "인증 메일을 보냈습니다. 받은편지함을 확인해 주세요.",
    en: "Confirmation email sent. Check your inbox.",
  },
  AUTH_FORGOT_SUCCESS: {
    ja: "パスワードリセットのメールを送信しました。",
    ko: "비밀번호 재설정 메일을 보냈습니다.",
    en: "Password reset email sent.",
  },
};

export function formatSalesAuthError(
  code: string,
  lang: AppLocale,
  fallback = AUTH_ERRORS.AUTH_GENERIC[lang],
): string {
  return AUTH_ERRORS[code]?.[lang] ?? fallback;
}

export function formatSalesActionError(
  code: string,
  lang: AppLocale,
): string {
  const ACTION_ERRORS: Record<string, Record<AppLocale, string>> = {
    UNAUTHORIZED: {
      ja: "サインインが必要です。",
      ko: "로그인이 필요합니다.",
      en: "Sign in required.",
    },
    NO_ORGANIZATION: {
      ja: "有効な組織が見つかりません。",
      ko: "활성 조직을 찾을 수 없습니다.",
      en: "No active organization found.",
    },
    VALIDATION_FAILED: {
      ja: "入力内容を確認してください。",
      ko: "입력값을 확인해 주세요.",
      en: "Check your input.",
    },
    INSERT_FAILED: {
      ja: "保存に失敗しました。",
      ko: "저장하지 못했습니다.",
      en: "Save failed.",
    },
    NOT_FOUND: {
      ja: "データが見つかりません。",
      ko: "데이터를 찾을 수 없습니다.",
      en: "Record not found.",
    },
    DATABASE_ERROR: {
      ja: "リクエストを処理できませんでした。",
      ko: "요청을 처리하지 못했습니다.",
      en: "Could not complete the request.",
    },
  };
  return ACTION_ERRORS[code]?.[lang] ?? ACTION_ERRORS.DATABASE_ERROR[lang];
}
