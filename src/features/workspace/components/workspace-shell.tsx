"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { MarkdownPreview } from "@/features/workspace/components/markdown-preview";
import { PdfViewerPanel } from "@/features/workspace/components/pdf-viewer-panel";
import {
    getDocumentDownloadUrl,
    getLatestSummaryStatus,
    getSummaryStatus,
    listDocuments,
    queueSummary,
    uploadDocument,
} from "@/features/workspace/services/documentsService";
import {
    createLearningGoal,
    getLearningGoalDashboard,
    listFlashcardSets,
    listLearningGoals,
    listQuizzes,
    queueFlashcardGeneration,
    queueQuizGeneration,
} from "@/features/workspace/services/learningService";
import type {
    DocumentListItem,
    FlashcardSetListItem,
    GoalRecurrenceType,
    LearningGoal,
    LearningGoalDashboard,
    QuizListItem,
} from "@/features/workspace/types";

const FALLBACK_PDF_URL = "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

const SAMPLE_MARKDOWN = `# Chào mừng bạn đến với EduSmart

Hãy tải tệp PDF để bắt đầu học.

Sau khi tải lên, bạn có thể:
- Tạo tóm tắt tự động theo nội dung tài liệu.
- Tạo bộ quiz để tự kiểm tra kiến thức.
- Tạo flashcards để ôn tập nhanh.
- Lưu mục tiêu học theo ngày để theo dõi tiến độ.
`;

const MENU_ITEMS: Array<{
    label: string;
    shortcut: string;
    tab?: "summary" | "quiz" | "flashcard" | "goals";
}> = [
    { label: "Tài liệu", shortcut: "TL", tab: "summary" },
    { label: "Quiz", shortcut: "QZ", tab: "quiz" },
    { label: "Flashcard", shortcut: "FC", tab: "flashcard" },
    { label: "Mục tiêu học", shortcut: "MT", tab: "goals" },
];

const RECURRENCE_OPTIONS: Array<{ label: string; value: GoalRecurrenceType }> = [
    { label: "Hằng ngày", value: "daily" },
    { label: "Hằng tuần", value: "weekly" },
    { label: "Hằng tháng", value: "monthly" },
];

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("vi-VN");
}

function getDocumentStatusLabel(status: DocumentListItem["extraction_status"]): string {
    if (status === "completed") {
        return "San sang";
    }

    if (status === "processing") {
        return "Đang xử lý";
    }

    if (status === "failed") {
        return "Cần thử lại";
    }

    return "Đã xếp hàng";
}

export function WorkspaceShell() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const status = useAuthStore((state) => state.status);
    const initialized = useAuthStore((state) => state.initialized);
    const initSession = useAuthStore((state) => state.initSession);
    const signOut = useAuthStore((state) => state.signOut);

    const [documents, setDocuments] = useState<DocumentListItem[]>([]);
    const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
    const [flashcards, setFlashcards] = useState<FlashcardSetListItem[]>([]);
    const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([]);
    const [goalDashboard, setGoalDashboard] = useState<LearningGoalDashboard | null>(null);

    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [goalTitle, setGoalTitle] = useState("");
    const [goalTargetDate, setGoalTargetDate] = useState("");
    const [goalRecurrence, setGoalRecurrence] = useState<GoalRecurrenceType>("weekly");

    const [markdownContent, setMarkdownContent] = useState(SAMPLE_MARKDOWN);
    const [pdfUrl, setPdfUrl] = useState(FALLBACK_PDF_URL);

    const [workspaceLoading, setWorkspaceLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [quizLoading, setQuizLoading] = useState(false);
    const [flashcardLoading, setFlashcardLoading] = useState(false);
    const [goalSaving, setGoalSaving] = useState(false);

    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);

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

    const loadWorkspaceData = useCallback(async () => {
        setWorkspaceLoading(true);
        setWorkspaceError(null);

        const [docsResult, dashboardResult, quizzesResult, flashcardsResult, goalsResult] =
            await Promise.allSettled([
                listDocuments(12, 0),
                getLearningGoalDashboard(),
                listQuizzes(8, 0),
                listFlashcardSets(8, 0),
                listLearningGoals(6, 0),
            ]);

        if (docsResult.status === "fulfilled") {
            const loadedDocuments = docsResult.value;
            setDocuments(loadedDocuments);

            const firstDoc = loadedDocuments[0];
            if (firstDoc) {
                const resolvedDocId = selectedDocumentId ?? firstDoc.document_id;
                setSelectedDocumentId(resolvedDocId);

                try {
                    const download = await getDocumentDownloadUrl(resolvedDocId);
                    setPdfUrl(download.download_url);
                } catch {
                    setPdfUrl(FALLBACK_PDF_URL);
                }

                try {
                    const latestSummary = await getLatestSummaryStatus(resolvedDocId);
                    if (latestSummary.summary_status === "completed" && latestSummary.content_markdown) {
                        setMarkdownContent(latestSummary.content_markdown);
                    }
                } catch {
                    setMarkdownContent(SAMPLE_MARKDOWN);
                }
            }
        } else {
            setWorkspaceError("Không thể tải danh sách tài liệu. Vui lòng thử lại.");
        }

        if (dashboardResult.status === "fulfilled") {
            setGoalDashboard(dashboardResult.value);
        }

        if (quizzesResult.status === "fulfilled") {
            setQuizzes(quizzesResult.value);
        }

        if (flashcardsResult.status === "fulfilled") {
            setFlashcards(flashcardsResult.value);
        }

        if (goalsResult.status === "fulfilled") {
            setLearningGoals(goalsResult.value);
        }

        setWorkspaceLoading(false);
    }, [selectedDocumentId]);

    useEffect(() => {
        if (!initialized || status !== "authenticated") {
            return;
        }

        void loadWorkspaceData();
    }, [initialized, status, loadWorkspaceData]);

    const userDisplayName = useMemo(() => {
        if (!user) {
            return "bạn";
        }

        return user.full_name ?? user.email.split("@")[0] ?? "bạn";
    }, [user]);

    const handleLogout = async () => {
        await signOut();
        router.replace("/");
    };

    const goToDocumentDetail = (
        tab: "summary" | "quiz" | "flashcard" | "goals",
        options?: { documentId?: string; quizId?: string; setId?: string },
    ) => {
        const resolvedDocumentId = options?.documentId ?? selectedDocumentId ?? documents[0]?.document_id;
        if (!resolvedDocumentId) {
            setWorkspaceError("Chưa có tài liệu để điều hướng. Vui lòng tải PDF trước.");
            return;
        }

        const query = new URLSearchParams({ tab });
        if (options?.quizId) {
            query.set("quizId", options.quizId);
        }
        if (options?.setId) {
            query.set("setId", options.setId);
        }

        router.push(`/dashboard/documents/${resolvedDocumentId}?${query.toString()}`);
    };

    const handleUploadPdf = async () => {
        if (!selectedFile) {
            setWorkspaceError("Vui lòng chọn tệp PDF trước khi tải lên.");
            return;
        }

        try {
            setUploading(true);
            setWorkspaceError(null);
            setWorkspaceNotice(null);

            const uploaded = await uploadDocument(selectedFile);
            setSelectedDocumentId(uploaded.document_id);
            setPdfUrl(uploaded.download_url || FALLBACK_PDF_URL);
            setWorkspaceNotice("Tải PDF thành công. Hệ thống đang trích xuất nội dung.");
            setSelectedFile(null);
            await loadWorkspaceData();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Tải tài liệu thất bại.";
            setWorkspaceError(message);
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (!selectedDocumentId) {
            setWorkspaceError("Vui lòng chọn tài liệu để tạo tóm tắt.");
            return;
        }

        try {
            setSummaryLoading(true);
            setWorkspaceError(null);

            const queued = await queueSummary(selectedDocumentId, {
                mode: "full_map_reduce",
            });

            let resolvedContent: string | null = null;
            for (let attempt = 0; attempt < 8; attempt += 1) {
                const statusResponse = await getSummaryStatus(selectedDocumentId, queued.summary_id);
                if (statusResponse.summary_status === "completed" && statusResponse.content_markdown) {
                    resolvedContent = statusResponse.content_markdown;
                    break;
                }

                if (statusResponse.summary_status === "failed") {
                    throw new Error(statusResponse.summary_error ?? "Tạo tóm tắt thất bại");
                }

                await sleep(1500);
            }

            if (resolvedContent) {
                setMarkdownContent(resolvedContent);
                setWorkspaceNotice("Đã cập nhật bản tóm tắt mới.");
            } else {
                setWorkspaceError("Tóm tắt đang được xử lý. Vui lòng thử lại sau vài giây.");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể tạo tóm tắt.";
            setWorkspaceError(message);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleGenerateQuiz = async () => {
        if (!selectedDocumentId) {
            setWorkspaceError("Vui lòng chọn tài liệu để tạo quiz.");
            return;
        }

        try {
            setQuizLoading(true);
            setWorkspaceError(null);

            await queueQuizGeneration({
                document_id: selectedDocumentId,
                question_count: 10,
                difficulty: "medium",
                time_limit_seconds: 900,
            });

            setWorkspaceNotice("Đã gửi yêu cầu tạo quiz. Vui lòng đợi hệ thống xử lý.");
            const quizList = await listQuizzes(8, 0);
            setQuizzes(quizList);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể tạo quiz.";
            setWorkspaceError(message);
        } finally {
            setQuizLoading(false);
        }
    };

    const handleGenerateFlashcards = async () => {
        if (!selectedDocumentId) {
            setWorkspaceError("Vui lòng chọn tài liệu để tạo flashcard.");
            return;
        }

        try {
            setFlashcardLoading(true);
            setWorkspaceError(null);

            await queueFlashcardGeneration({
                document_id: selectedDocumentId,
                card_count: 20,
                include_images: true,
            });

            setWorkspaceNotice("Đã gửi yêu cầu tạo flashcard.");
            const flashcardSets = await listFlashcardSets(8, 0);
            setFlashcards(flashcardSets);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể tạo flashcard.";
            setWorkspaceError(message);
        } finally {
            setFlashcardLoading(false);
        }
    };

    const handleCreateGoal = async () => {
        if (!goalTitle.trim()) {
            setWorkspaceError("Vui lòng nhập tên mục tiêu học.");
            return;
        }

        if (!goalTargetDate) {
            setWorkspaceError("Vui lòng chọn ngày mục tiêu.");
            return;
        }

        try {
            setGoalSaving(true);
            setWorkspaceError(null);

            await createLearningGoal({
                title: goalTitle.trim(),
                recurrence_type: goalRecurrence,
                target_date: goalTargetDate,
                document_id: selectedDocumentId ?? undefined,
                reminder_enabled: true,
            });

            setWorkspaceNotice("Đã lưu mục tiêu học thành công.");
            setGoalTitle("");
            setGoalTargetDate("");

            const [goals, dashboard] = await Promise.all([
                listLearningGoals(6, 0),
                getLearningGoalDashboard(),
            ]);
            setLearningGoals(goals);
            setGoalDashboard(dashboard);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể lưu mục tiêu học.";
            setWorkspaceError(message);
        } finally {
            setGoalSaving(false);
        }
    };

    if (status === "loading" || !initialized) {
        return (
            <main className="grid min-h-screen place-items-center bg-[var(--yl-surface)] px-6 text-[var(--yl-ink)]">
                <p className="text-sm text-slate-500">Đang chuẩn bị không gian học...</p>
            </main>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--yl-surface)] text-[var(--yl-ink)]">
            <div className="mx-auto flex w-full max-w-[1500px] gap-0 lg:min-h-screen">
                <aside className="hidden w-[280px] border-r border-slate-200 bg-[var(--yl-sidebar)] px-4 py-5 lg:block">
                    <div className="flex items-center justify-between">
                        <p className="text-xl font-bold tracking-tight">EduSmart</p>
                        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600">
                            Học tập
                        </span>
                    </div>

                    <nav className="mt-6 space-y-1">
                        {MENU_ITEMS.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                    if (item.tab) {
                                        goToDocumentDetail(item.tab);
                                    }
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-white"
                            >
                                <span className="inline-flex size-6 items-center justify-center rounded-md border border-slate-300 text-[10px] font-semibold text-slate-500">
                                    {item.shortcut}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="mt-8">
                        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Tài liệu gần đây</p>
                        <div className="space-y-2">
                            {documents.slice(0, 5).map((doc) => (
                                <button
                                    key={doc.document_id}
                                    type="button"
                                    onClick={() => {
                                        router.push(`/dashboard/documents/${doc.document_id}`);
                                    }}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-emerald-400"
                                >
                                    <p className="truncate font-medium text-slate-800">{doc.title}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(doc.file_size)}</p>
                                </button>
                            ))}
                            {!documents.length && (
                                <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                                    Chưa có tài liệu nào.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-sm font-semibold text-emerald-800">{user.full_name ?? user.email}</p>
                        <button
                            type="button"
                            onClick={() => {
                                void handleLogout();
                            }}
                            className="mt-2 rounded-full border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </aside>

                <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
                    <section className="mx-auto w-full max-w-5xl">
                        <header>
                            <h1 className="mt-2 text-center text-4xl font-semibold tracking-tight sm:text-5xl">
                                Hôm nay bạn muốn học gì, {userDisplayName}?
                            </h1>

                            <div className="mx-auto mt-8 grid max-w-4xl gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
                                <div>
                                    <h2 className="text-lg font-semibold">Tải tệp PDF</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Chỉ hỗ trợ học qua tài liệu PDF: tóm tắt, quiz, flashcard và lưu lịch học.
                                    </p>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0] ?? null;
                                            setSelectedFile(file);
                                        }}
                                        className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleUploadPdf();
                                        }}
                                        disabled={uploading || workspaceLoading}
                                        className="mt-3 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {uploading ? "Đang tải lên..." : "Tải PDF lên"}
                                    </button>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="text-base font-semibold">Thao tác AI trên tài liệu</h3>
                                    <div className="mt-3 grid gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleGenerateSummary();
                                            }}
                                            disabled={summaryLoading || workspaceLoading}
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium transition hover:border-emerald-400"
                                        >
                                            {summaryLoading ? "Đang tạo tóm tắt..." : "Tạo tóm tắt tài liệu"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleGenerateQuiz();
                                            }}
                                            disabled={quizLoading || workspaceLoading}
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium transition hover:border-emerald-400"
                                        >
                                            {quizLoading ? "Đang tạo quiz..." : "Tạo quiz tự luyện"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleGenerateFlashcards();
                                            }}
                                            disabled={flashcardLoading || workspaceLoading}
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium transition hover:border-emerald-400"
                                        >
                                            {flashcardLoading ? "Đang tạo flashcard..." : "Tạo flashcard ôn tập"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {workspaceNotice && (
                            <p className="mx-auto mt-4 max-w-4xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                {workspaceNotice}
                            </p>
                        )}

                        {workspaceError && (
                            <p className="mx-auto mt-4 max-w-4xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {workspaceError}
                            </p>
                        )}

                        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <button
                                type="button"
                                onClick={() => {
                                    goToDocumentDetail("summary");
                                }}
                                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300"
                            >
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tài liệu</p>
                                <p className="mt-2 text-3xl font-semibold">{documents.length}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    goToDocumentDetail("quiz");
                                }}
                                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300"
                            >
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quiz</p>
                                <p className="mt-2 text-3xl font-semibold">{quizzes.length}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    goToDocumentDetail("flashcard");
                                }}
                                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300"
                            >
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Flashcard</p>
                                <p className="mt-2 text-3xl font-semibold">{flashcards.length}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    goToDocumentDetail("goals");
                                }}
                                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300"
                            >
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Đến hạn tuần này</p>
                                <p className="mt-2 text-3xl font-semibold">{goalDashboard?.due_this_week_count ?? 0}</p>
                            </button>
                        </section>

                        <section className="mt-8 grid gap-4 xl:grid-cols-2">
                            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">Danh sách tài liệu PDF</h2>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {documents.slice(0, 4).map((doc) => (
                                        <button
                                            key={doc.document_id}
                                            type="button"
                                            onClick={() => {
                                                router.push(`/dashboard/documents/${doc.document_id}`);
                                            }}
                                            className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-400"
                                        >
                                            <p className="truncate font-semibold text-slate-900">{doc.title}</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {getDocumentStatusLabel(doc.extraction_status)}
                                            </p>
                                        </button>
                                    ))}
                                    {!documents.length && (
                                        <p className="col-span-2 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                                            Tải PDF để hiển thị tài liệu tại đây.
                                        </p>
                                    )}
                                </div>
                            </article>

                            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">Lưu ngày học và mục tiêu</h2>
                                <div className="mt-4 grid gap-2">
                                    <input
                                        value={goalTitle}
                                        onChange={(event) => {
                                            setGoalTitle(event.target.value);
                                        }}
                                        placeholder="Ví dụ: Học xong chương 1 trong tuần"
                                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            value={goalTargetDate}
                                            onChange={(event) => {
                                                setGoalTargetDate(event.target.value);
                                            }}
                                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                        />
                                        <select
                                            value={goalRecurrence}
                                            onChange={(event) => {
                                                setGoalRecurrence(event.target.value as GoalRecurrenceType);
                                            }}
                                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                        >
                                            {RECURRENCE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleCreateGoal();
                                        }}
                                        disabled={goalSaving}
                                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {goalSaving ? "Đang lưu..." : "Lưu mục tiêu học"}
                                    </button>
                                </div>

                                <div className="mt-4 space-y-2">
                                    {learningGoals.slice(0, 3).map((goal) => (
                                        <div key={goal.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                            <p className="font-medium text-slate-900">{goal.title}</p>
                                            <p className="text-slate-500">Hạn: {formatDate(goal.target_date)}</p>
                                        </div>
                                    ))}
                                    {!learningGoals.length && (
                                        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                                            Chưa có mục tiêu học nào.
                                        </p>
                                    )}
                                </div>
                            </article>
                        </section>

                        <section className="mt-8 grid gap-4 xl:grid-cols-2">
                            <MarkdownPreview title="Bản tóm tắt PDF" content={markdownContent} />
                            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">Kết quả tạo bài học</h2>
                                <div className="mt-3 space-y-3 text-sm">
                                    <div>
                                        <p className="font-semibold">Quiz gần đây</p>
                                        <div className="mt-2 space-y-2">
                                            {quizzes.slice(0, 3).map((quiz) => (
                                                <button
                                                    key={quiz.quiz_id}
                                                    type="button"
                                                    onClick={() => {
                                                        goToDocumentDetail("quiz", {
                                                            documentId: quiz.document_id,
                                                            quizId: quiz.quiz_id,
                                                        });
                                                    }}
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-emerald-300"
                                                >
                                                    <p className="font-medium text-slate-900">{quiz.title}</p>
                                                    <p className="text-slate-500">Trạng thái: {quiz.quiz_status}</p>
                                                </button>
                                            ))}
                                            {!quizzes.length && (
                                                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-slate-500">
                                                    Chưa có quiz nào.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-semibold">Bộ flashcard gần đây</p>
                                        <div className="mt-2 space-y-2">
                                            {flashcards.slice(0, 3).map((set) => (
                                                <button
                                                    key={set.set_id}
                                                    type="button"
                                                    onClick={() => {
                                                        goToDocumentDetail("flashcard", {
                                                            documentId: set.document_id,
                                                            setId: set.set_id,
                                                        });
                                                    }}
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-emerald-300"
                                                >
                                                    <p className="font-medium text-slate-900">{set.title}</p>
                                                    <p className="text-slate-500">Số thẻ: {set.card_count}</p>
                                                </button>
                                            ))}
                                            {!flashcards.length && (
                                                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-slate-500">
                                                    Chưa có bộ flashcard nào.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        </section>

                        <section className="mt-4">
                            <PdfViewerPanel fileUrl={pdfUrl} />
                        </section>
                    </section>
                </main>
            </div>
        </div>
    );
}
