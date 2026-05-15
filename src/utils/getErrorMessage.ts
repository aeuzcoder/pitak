import i18n from "@/i18n";

const ERROR_MAP: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Invalid credentials. Please check the email and password": "errors.invalidCredentials",
  "Invalid email": "errors.invalidEmail",
  "Invalid password": "errors.invalidPassword",
  "Password must be between 8 and 256 characters": "errors.invalidPassword",
  "Password must be at least 8 characters": "errors.invalidPassword",
  "A user with the same id, email, or phone already exists": "errors.userAlreadyExists",
  "user_already_exists": "errors.userAlreadyExists",
  "Rate limit": "errors.rateLimited",
  "Network request failed": "errors.networkError",
  "Failed to fetch": "errors.networkError",
  "NetworkError": "errors.networkError",
  "user_not_found": "errors.userNotFound",
  "User (role: guests) missing scope": "errors.unauthorized",
  "user_unauthorized": "errors.unauthorized",
  "general_unauthorized_scope": "errors.unauthorized",
  "user_blocked": "errors.blockedAccount",
};

export function getErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  for (const [key, translationKey] of Object.entries(ERROR_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) {
      return i18n.t(translationKey);
    }
  }

  return i18n.t("errors.generalError");
}
