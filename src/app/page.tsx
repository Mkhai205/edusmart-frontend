"use client";

import Link from "next/link";
import { useEffect } from "react";

import { AuthLoginButton } from "@/components/auth-login-button";
import { useAuthStore } from "@/stores/authStore";

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
                            Learn faster with AI-built study flows
                        </h1>
                    </div>

                    {status === "authenticated" && user ? (
                        <Link
                            href="/dashboard"
                            className="rounded-full border border-cyan-200/30 bg-slate-900 px-5 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/60 hover:bg-slate-800"
                        >
                            Go to dashboard
                        </Link>
                    ) : (
                        <AuthLoginButton
                            label="Login with Google"
                            className="hidden sm:inline-flex"
                        />
                    )}
                </header>

                <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm sm:p-10">
                        <p className="text-sm text-cyan-200">For students and self-learners</p>
                        <h2 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                            Turn documents into summaries, quizzes, and flashcards in minutes.
                        </h2>
                        <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
                            Upload your learning materials once. EduSmart extracts key ideas,
                            generates adaptive quizzes, and helps you revise with spaced repetition.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            {status === "authenticated" && user ? (
                                <>
                                    <Link
                                        href="/dashboard"
                                        className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                                    >
                                        Continue as {user.full_name ?? user.email}
                                    </Link>
                                    <p className="text-sm text-slate-300">You are signed in.</p>
                                </>
                            ) : (
                                <>
                                    <AuthLoginButton className="w-full sm:w-auto" />
                                    <p className="text-sm text-slate-300">
                                        Sign in securely via Google OAuth.
                                    </p>
                                </>
                            )}
                        </div>

                        {status === "loading" && (
                            <p className="mt-4 text-sm text-cyan-200">Checking your session...</p>
                        )}
                        {error && <p className="mt-4 text-sm text-amber-200">{error.message}</p>}
                    </article>

                    <aside className="grid gap-4">
                        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-5">
                            <p className="text-xs uppercase tracking-wider text-cyan-100">
                                AI Summaries
                            </p>
                            <p className="mt-2 text-sm text-slate-200">
                                Map-reduce summarization tuned for long study materials.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/10 p-5">
                            <p className="text-xs uppercase tracking-wider text-emerald-100">
                                Smart Quizzes
                            </p>
                            <p className="mt-2 text-sm text-slate-200">
                                Auto-generated quizzes with score tracking and review analytics.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-fuchsia-200/20 bg-fuchsia-300/10 p-5">
                            <p className="text-xs uppercase tracking-wider text-fuchsia-100">
                                Flashcard Sets
                            </p>
                            <p className="mt-2 text-sm text-slate-200">
                                Memory-first card generation for daily revision workflows.
                            </p>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
