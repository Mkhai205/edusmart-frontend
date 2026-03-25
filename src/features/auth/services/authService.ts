import { apiRequest, getApiBaseUrl } from "@/libs/apiClient";
import type {
    AuthErrorCode,
    AuthErrorInfo,
    AuthRefreshResponse,
    AuthUser,
} from "@/features/auth/types";

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
    missing_google_code: "Google không trả về mã xác thực. Vui lòng đăng nhập lại.",
    invalid_oauth_state: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
    google_auth_failed: "Đăng nhập Google thất bại. Vui lòng thử lại sau ít phút.",
    session_init_failed: "Không thể khởi tạo phiên đăng nhập. Vui lòng thử lại.",
    unknown_auth_error: "Đã xảy ra lỗi đăng nhập chưa xác định.",
};

function normalizeAuthErrorCode(value: string | null): AuthErrorCode {
    if (!value) {
        return "unknown_auth_error";
    }

    if (
        value === "missing_google_code" ||
        value === "invalid_oauth_state" ||
        value === "google_auth_failed"
    ) {
        return value;
    }

    return "unknown_auth_error";
}

export function getGoogleLoginUrl(): string {
    const explicitUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL;
    if (explicitUrl) {
        return explicitUrl;
    }

    return `${getApiBaseUrl()}/auth/google/login`;
}

export function startGoogleLogin(): void {
    window.location.assign(getGoogleLoginUrl());
}

export async function getCurrentUser(): Promise<AuthUser> {
    return apiRequest<AuthUser>("/auth/me", {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function refreshSession(): Promise<AuthRefreshResponse> {
    return apiRequest<AuthRefreshResponse>("/auth/refresh", {
        method: "POST",
    });
}

export async function logoutSession(): Promise<void> {
    await apiRequest<{ message: string }>("/auth/logout", {
        method: "POST",
        allowAuthRetry: true,
    });
}

export function resolveAuthErrorFromParams(
    message: string | null,
    reason: string | null,
): AuthErrorInfo {
    const code = normalizeAuthErrorCode(message);

    return {
        code,
        message: AUTH_ERROR_MESSAGES[code],
        reason: reason ?? undefined,
    };
}
