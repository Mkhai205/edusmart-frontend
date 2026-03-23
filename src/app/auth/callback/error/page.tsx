"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AuthLoginButton } from "@/components/auth-login-button";
import { resolveAuthErrorFromParams } from "@/services/authService";

export default function AuthCallbackErrorPage() {
    const searchParams = useSearchParams();
    const message = searchParams.get("message");
    const reason = searchParams.get("reason");

    const errorInfo = resolveAuthErrorFromParams(message, reason);

    return (
        <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
            <div className="w-full max-w-xl rounded-3xl border border-amber-300/20 bg-slate-900/70 p-8 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-300">
                    Authentication error
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                    Login could not be completed
                </h1>
                <p className="mt-4 text-base text-slate-200">{errorInfo.message}</p>

                {errorInfo.reason && (
                    <p className="mt-3 rounded-xl border border-amber-200/20 bg-amber-100/10 px-4 py-3 text-sm text-amber-100">
                        Debug reason: {errorInfo.reason}
                    </p>
                )}

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <AuthLoginButton label="Try login again" />
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
                    >
                        Back to landing page
                    </Link>
                </div>
            </div>
        </main>
    );
}
