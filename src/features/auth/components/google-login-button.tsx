"use client";

import { useAuthStore } from "@/features/auth/store/authStore";

interface GoogleLoginButtonProps {
    label?: string;
    className?: string;
}

export function GoogleLoginButton({
    label = "Tiếp tục với Google",
    className = "",
}: GoogleLoginButtonProps) {
    const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

    return (
        <button
            type="button"
            onClick={signInWithGoogle}
            className={`inline-flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${className}`}
        >
            <span className="inline-block size-5 rounded-full bg-[conic-gradient(at_40%_40%,#ef4444,#f59e0b,#22c55e,#3b82f6,#ef4444)]" />
            {label}
        </button>
    );
}
