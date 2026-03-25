"use client";

import Link from "next/link";
import { useEffect } from "react";

import { GoogleLoginButton } from "@/features/auth/components/google-login-button";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function Home() {
    const user = useAuthStore((state) => state.user);
    const status = useAuthStore((state) => state.status);
    const initialized = useAuthStore((state) => state.initialized);
    const error = useAuthStore((state) => state.error);
    const initSession = useAuthStore((state) => state.initSession);

    useEffect(() => {
        if (!initialized) {
            void initSession();
        }
    }, [initSession, initialized]);

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
            <div className="pointer-events-none absolute -left-28 top-0 size-96 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 size-128 rounded-full bg-emerald-300/20 blur-3xl" />

            <section className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-10 sm:px-10 lg:py-16">
                <header className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                            EduSmart
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                            Học nhanh hơn với lộ trình AI theo tài liệu
                        </h1>
                    </div>

                    {status === "authenticated" && user ? (
                        <Link
                            href="/dashboard"
                            className="rounded-full border border-cyan-200/30 bg-slate-900 px-5 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/60 hover:bg-slate-800"
                        >
                            Vào trang học tập
                        </Link>
                    ) : (
                        <GoogleLoginButton
                            label="Đăng nhập với Google"
                            className="hidden sm:inline-flex"
                        />
                    )}
                </header>

                <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm sm:p-10">
                        <p className="text-sm text-cyan-200">Dành cho học sinh, sinh viên và người tự học</p>
                        <h2 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                            Biến tài liệu thành tóm tắt, quiz và flashcard chỉ trong vài phút.
                        </h2>
                        <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
                            Tải tài liệu một lần. EduSmart trích xuất ý chính, tạo quiz tự luyện
                            và hỗ trợ ôn tập bằng phương pháp lặp lại ngắt quãng.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            {status === "authenticated" && user ? (
                                <>
                                    <Link
                                        href="/dashboard"
                                        className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                                    >
                                        Tiếp tục với {user.full_name ?? user.email}
                                    </Link>
                                    <p className="text-sm text-slate-300">Bạn đã đăng nhập.</p>
                                </>
                            ) : (
                                <>
                                    <GoogleLoginButton className="w-full sm:w-auto" />
                                    <p className="text-sm text-slate-300">
                                        Đăng nhập an toàn qua Google OAuth.
                                    </p>
                                </>
                            )}
                        </div>

                        {status === "loading" && (
                            <p className="mt-4 text-sm text-cyan-200">Đang kiểm tra phiên đăng nhập...</p>
                        )}
                        {error && <p className="mt-4 text-sm text-amber-200">{error.message}</p>}
                    </article>

                    <aside className="grid gap-4">
                        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-5">
                            <p className="text-xs uppercase tracking-wider text-cyan-100">
                                Tóm tắt AI
                            </p>
                            <p className="mt-2 text-sm text-slate-200">
                                Tóm tắt map-reduce tối ưu cho tài liệu dài.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/10 p-5">
                            <p className="text-xs uppercase tracking-wider text-emerald-100">
                                Quiz thông minh
                            </p>
                            <p className="mt-2 text-sm text-slate-200">
                                Tự động tạo quiz kèm theo dõi điểm và phân tích kết quả.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-fuchsia-200/20 bg-fuchsia-300/10 p-5">
                            <p className="text-xs uppercase tracking-wider text-fuchsia-100">
                                Bộ flashcard
                            </p>
                            <p className="mt-2 text-sm text-slate-200">
                                Tạo thẻ ôn tập để học mỗi ngày hiệu quả hơn.
                            </p>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
