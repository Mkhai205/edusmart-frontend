"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/stores/authStore";

export default function DashboardPage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const status = useAuthStore((state) => state.status);
    const initialized = useAuthStore((state) => state.initialized);
    const initSession = useAuthStore((state) => state.initSession);
    const signOut = useAuthStore((state) => state.signOut);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        const syncSession = async () => {
            if (!initialized) {
                const ok = await initSession();
                if (!ok) {
                    router.replace("/");
                }
                return;
            }

            if (status === "unauthenticated") {
                router.replace("/");
            }
        };

        void syncSession();
    }, [initSession, initialized, router, status]);

    const onLogout = async () => {
        setLoggingOut(true);
        await signOut();
        router.replace("/");
    };

    if (status === "loading" || !initialized) {
        return (
            <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
                <p className="text-sm text-cyan-200">Loading your learning workspace...</p>
            </main>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
                <header className="rounded-2xl border border-cyan-200/20 bg-slate-900/80 p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                        EduSmart Dashboard
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold">
                        Welcome back{user.full_name ? `, ${user.full_name}` : ""}
                    </h1>
                    <p className="mt-2 text-sm text-slate-300">Signed in as {user.email}</p>

                    <button
                        type="button"
                        onClick={onLogout}
                        disabled={loggingOut}
                        className="mt-5 inline-flex items-center justify-center rounded-full border border-slate-500 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {loggingOut ? "Logging out..." : "Logout"}
                    </button>
                </header>

                <div className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="text-base font-semibold">Quick Start</h2>
                        <p className="mt-2 text-sm text-slate-300">
                            Upload your first document to generate AI summary and quizzes.
                        </p>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="text-base font-semibold">Recent Activity</h2>
                        <p className="mt-2 text-sm text-slate-300">
                            Your generated learning assets will appear here.
                        </p>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="text-base font-semibold">Study Goal</h2>
                        <p className="mt-2 text-sm text-slate-300">
                            Set weekly targets after integrating document and quiz modules.
                        </p>
                    </article>
                </div>
            </section>
        </main>
    );
}
