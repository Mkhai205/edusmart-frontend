export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export type AuthErrorCode =
    | "missing_google_code"
    | "invalid_oauth_state"
    | "google_auth_failed"
    | "session_init_failed"
    | "unknown_auth_error";

export interface AuthUser {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
}

export interface AuthRefreshResponse {
    user_id: string;
    refreshed_at: string;
}

export interface AuthErrorInfo {
    code: AuthErrorCode;
    message: string;
    reason?: string;
}
