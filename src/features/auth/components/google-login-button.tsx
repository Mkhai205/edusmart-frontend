"use client";

import { useAuthStore } from "@/features/auth/store/authStore";
import Image from "next/image";

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
            className={`flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${className} cursor-pointer`}
        >
            <Image src="/google.svg" alt="Google" width={20} height={20} className="h-5 w-5" />
            {label}
        </button>
    );
}
