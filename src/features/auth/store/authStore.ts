import { create } from "zustand";

import { ApiError } from "@/libs/apiClient";
import {
    getCurrentUser,
    logoutSession,
    startGoogleLogin,
} from "@/features/auth/services/authService";
import type { AuthErrorInfo, AuthStatus, AuthUser } from "@/features/auth/types";

interface AuthState {
    user: AuthUser | null;
    status: AuthStatus;
    error: AuthErrorInfo | null;
    initialized: boolean;
    initSession: () => Promise<boolean>;
    signInWithGoogle: () => void;
    signOut: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    status: "idle",
    error: null,
    initialized: false,

    initSession: async () => {
        if (get().status === "loading") {
            return false;
        }

        set({ status: "loading", error: null });

        try {
            const user = await getCurrentUser();
            set({
                user,
                status: "authenticated",
                initialized: true,
            });
            return true;
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                set({
                    user: null,
                    status: "unauthenticated",
                    initialized: true,
                    error: null,
                });
                return false;
            }

            set({
                user: null,
                status: "unauthenticated",
                initialized: true,
                error: {
                    code: "session_init_failed",
                    message: "Không thể khởi tạo phiên đăng nhập. Vui lòng thử lại.",
                },
            });
            return false;
        }
    },

    signInWithGoogle: () => {
        startGoogleLogin();
    },

    signOut: async () => {
        try {
            await logoutSession();
        } finally {
            set({
                user: null,
                status: "unauthenticated",
                error: null,
                initialized: true,
            });
        }
    },

    clearError: () => set({ error: null }),
}));
