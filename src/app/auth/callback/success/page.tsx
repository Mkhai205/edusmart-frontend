"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/store/authStore";

export default function AuthCallbackSuccessPage() {
    const router = useRouter();
    const initSession = useAuthStore((state) => state.initSession);

    useEffect(() => {
        const settleSession = async () => {
            const ok = await initSession();
            if (ok) {
                router.replace("/dashboard");
                return;
            }
            router.replace("/login");
        };

        void settleSession();
    }, [initSession, router]);

    return (
        <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
            <div className="max-w-lg rounded-2xl border border-cyan-200/20 bg-slate-900/70 p-8 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">EduSmart</p>
                <h1 className="mt-3 text-2xl font-semibold">Đang hoàn tất đăng nhập...</h1>
                <p className="mt-3 text-sm text-slate-300">
                    Hệ thống đang xác thực phiên làm việc và chuyển bạn đến trang học tập.
                </p>
            </div>
        </main>
    );
}
