"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GoogleLoginButton } from "@/features/auth/components/google-login-button";
import { resolveAuthErrorFromParams } from "@/features/auth/services/authService";

export default function AuthCallbackErrorPage() {
    const [message, setMessage] = useState<string | null>(null);
    const [reason, setReason] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setMessage(params.get("message"));
        setReason(params.get("reason"));
    }, []);

    const errorInfo = resolveAuthErrorFromParams(message, reason);

    return (
        <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
            <div className="w-full max-w-xl rounded-3xl border border-amber-300/20 bg-slate-900/70 p-8 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-300">
                    Lỗi xác thực
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                    Không thể hoàn tất đăng nhập
                </h1>
                <p className="mt-4 text-base text-slate-200">{errorInfo.message}</p>

                {errorInfo.reason && (
                    <p className="mt-3 rounded-xl border border-amber-200/20 bg-amber-100/10 px-4 py-3 text-sm text-amber-100">
                        Chi tiết kỹ thuật: {errorInfo.reason}
                    </p>
                )}

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <GoogleLoginButton label="Đăng nhập lại" />
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
                    >
                        Quay về trang chủ
                    </Link>
                </div>
            </div>
        </main>
    );
}
