import i18n from "@/i18n";

/** Supabase Auth `error.code` */
const CODE_MAP: Record<string, string> = {
  email_address_invalid: "errors.emailAddressInvalid",
  email_address_not_authorized: "errors.emailNotAuthorized",
  over_email_send_rate_limit: "errors.rateLimited",
  over_request_rate_limit: "errors.rateLimited",
  user_already_exists: "errors.userAlreadyExists",
  email_exists: "errors.userAlreadyExists",
  invalid_credentials: "errors.invalidCredentials",
  email_not_confirmed: "errors.emailNotConfirmed",
};

const ERROR_MAP: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Invalid email": "errors.invalidEmail",
  "Password must be at least": "errors.invalidPassword",
  "User already registered": "errors.userAlreadyExists",
  "Email not confirmed": "errors.emailNotConfirmed",
  "email rate limit exceeded": "errors.rateLimited",
  "is invalid": "errors.emailAddressInvalid",
};

export function getErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && CODE_MAP[code]) {
    return i18n.t(CODE_MAP[code]);
  }

  const raw = err instanceof Error ? err.message : String(err);

  for (const [key, translationKey] of Object.entries(ERROR_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) {
      return i18n.t(translationKey);
    }
  }

  return i18n.t("errors.generalError");
}
