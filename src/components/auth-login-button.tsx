"use client";

import { useAuthStore } from "@/stores/authStore";

interface AuthLoginButtonProps {
    label?: string;
    className?: string;
}

export function AuthLoginButton({
    label = "Tiếp tục với Google",
    className = "",
}: AuthLoginButtonProps) {
    const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

    return (
        <button
            type="button"
            onClick={signInWithGoogle}
            className={`inline-flex items-center justify-center gap-3 rounded-full border border-sky-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${className}`}
        >
            <span className="inline-block size-5 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" />
            {label}
        </button>
    );
}
