"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useState } from "react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { MarkdownPreview } from "@/features/workspace/components/markdown-preview";
import { PdfViewerPanel } from "@/features/workspace/components/pdf-viewer-panel";
import {
    getDocumentDetail,
    getDocumentDownloadUrl,
    getLatestSummaryStatus,
    getSummaryStatus,
    listDocuments,
    queueSummary,
} from "@/features/workspace/services/documentsService";
import {
    createLearningGoal,
    getFlashcardSetDetail,
    getQuizDetail,
    listFlashcardSets,
    listFlashcardsInSet,
    listLearningGoals,
    listQuizzes,
    queueFlashcardGeneration,
    queueQuizGeneration,
    reviewFlashcard,
    submitQuiz,
} from "@/features/workspace/services/learningService";
import type {
    DocumentDetail,
    DocumentListItem,
    FlashcardCard,
    FlashcardSetListItem,
    FlashcardSetDetail,
    GoalRecurrenceType,
    LearningGoal,
    QuizDetail,
    QuizListItem,
    QuizSubmitResponse,
} from "@/features/workspace/types";

type DocumentTab = "summary" | "quiz" | "flashcard" | "goals";

const FALLBACK_PDF_URL = "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

const TAB_ITEMS: Array<{ id: DocumentTab; label: string }> = [
    { id: "summary", label: "Tóm tắt" },
    { id: "quiz", label: "Quiz" },
    { id: "flashcard", label: "Flashcard" },
    { id: "goals", label: "Mục tiêu học" },
];

const RECURRENCE_OPTIONS: Array<{ label: string; value: GoalRecurrenceType }> = [
    { label: "Hằng ngày", value: "daily" },
    { label: "Hằng tuần", value: "weekly" },
    { label: "Hằng tháng", value: "monthly" },
];

const DEFAULT_LEFT_WIDTH = 280;
const DEFAULT_RIGHT_WIDTH = 380;
const MIN_SIDE_WIDTH = 220;
const MAX_SIDE_WIDTH = 460;

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

function formatDateTime(value: string): string {
    return new Date(value).toLocaleString("vi-VN", {
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function DocumentDetailShell({ documentId }: { documentId: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const status = useAuthStore((state) => state.status);
    const initialized = useAuthStore((state) => state.initialized);
    const initSession = useAuthStore((state) => state.initSession);

    const [documents, setDocuments] = useState<DocumentListItem[]>([]);
    const [documentDetail, setDocumentDetail] = useState<DocumentDetail | null>(null);
    const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
    const [flashcards, setFlashcards] = useState<FlashcardSetListItem[]>([]);
    const [goals, setGoals] = useState<LearningGoal[]>([]);

    const [activeTab, setActiveTab] = useState<DocumentTab>("summary");
    const [markdownContent, setMarkdownContent] = useState<string>(
        "Tài liệu này chưa có tóm tắt. Hãy bấm 'Tạo tóm tắt' ở tab bên phải.",
    );
    const [pdfUrl, setPdfUrl] = useState(FALLBACK_PDF_URL);

    const [goalTitle, setGoalTitle] = useState("");
    const [goalTargetDate, setGoalTargetDate] = useState("");
    const [goalRecurrence, setGoalRecurrence] = useState<GoalRecurrenceType>("weekly");

    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [quizLoading, setQuizLoading] = useState(false);
    const [flashcardLoading, setFlashcardLoading] = useState(false);
    const [goalSaving, setGoalSaving] = useState(false);

    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
    const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);

    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [quizDetail, setQuizDetail] = useState<QuizDetail | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitting, setQuizSubmitting] = useState(false);
    const [quizSubmitResult, setQuizSubmitResult] = useState<QuizSubmitResponse | null>(null);

    const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
    const [flashcardSetDetail, setFlashcardSetDetail] = useState<FlashcardSetDetail | null>(null);
    const [flashcardCards, setFlashcardCards] = useState<FlashcardCard[]>([]);
    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const [showCardBack, setShowCardBack] = useState(false);
    const [flashcardReviewing, setFlashcardReviewing] = useState(false);

    const initialTab = searchParams.get("tab");
    const initialQuizId = searchParams.get("quizId");
    const initialSetId = searchParams.get("setId");

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

    const loadDocumentData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const [docsResult, detailResult, downloadResult, quizzesResult, flashcardsResult, goalsResult, latestSummaryResult] =
            await Promise.allSettled([
                listDocuments(20, 0),
                getDocumentDetail(documentId),
                getDocumentDownloadUrl(documentId),
                listQuizzes(20, 0, documentId),
                listFlashcardSets(20, 0, documentId),
                listLearningGoals(20, 0, documentId),
                getLatestSummaryStatus(documentId),
            ]);

        if (docsResult.status === "fulfilled") {
            setDocuments(docsResult.value);
        }

        if (detailResult.status === "fulfilled") {
            setDocumentDetail(detailResult.value);
        } else {
            setError("Không tải được thông tin chi tiết tài liệu.");
        }

        if (downloadResult.status === "fulfilled") {
            setPdfUrl(downloadResult.value.download_url);
        }

        if (quizzesResult.status === "fulfilled") {
            setQuizzes(quizzesResult.value);
        }

        if (flashcardsResult.status === "fulfilled") {
            setFlashcards(flashcardsResult.value);
        }

        if (goalsResult.status === "fulfilled") {
            setGoals(goalsResult.value);
        }

        if (
            latestSummaryResult.status === "fulfilled" &&
            latestSummaryResult.value.summary_status === "completed" &&
            latestSummaryResult.value.content_markdown
        ) {
            setMarkdownContent(latestSummaryResult.value.content_markdown);
        }

        setLoading(false);
    }, [documentId]);

    useEffect(() => {
        if (!initialized || status !== "authenticated") {
            return;
        }

        void loadDocumentData();
    }, [initialized, status, loadDocumentData]);

    useEffect(() => {
        setMarkdownContent("Tài liệu này chưa có tóm tắt. Hãy bấm 'Tạo tóm tắt' ở tab bên phải.");
        setNotice(null);
        setError(null);
        setSelectedQuizId(null);
        setQuizDetail(null);
        setQuizAnswers({});
        setQuizSubmitResult(null);
        setSelectedSetId(null);
        setFlashcardSetDetail(null);
        setFlashcardCards([]);
        setActiveCardIndex(0);
        setShowCardBack(false);
    }, [documentId]);

    useEffect(() => {
        if (initialTab === "summary" || initialTab === "quiz" || initialTab === "flashcard" || initialTab === "goals") {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        if (!initialQuizId || activeTab !== "quiz" || selectedQuizId === initialQuizId) {
            return;
        }

        const loadInitialQuiz = async () => {
            try {
                setError(null);
                setSelectedQuizId(initialQuizId);
                setQuizSubmitResult(null);
                const detail = await getQuizDetail(initialQuizId);
                setQuizDetail(detail);
                setQuizAnswers({});
            } catch {
                // Ignore deep-link preload errors and let manual click handle retries.
            }
        };

        void loadInitialQuiz();
    }, [activeTab, initialQuizId, selectedQuizId]);

    useEffect(() => {
        if (!initialSetId || activeTab !== "flashcard" || selectedSetId === initialSetId) {
            return;
        }

        const loadInitialSet = async () => {
            try {
                setError(null);
                setSelectedSetId(initialSetId);
                const [detail, cards] = await Promise.all([
                    getFlashcardSetDetail(initialSetId),
                    listFlashcardsInSet(initialSetId, 100, 0),
                ]);

                setFlashcardSetDetail(detail);
                setFlashcardCards(cards);
                setActiveCardIndex(0);
                setShowCardBack(false);
            } catch {
                // Ignore deep-link preload errors and let manual click handle retries.
            }
        };

        void loadInitialSet();
    }, [activeTab, initialSetId, selectedSetId]);

    const startResize = (side: "left" | "right") => (event: ReactMouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = side === "left" ? leftWidth : rightWidth;

        const handleMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX;
            const nextWidth =
                side === "left"
                    ? Math.min(MAX_SIDE_WIDTH, Math.max(MIN_SIDE_WIDTH, startWidth + delta))
                    : Math.min(MAX_SIDE_WIDTH, Math.max(MIN_SIDE_WIDTH, startWidth - delta));

            if (side === "left") {
                setLeftWidth(nextWidth);
            } else {
                setRightWidth(nextWidth);
            }
        };

        const handleUp = () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
    };

    const handleGenerateSummary = async () => {
        try {
            setSummaryLoading(true);
            setError(null);
            setNotice(null);

            const queued = await queueSummary(documentId, { mode: "full_map_reduce" });
            let resolved: string | null = null;

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const summary = await getSummaryStatus(documentId, queued.summary_id);
                if (summary.summary_status === "completed" && summary.content_markdown) {
                    resolved = summary.content_markdown;
                    break;
                }

                if (summary.summary_status === "failed") {
                    throw new Error(summary.summary_error ?? "Tạo tóm tắt thất bại.");
                }

                await sleep(1500);
            }

            if (resolved) {
                setMarkdownContent(resolved);
                setNotice("Đã tạo tóm tắt thành công.");
            } else {
                setNotice("Tóm tắt đang tiếp tục xử lý, vui lòng thử lại sau.");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể tạo tóm tắt.";
            setError(message);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleGenerateQuiz = async () => {
        try {
            setQuizLoading(true);
            setError(null);
            await queueQuizGeneration({
                document_id: documentId,
                question_count: 10,
                difficulty: "medium",
                time_limit_seconds: 900,
            });
            const next = await listQuizzes(20, 0, documentId);
            setQuizzes(next);
            setNotice("Đã gửi yêu cầu tạo quiz.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể tạo quiz.";
            setError(message);
        } finally {
            setQuizLoading(false);
        }
    };

    const handleGenerateFlashcards = async () => {
        try {
            setFlashcardLoading(true);
            setError(null);
            await queueFlashcardGeneration({
                document_id: documentId,
                card_count: 20,
                include_images: true,
            });
            const next = await listFlashcardSets(20, 0, documentId);
            setFlashcards(next);
            setNotice("Đã gửi yêu cầu tạo flashcard.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể tạo flashcard.";
            setError(message);
        } finally {
            setFlashcardLoading(false);
        }
    };

    const handleOpenQuiz = async (quizId: string) => {
        try {
            setError(null);
            setSelectedQuizId(quizId);
            setQuizSubmitResult(null);
            const detail = await getQuizDetail(quizId);
            setQuizDetail(detail);
            setQuizAnswers({});
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể mở chi tiết quiz.";
            setError(message);
        }
    };

    const handleSubmitQuiz = async () => {
        if (!quizDetail?.questions?.length) {
            return;
        }

        try {
            setQuizSubmitting(true);
            setError(null);

            const answers = quizDetail.questions.map((question) => ({
                question_index: question.question_index,
                selected_option_index: quizAnswers[question.question_index] ?? null,
            }));

            const result = await submitQuiz(quizDetail.quiz_id, {
                answers,
                time_spent_seconds: 300,
            });

            setQuizSubmitResult(result);
            setNotice("Đã nộp bài quiz.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể nộp quiz.";
            setError(message);
        } finally {
            setQuizSubmitting(false);
        }
    };

    const handleOpenFlashcardSet = async (setId: string) => {
        try {
            setError(null);
            setSelectedSetId(setId);
            const [detail, cards] = await Promise.all([
                getFlashcardSetDetail(setId),
                listFlashcardsInSet(setId, 100, 0),
            ]);

            setFlashcardSetDetail(detail);
            setFlashcardCards(cards);
            setActiveCardIndex(0);
            setShowCardBack(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể mở bộ flashcard.";
            setError(message);
        }
    };

    const handleRateFlashcard = async (rating: "hard" | "medium" | "easy") => {
        const current = flashcardCards[activeCardIndex];
        if (!current) {
            return;
        }

        try {
            setFlashcardReviewing(true);
            setError(null);
            await reviewFlashcard(current.card_id, rating);

            if (activeCardIndex < flashcardCards.length - 1) {
                setActiveCardIndex((prev) => prev + 1);
                setShowCardBack(false);
            } else {
                setNotice("Bạn đã review hết flashcard trong bộ này.");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể lưu đánh giá flashcard.";
            setError(message);
        } finally {
            setFlashcardReviewing(false);
        }
    };

    const handleCreateGoal = async () => {
        if (!goalTitle.trim() || !goalTargetDate) {
            setError("Vui lòng nhập tiêu đề và chọn ngày mục tiêu.");
            return;
        }

        try {
            setGoalSaving(true);
            setError(null);
            await createLearningGoal({
                title: goalTitle.trim(),
                target_date: goalTargetDate,
                recurrence_type: goalRecurrence,
                document_id: documentId,
                reminder_enabled: true,
            });
            const nextGoals = await listLearningGoals(20, 0, documentId);
            setGoals(nextGoals);
            setGoalTitle("");
            setGoalTargetDate("");
            setNotice("Đã lưu mục tiêu học.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể lưu mục tiêu học.";
            setError(message);
        } finally {
            setGoalSaving(false);
        }
    };

    if (status === "loading" || !initialized || loading) {
        return (
            <main className="grid min-h-screen place-items-center bg-[var(--yl-surface)] px-6 text-[var(--yl-ink)]">
                <p className="text-sm text-slate-500">Đang tải trang tài liệu...</p>
            </main>
        );
    }

    if (!user || !documentDetail) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--yl-surface)] text-[var(--yl-ink)]">
            <div className="mx-auto flex w-full max-w-[1680px] gap-0 lg:min-h-screen">
                <aside
                    className="hidden border-r border-slate-200 bg-[var(--yl-sidebar)] px-4 py-5 lg:block"
                    style={{ width: leftWidth }}
                >
                    <p className="text-xl font-bold tracking-tight">EduSmart</p>
                    <Link href="/dashboard" className="mt-4 inline-flex text-sm text-slate-600 hover:text-slate-900">
                        ← Quay lại bảng điều khiển
                    </Link>

                    <div className="mt-6 space-y-2">
                        {documents.slice(0, 8).map((doc) => (
                            <button
                                key={doc.document_id}
                                type="button"
                                onClick={() => {
                                    router.push(`/dashboard/documents/${doc.document_id}`);
                                }}
                                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                                    doc.document_id === documentId
                                        ? "border-emerald-400 bg-emerald-50"
                                        : "border-slate-200 bg-white hover:border-emerald-300"
                                }`}
                            >
                                <p className="truncate font-medium text-slate-800">{doc.title}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(doc.file_size)}</p>
                            </button>
                        ))}
                    </div>
                </aside>

                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Điều chỉnh độ rộng danh sách tài liệu"
                    onMouseDown={startResize("left")}
                    className="hidden w-2 cursor-col-resize bg-transparent transition hover:bg-slate-200 lg:block"
                />

                <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
                    <header className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <h1 className="truncate text-xl font-semibold text-slate-900">{documentDetail.title}</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {documentDetail.total_pages ?? "?"} trang • {formatFileSize(documentDetail.file_size)}
                        </p>
                    </header>

                    {notice && (
                        <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            {notice}
                        </p>
                    )}
                    {error && (
                        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {error}
                        </p>
                    )}

                    <div className="flex flex-col gap-0 xl:h-[calc(100vh-180px)] xl:min-h-[640px] xl:flex-row">
                        <div className="min-w-0 flex-1">
                            <PdfViewerPanel fileUrl={pdfUrl} fullHeight />
                        </div>

                        <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Điều chỉnh độ rộng bảng công cụ"
                            onMouseDown={startResize("right")}
                            className="hidden w-2 cursor-col-resize bg-transparent transition hover:bg-slate-200 xl:block"
                        />

                        <aside
                            className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:mt-0 xl:overflow-hidden"
                            style={{ width: `min(100%, ${rightWidth}px)` }}
                        >
                            <div className="mb-4 flex flex-wrap gap-2">
                                {TAB_ITEMS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                        }}
                                        className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                                            activeTab === tab.id
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {activeTab === "summary" && (
                                <div className="space-y-3 xl:flex xl:h-[calc(100%-52px)] xl:flex-col">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleGenerateSummary();
                                        }}
                                        disabled={summaryLoading}
                                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:border-emerald-400"
                                    >
                                        {summaryLoading ? "Đang tạo tóm tắt..." : "Tạo tóm tắt"}
                                    </button>
                                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                        <MarkdownPreview title="Tóm tắt tài liệu" content={markdownContent} compact />
                                    </div>
                                </div>
                            )}

                            {activeTab === "quiz" && (
                                <div className="space-y-3 text-sm xl:max-h-[calc(100%-52px)] xl:overflow-y-auto xl:pr-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleGenerateQuiz();
                                        }}
                                        disabled={quizLoading}
                                        className="rounded-xl border border-slate-300 px-3 py-2 font-medium hover:border-emerald-400"
                                    >
                                        {quizLoading ? "Đang tạo quiz..." : "Tạo quiz mới"}
                                    </button>

                                    {quizzes.map((quiz) => (
                                        <button
                                            key={quiz.quiz_id}
                                            type="button"
                                            onClick={() => {
                                                void handleOpenQuiz(quiz.quiz_id);
                                            }}
                                            className={`w-full rounded-xl border p-2 text-left transition ${
                                                selectedQuizId === quiz.quiz_id
                                                    ? "border-emerald-400 bg-emerald-50"
                                                    : "border-slate-200 hover:border-emerald-300"
                                            }`}
                                        >
                                            <p className="font-medium">{quiz.title}</p>
                                            <p className="text-slate-500">Trạng thái: {quiz.quiz_status}</p>
                                            <p className="text-xs text-slate-400">Tạo lúc: {formatDateTime(quiz.created_at)}</p>
                                        </button>
                                    ))}
                                    {!quizzes.length && <p className="text-slate-500">Chưa có quiz cho tài liệu này.</p>}

                                    {quizDetail && quizDetail.quiz_status === "completed" && quizDetail.questions?.length && (
                                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="font-semibold text-slate-900">{quizDetail.title}</p>
                                            {quizDetail.questions.map((question) => (
                                                <div key={question.question_index} className="rounded-lg bg-white p-3">
                                                    <p className="font-medium">
                                                        Câu {question.question_index}: {question.question_text}
                                                    </p>
                                                    <div className="mt-2 space-y-1">
                                                        {question.options.map((option, optionIndex) => (
                                                            <label key={`${question.question_index}-${optionIndex}`} className="flex cursor-pointer items-start gap-2 text-slate-700">
                                                                <input
                                                                    type="radio"
                                                                    name={`question-${question.question_index}`}
                                                                    checked={quizAnswers[question.question_index] === optionIndex}
                                                                    onChange={() => {
                                                                        setQuizAnswers((prev) => ({
                                                                            ...prev,
                                                                            [question.question_index]: optionIndex,
                                                                        }));
                                                                    }}
                                                                />
                                                                <span>{option}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void handleSubmitQuiz();
                                                }}
                                                disabled={quizSubmitting}
                                                className="rounded-xl border border-slate-300 px-3 py-2 font-medium hover:border-emerald-400"
                                            >
                                                {quizSubmitting ? "Đang nộp..." : "Nộp bài quiz"}
                                            </button>
                                        </div>
                                    )}

                                    {quizDetail && quizDetail.quiz_status !== "completed" && (
                                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                                            Quiz đang ở trạng thái {quizDetail.quiz_status}. Vui lòng đợi xử lý xong rồi mở lại.
                                        </p>
                                    )}

                                    {quizSubmitResult && (
                                        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-slate-700">
                                            <p className="font-semibold text-emerald-800">Kết quả: {quizSubmitResult.score.toFixed(2)} điểm</p>
                                            <p>
                                                Đúng: {quizSubmitResult.correct_count} • Sai: {quizSubmitResult.incorrect_count} • Bỏ qua: {quizSubmitResult.skipped_count}
                                            </p>
                                            <div className="space-y-2">
                                                {quizSubmitResult.results.map((result) => {
                                                    const question = quizDetail?.questions?.find(
                                                        (item) => item.question_index === result.question_index,
                                                    );
                                                    const selectedText =
                                                        result.selected_option_index !== null && question
                                                            ? question.options[result.selected_option_index]
                                                            : "(Bỏ qua)";
                                                    const correctText = question
                                                        ? question.options[result.correct_option_index]
                                                        : `Đáp án ${result.correct_option_index + 1}`;

                                                    return (
                                                        <div key={result.question_index} className="rounded-lg border border-emerald-200 bg-white p-2 text-sm">
                                                            <p className="font-medium text-slate-900">Câu {result.question_index}</p>
                                                            <p className="text-slate-600">Bạn chọn: {selectedText}</p>
                                                            <p className="text-emerald-700">Đáp án đúng: {correctText}</p>
                                                            <p className="text-slate-500">Giải thích: {result.explanation}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === "flashcard" && (
                                <div className="space-y-3 text-sm xl:max-h-[calc(100%-52px)] xl:overflow-y-auto xl:pr-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleGenerateFlashcards();
                                        }}
                                        disabled={flashcardLoading}
                                        className="rounded-xl border border-slate-300 px-3 py-2 font-medium hover:border-emerald-400"
                                    >
                                        {flashcardLoading ? "Đang tạo flashcard..." : "Tạo flashcard mới"}
                                    </button>

                                    {flashcards.map((set) => (
                                        <button
                                            key={set.set_id}
                                            type="button"
                                            onClick={() => {
                                                void handleOpenFlashcardSet(set.set_id);
                                            }}
                                            className={`w-full rounded-xl border p-2 text-left transition ${
                                                selectedSetId === set.set_id
                                                    ? "border-emerald-400 bg-emerald-50"
                                                    : "border-slate-200 hover:border-emerald-300"
                                            }`}
                                        >
                                            <p className="font-medium">{set.title}</p>
                                            <p className="text-slate-500">Số thẻ: {set.card_count}</p>
                                            <p className="text-xs text-slate-400">Trạng thái: {set.generation_status}</p>
                                        </button>
                                    ))}
                                    {!flashcards.length && <p className="text-slate-500">Chưa có flashcard cho tài liệu này.</p>}

                                    {flashcardSetDetail && flashcardSetDetail.generation_status !== "completed" && (
                                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                                            Bộ thẻ đang ở trạng thái {flashcardSetDetail.generation_status}. Vui lòng thử mở lại sau.
                                        </p>
                                    )}

                                    {flashcardSetDetail && flashcardSetDetail.generation_status === "completed" && flashcardCards.length > 0 && (
                                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="font-semibold text-slate-900">{flashcardSetDetail.title}</p>
                                            <p className="text-xs text-slate-500">
                                                Thẻ {activeCardIndex + 1}/{flashcardCards.length}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowCardBack((prev) => !prev);
                                                }}
                                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-6 text-left"
                                            >
                                                <p className="text-xs uppercase tracking-wide text-slate-400">
                                                    {showCardBack ? "Mặt sau" : "Mặt trước"}
                                                </p>
                                                <p className="mt-2 font-medium text-slate-800">
                                                    {showCardBack
                                                        ? flashcardCards[activeCardIndex]?.back
                                                        : flashcardCards[activeCardIndex]?.front}
                                                </p>
                                            </button>

                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={flashcardReviewing}
                                                    onClick={() => {
                                                        void handleRateFlashcard("hard");
                                                    }}
                                                    className="rounded-lg border border-rose-300 px-2 py-1 text-rose-700"
                                                >
                                                    Khó
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={flashcardReviewing}
                                                    onClick={() => {
                                                        void handleRateFlashcard("medium");
                                                    }}
                                                    className="rounded-lg border border-amber-300 px-2 py-1 text-amber-700"
                                                >
                                                    Vừa
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={flashcardReviewing}
                                                    onClick={() => {
                                                        void handleRateFlashcard("easy");
                                                    }}
                                                    className="rounded-lg border border-emerald-300 px-2 py-1 text-emerald-700"
                                                >
                                                    Dễ
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === "goals" && (
                                <div className="space-y-3 text-sm">
                                    <input
                                        value={goalTitle}
                                        onChange={(event) => {
                                            setGoalTitle(event.target.value);
                                        }}
                                        placeholder="Tên mục tiêu học"
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            value={goalTargetDate}
                                            onChange={(event) => {
                                                setGoalTargetDate(event.target.value);
                                            }}
                                            className="rounded-xl border border-slate-300 px-3 py-2"
                                        />
                                        <select
                                            value={goalRecurrence}
                                            onChange={(event) => {
                                                setGoalRecurrence(event.target.value as GoalRecurrenceType);
                                            }}
                                            className="rounded-xl border border-slate-300 px-3 py-2"
                                        >
                                            {RECURRENCE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
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
                                        className="rounded-xl border border-slate-300 px-3 py-2 font-medium hover:border-emerald-400"
                                    >
                                        {goalSaving ? "Đang lưu..." : "Lưu mục tiêu học"}
                                    </button>

                                    {goals.map((goal) => (
                                        <div key={goal.id} className="rounded-xl border border-slate-200 p-2">
                                            <p className="font-medium">{goal.title}</p>
                                            <p className="text-slate-500">Mục tiêu: {goal.target_date}</p>
                                        </div>
                                    ))}
                                    {!goals.length && <p className="text-slate-500">Chưa có mục tiêu cho tài liệu này.</p>}
                                </div>
                            )}
                        </aside>
                    </div>
                </main>
            </div>
        </div>
    );
}
