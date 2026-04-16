"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Plus,
    RefreshCcw,
    Search,
} from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import {
    createManualFlashcardCard,
    createManualFlashcardSet,
    deleteManualFlashcardCard,
    getFlashcardSetDetail,
    listDueFlashcardsToday,
    listFlashcardSets,
    listFlashcardsInSet,
    queueFlashcardGeneration,
    reviewFlashcard,
    updateManualFlashcardCard,
    updateManualFlashcardSet,
} from "@/features/workspace/services/learningService";
import { listDocuments } from "@/features/workspace/services/documentsService";
import type {
    DocumentListItem,
    FlashcardCard,
    FlashcardReviewTodayItem,
    FlashcardSetDetail,
    FlashcardSetListItem,
} from "@/features/workspace/types";

const PAGE_SIZE = 6;

type ViewMode = "library" | "create" | "edit";
type StudySource = "set" | "today";

interface DraftCard {
    id: string;
    front: string;
    back: string;
}

interface EditCard {
    id: string;
    card_id?: string;
    front: string;
    back: string;
}

interface StudyCardItem {
    card_id: string;
    set_id: string;
    front: string;
    back: string;
    last_rating: "hard" | "medium" | "easy" | null;
    next_review_at: string | null;
}

function createEmptyDraftCard(): DraftCard {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        front: "",
        back: "",
    };
}

export function Flashcards() {
    const initialized = useAuthStore((state) => state.initialized);
    const status = useAuthStore((state) => state.status);
    const initSession = useAuthStore((state) => state.initSession);

    const [viewMode, setViewMode] = useState<ViewMode>("library");
    const [isFlipped, setIsFlipped] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [libraryStartIndex, setLibraryStartIndex] = useState(0);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"latest" | "name" | "cards">("latest");
    const [isStudyOpen, setIsStudyOpen] = useState(false);
    const [studySource, setStudySource] = useState<StudySource>("set");

    const [setList, setSetList] = useState<FlashcardSetListItem[]>([]);
    const [documents, setDocuments] = useState<DocumentListItem[]>([]);
    const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

    const [createSetTitle, setCreateSetTitle] = useState("");
    const [createSetDescription, setCreateSetDescription] = useState("");
    const [createSetCategory, setCreateSetCategory] = useState("Chung");
    const [draftCards, setDraftCards] = useState<DraftCard[]>([
        createEmptyDraftCard(),
        createEmptyDraftCard(),
    ]);
    const [editSetTitle, setEditSetTitle] = useState("");
    const [editSetDescription, setEditSetDescription] = useState("");
    const [editSetCategory, setEditSetCategory] = useState("Chung");
    const [editCards, setEditCards] = useState<EditCard[]>([]);
    const [savingEdit, setSavingEdit] = useState(false);

    const [setDetail, setSetDetail] = useState<FlashcardSetDetail | null>(null);
    const [cards, setCards] = useState<FlashcardCard[]>([]);
    const [dueTodayCards, setDueTodayCards] = useState<FlashcardReviewTodayItem[]>([]);
    const [loadingDueToday, setLoadingDueToday] = useState(false);

    const [quickFront, setQuickFront] = useState("");
    const [quickBack, setQuickBack] = useState("");
    const [quickCardType, setQuickCardType] = useState<"term_definition" | "qa" | "cloze">(
        "term_definition",
    );

    const [reviewing, setReviewing] = useState(false);
    const [creatingSet, setCreatingSet] = useState(false);
    const [generatingAiSet, setGeneratingAiSet] = useState(false);
    const [quickAdding, setQuickAdding] = useState(false);
    const [deletingCard, setDeletingCard] = useState(false);
    const [loadingSets, setLoadingSets] = useState(true);
    const [loadingSetData, setLoadingSetData] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!initialized) {
            void initSession();
        }
    }, [initSession, initialized]);

    useEffect(() => {
        const loadData = async () => {
            if (!initialized || status !== "authenticated") {
                return;
            }

            setLoadingSets(true);
            setError(null);

            try {
                const [sets, docs] = await Promise.all([
                    listFlashcardSets(50, 0),
                    listDocuments(50, 0),
                ]);
                setSetList(sets);
                setDocuments(docs);

                if (docs.length > 0) {
                    setSelectedDocumentId(docs[0].document_id);
                }

                const firstCompleted = sets.find(
                    (item) => item.generation_status === "completed",
                )?.set_id;
                setSelectedSetId(firstCompleted ?? sets[0]?.set_id ?? null);
            } catch {
                setError("Không thể tải dữ liệu flashcard.");
            } finally {
                setLoadingSets(false);
            }
        };

        void loadData();
    }, [initialized, status]);

    useEffect(() => {
        const loadSetData = async () => {
            if (!selectedSetId) {
                setSetDetail(null);
                setCards([]);
                return;
            }

            setLoadingSetData(true);
            setError(null);
            setIsFlipped(false);
            setCurrentIndex(0);

            try {
                const [detail, nextCards] = await Promise.all([
                    getFlashcardSetDetail(selectedSetId),
                    listFlashcardsInSet(selectedSetId, 100, 0),
                ]);
                setSetDetail(detail);
                setCards(nextCards);
            } catch {
                setError("Không thể tải chi tiết bộ thẻ.");
            } finally {
                setLoadingSetData(false);
            }
        };

        void loadSetData();
    }, [selectedSetId]);

    const refreshSetList = async () => {
        const sets = await listFlashcardSets(50, 0);
        setSetList(sets);
    };

    const refreshDueTodayCards = async () => {
        const items = await listDueFlashcardsToday(12, 0);
        setDueTodayCards(items);
    };

    const refreshSelectedSetData = async (setId: string | null) => {
        if (!setId) {
            return;
        }

        const [detail, nextCards] = await Promise.all([
            getFlashcardSetDetail(setId),
            listFlashcardsInSet(setId, 100, 0),
        ]);
        setSetDetail(detail);
        setCards(nextCards);
    };

    useEffect(() => {
        const loadDueToday = async () => {
            if (!initialized || status !== "authenticated") {
                return;
            }

            setLoadingDueToday(true);
            try {
                const items = await listDueFlashcardsToday(12, 0);
                setDueTodayCards(items);
            } catch {
                // Keep this section non-blocking to avoid breaking main flashcard page on reminder API failures.
            } finally {
                setLoadingDueToday(false);
            }
        };

        void loadDueToday();
    }, [initialized, status]);

    useEffect(() => {
        if (viewMode !== "edit") {
            return;
        }

        setEditSetTitle(setDetail?.title ?? "");
        const options = (setDetail?.options ?? {}) as Record<string, unknown>;
        setEditSetDescription(typeof options.description === "string" ? options.description : "");
        setEditSetCategory(typeof options.category === "string" ? options.category : "Chung");
        setEditCards(
            cards.map((item) => ({
                id: item.card_id,
                card_id: item.card_id,
                front: item.front,
                back: item.back,
            })),
        );
    }, [viewMode, setDetail, cards]);

    const studyCards = useMemo<StudyCardItem[]>(() => {
        if (studySource === "today") {
            return dueTodayCards.map((item) => ({
                card_id: item.card_id,
                set_id: item.set_id,
                front: item.front,
                back: item.back,
                last_rating: item.last_rating,
                next_review_at: item.next_review_at,
            }));
        }

        return cards.map((item) => ({
            card_id: item.card_id,
            set_id: item.set_id,
            front: item.front,
            back: item.back,
            last_rating: item.last_rating,
            next_review_at: item.next_review_at,
        }));
    }, [studySource, dueTodayCards, cards]);

    const card = useMemo(() => studyCards[currentIndex] ?? null, [studyCards, currentIndex]);

    useEffect(() => {
        setCurrentIndex(0);
        setIsFlipped(false);
    }, [studySource]);

    useEffect(() => {
        if (currentIndex > 0 && currentIndex >= studyCards.length) {
            setCurrentIndex(Math.max(0, studyCards.length - 1));
        }
    }, [studyCards.length, currentIndex]);

    const filteredSets = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        const filtered = setList.filter((item) => item.title.toLowerCase().includes(normalized));

        return filtered.sort((a, b) => {
            if (sortBy === "name") {
                return a.title.localeCompare(b.title, "vi");
            }
            if (sortBy === "cards") {
                return b.card_count - a.card_count;
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [search, setList, sortBy]);

    useEffect(() => {
        if (libraryStartIndex > Math.max(0, filteredSets.length - PAGE_SIZE)) {
            setLibraryStartIndex(Math.max(0, filteredSets.length - PAGE_SIZE));
        }
    }, [filteredSets.length, libraryStartIndex]);

    const visibleSets = useMemo(
        () => filteredSets.slice(libraryStartIndex, libraryStartIndex + PAGE_SIZE),
        [filteredSets, libraryStartIndex],
    );

    const canSlideLeft = libraryStartIndex > 0;
    const canSlideRight = libraryStartIndex + PAGE_SIZE < filteredSets.length;
    const cardStatusLabel = useMemo(() => {
        if (!card) {
            return "";
        }
        if (card.last_rating === null) {
            return "Chưa ôn";
        }

        if (card.next_review_at) {
            const dueAt = new Date(card.next_review_at).getTime();
            if (Date.now() >= dueAt) {
                return `Đến hạn (${card.last_rating})`;
            }
        }

        return `Đã ôn (${card.last_rating})`;
    }, [card]);

    const handleNext = () => {
        if (studyCards.length === 0) {
            return;
        }

        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % studyCards.length);
    };

    const handlePrev = () => {
        if (studyCards.length === 0) {
            return;
        }

        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + studyCards.length) % studyCards.length);
    };

    const handleReview = async (rating: "hard" | "medium" | "easy") => {
        if (!card) {
            return;
        }

        try {
            setReviewing(true);
            setError(null);
            await reviewFlashcard(card.card_id, rating);
            await Promise.all([
                refreshSelectedSetData(selectedSetId),
                refreshDueTodayCards(),
                refreshSetList(),
            ]);
            if (studySource === "set") {
                handleNext();
            }
        } catch {
            setError("Không thể lưu đánh giá thẻ.");
        } finally {
            setReviewing(false);
        }
    };

    const handleCreateSet = () => {
        if (!createSetTitle.trim()) {
            setError("Hãy nhập tiêu đề bộ thẻ.");
            return;
        }

        const run = async () => {
            try {
                setCreatingSet(true);
                setError(null);

                const cardsToCreate = draftCards
                    .map((item) => ({ front: item.front.trim(), back: item.back.trim() }))
                    .filter((item) => item.front.length > 0 && item.back.length > 0);

                if (cardsToCreate.length === 0) {
                    setError("Hãy nhập ít nhất 1 thẻ gồm thuật ngữ và định nghĩa.");
                    setCreatingSet(false);
                    return;
                }

                const createdSet = await createManualFlashcardSet({
                    document_id: selectedDocumentId || null,
                    title: createSetTitle.trim(),
                });

                for (const draft of cardsToCreate) {
                    await createManualFlashcardCard(createdSet.set_id, {
                        card_type: "term_definition",
                        front: draft.front,
                        back: draft.back,
                    });
                }

                setSetList((prev) => [
                    {
                        ...createdSet,
                        card_count: cardsToCreate.length,
                    },
                    ...prev,
                ]);
                setSelectedSetId(createdSet.set_id);
                setIsStudyOpen(true);
                setViewMode("library");

                setCreateSetTitle("");
                setCreateSetDescription("");
                setCreateSetCategory("Chung");
                setDraftCards([createEmptyDraftCard(), createEmptyDraftCard()]);
                setNotice("Đã tạo bộ thẻ mới thành công.");
            } catch (err) {
                const message = err instanceof Error ? err.message : "Không thể tạo bộ thẻ.";
                setError(message);
            } finally {
                setCreatingSet(false);
            }
        };

        void run();
    };

    const addDraftCard = () => {
        setDraftCards((prev) => [...prev, createEmptyDraftCard()]);
    };

    const removeDraftCard = (id: string) => {
        setDraftCards((prev) => {
            if (prev.length <= 1) {
                return prev;
            }
            return prev.filter((item) => item.id !== id);
        });
    };

    const addEditCard = () => {
        setEditCards((prev) => [
            ...prev,
            { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, front: "", back: "" },
        ]);
    };

    const removeEditCard = (id: string) => {
        setEditCards((prev) => prev.filter((item) => item.id !== id));
    };

    const updateEditCard = (id: string, field: "front" | "back", value: string) => {
        setEditCards((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        );
    };

    const handleSaveEditSet = () => {
        if (!selectedSetId) {
            return;
        }

        if (!editSetTitle.trim()) {
            setError("Tiêu đề bộ thẻ không được để trống.");
            return;
        }

        const run = async () => {
            try {
                setSavingEdit(true);
                setError(null);

                await updateManualFlashcardSet(selectedSetId, {
                    title: editSetTitle.trim(),
                    description: editSetDescription.trim() || null,
                    category: editSetCategory.trim() || null,
                });

                const existingCards = cards.filter((item) => item.card_id);
                const editCardsWithContent = editCards
                    .map((item) => ({ ...item, front: item.front.trim(), back: item.back.trim() }))
                    .filter((item) => item.front.length > 0 && item.back.length > 0);

                const editedCardIds = new Set(
                    editCardsWithContent
                        .filter((item) => item.card_id)
                        .map((item) => item.card_id as string),
                );

                for (const existing of existingCards) {
                    if (!editedCardIds.has(existing.card_id)) {
                        await deleteManualFlashcardCard(existing.card_id);
                    }
                }

                for (const item of editCardsWithContent) {
                    if (item.card_id) {
                        await updateManualFlashcardCard(item.card_id, {
                            front: item.front,
                            back: item.back,
                        });
                        continue;
                    }

                    await createManualFlashcardCard(selectedSetId, {
                        card_type: "term_definition",
                        front: item.front,
                        back: item.back,
                    });
                }

                const [updatedDetail, updatedCards, updatedSets] = await Promise.all([
                    getFlashcardSetDetail(selectedSetId),
                    listFlashcardsInSet(selectedSetId, 100, 0),
                    listFlashcardSets(50, 0),
                ]);

                setSetDetail(updatedDetail);
                setCards(updatedCards);
                setSetList(updatedSets);
                setViewMode("library");
                setNotice("Đã cập nhật bộ thẻ thành công.");
            } catch {
                setError("Không thể lưu thay đổi bộ thẻ.");
            } finally {
                setSavingEdit(false);
            }
        };

        void run();
    };

    const updateDraftCard = (id: string, field: "front" | "back", value: string) => {
        setDraftCards((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        );
    };

    const handleQuickAdd = () => {
        if (!selectedSetId || !quickFront.trim() || !quickBack.trim()) {
            setError("Hãy chọn bộ thẻ và nhập đầy đủ mặt trước/mặt sau.");
            return;
        }

        const run = async () => {
            try {
                setQuickAdding(true);
                setError(null);
                await createManualFlashcardCard(selectedSetId, {
                    card_type: quickCardType,
                    front: quickFront.trim(),
                    back: quickBack.trim(),
                });

                await Promise.all([refreshSelectedSetData(selectedSetId), refreshSetList()]);

                setQuickFront("");
                setQuickBack("");
                setNotice("Đã thêm thẻ mới.");
            } catch {
                setError("Không thể thêm flashcard.");
            } finally {
                setQuickAdding(false);
            }
        };

        void run();
    };

    const handleDeleteCurrentCard = () => {
        if (!card || !selectedSetId) {
            return;
        }

        const run = async () => {
            try {
                setDeletingCard(true);
                setError(null);
                await deleteManualFlashcardCard(card.card_id);

                await Promise.all([
                    refreshSelectedSetData(selectedSetId),
                    refreshSetList(),
                    refreshDueTodayCards(),
                ]);

                setCurrentIndex((prev) => Math.max(0, prev - 1));
                setNotice("Đã xóa flashcard.");
            } catch {
                setError("Không thể xóa flashcard.");
            } finally {
                setDeletingCard(false);
            }
        };

        void run();
    };

    const openSet = (setId: string) => {
        setSelectedSetId(setId);
        setStudySource("set");
        setIsStudyOpen(true);
    };

    const handleGenerateAiSet = async () => {
        if (!selectedDocumentId) {
            setError("Vui lòng chọn tài liệu trước khi tạo thẻ bằng AI.");
            return;
        }

        try {
            setGeneratingAiSet(true);
            setError(null);
            const queued = await queueFlashcardGeneration({
                document_id: selectedDocumentId,
                card_count: 20,
                include_images: true,
            });

            await refreshSetList();
            setSelectedSetId(queued.set_id);
            setNotice("Đã gửi yêu cầu tạo bộ thẻ bằng AI.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể tạo bộ thẻ bằng AI.";
            setError(message);
        } finally {
            setGeneratingAiSet(false);
        }
    };

    const handleActivateSearchedSet = () => {
        const firstMatch = filteredSets[0];
        if (!firstMatch) {
            setError("Không tìm thấy bộ thẻ phù hợp.");
            return;
        }

        setError(null);
        openSet(firstMatch.set_id);
    };

    if (viewMode === "create") {
        return (
            <div className="max-w-6xl space-y-6 mx-auto">
                <button
                    type="button"
                    onClick={() => setViewMode("library")}
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Quay lại
                </button>

                <h1 className="text-3xl font-bold text-[#00A651]">Tạo bộ thẻ mới</h1>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 block text-base font-semibold text-slate-800">
                                Tiêu đề bộ thẻ *
                            </label>
                            <input
                                value={createSetTitle}
                                onChange={(event) => setCreateSetTitle(event.target.value)}
                                placeholder="VD: Từ vựng tiếng Anh căn bản..."
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-700 outline-none focus:border-[#00A651]"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-base font-semibold text-slate-800">
                                Mô tả (Tùy chọn)
                            </label>
                            <textarea
                                value={createSetDescription}
                                onChange={(event) => setCreateSetDescription(event.target.value)}
                                placeholder="Thêm mô tả cho bộ thẻ của bạn..."
                                rows={4}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-700 outline-none focus:border-[#00A651]"
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-base font-semibold text-slate-800">
                                    Danh mục
                                </label>
                                <input
                                    value={createSetCategory}
                                    onChange={(event) => setCreateSetCategory(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-700 outline-none focus:border-[#00A651]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-base font-semibold text-slate-800">
                                    Tài liệu liên kết
                                </label>
                                <select
                                    value={selectedDocumentId}
                                    onChange={(event) => setSelectedDocumentId(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-700 outline-none focus:border-[#00A651]"
                                >
                                    <option value="">Không liên kết tài liệu</option>
                                    {!documents.length && (
                                        <option value="">Không có tài liệu</option>
                                    )}
                                    {documents.map((doc) => (
                                        <option key={doc.document_id} value={doc.document_id}>
                                            {doc.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <p className="text-2xl font-bold text-slate-900">
                                Các thẻ ({draftCards.length})
                            </p>

                            <div className="space-y-4">
                                {draftCards.map((draft, index) => (
                                    <div
                                        key={draft.id}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                                            <p className="text-xl font-semibold text-slate-500">
                                                Thẻ {index + 1}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => removeDraftCard(draft.id)}
                                                className="text-sm font-semibold text-slate-500 hover:text-red-600"
                                            >
                                                Xóa
                                            </button>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-base font-semibold text-slate-700">
                                                    Thuật ngữ
                                                </label>
                                                <input
                                                    value={draft.front}
                                                    onChange={(event) =>
                                                        updateDraftCard(
                                                            draft.id,
                                                            "front",
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Nhập thuật ngữ..."
                                                    className="w-full border-b border-slate-300 bg-transparent px-1 py-2 text-base text-slate-700 outline-none focus:border-[#00A651]"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-base font-semibold text-slate-700">
                                                    Định nghĩa
                                                </label>
                                                <input
                                                    value={draft.back}
                                                    onChange={(event) =>
                                                        updateDraftCard(
                                                            draft.id,
                                                            "back",
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Nhập định nghĩa..."
                                                    className="w-full border-b border-slate-300 bg-transparent px-1 py-2 text-base text-slate-700 outline-none focus:border-[#00A651]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={addDraftCard}
                                className="w-full rounded-2xl border-2 border-dashed border-[#00A651] bg-emerald-50 px-6 py-2.5 text-base font-semibold text-[#00A651] hover:bg-emerald-100"
                            >
                                + Thêm thẻ mới
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-6">
                            <button
                                type="button"
                                onClick={() => setViewMode("library")}
                                className="rounded-xl border border-slate-300 px-6 py-3 text-base font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateSet}
                                disabled={creatingSet || !createSetTitle.trim()}
                                className="rounded-xl bg-[#00A651] px-6 py-3 text-base font-semibold text-white hover:bg-[#008f45] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creatingSet ? "Đang lưu..." : "Lưu bộ thẻ"}
                            </button>
                        </div>
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        );
    }

    if (viewMode === "edit") {
        return (
            <div className="max-w-6xl space-y-6 mx-auto">
                <button
                    type="button"
                    onClick={() => setViewMode("library")}
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Quay lại
                </button>

                <h1 className="text-3xl font-bold text-[#00A651]">Chi tiết bộ thẻ</h1>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 block text-base font-semibold text-slate-800">
                                Tiêu đề bộ thẻ *
                            </label>
                            <input
                                value={editSetTitle}
                                onChange={(event) => setEditSetTitle(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-700 outline-none focus:border-[#00A651]"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-base font-semibold text-slate-800">
                                Mô tả
                            </label>
                            <textarea
                                value={editSetDescription}
                                onChange={(event) => setEditSetDescription(event.target.value)}
                                rows={3}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-700 outline-none focus:border-[#00A651]"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-base font-semibold text-slate-800">
                                Danh mục
                            </label>
                            <input
                                value={editSetCategory}
                                onChange={(event) => setEditSetCategory(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-700 outline-none focus:border-[#00A651]"
                            />
                        </div>

                        <div className="space-y-4">
                            <p className="text-xl font-bold text-slate-900">
                                Nội dung thẻ ({editCards.length})
                            </p>
                            {editCards.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="font-semibold text-slate-700">
                                            Thẻ {index + 1}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => removeEditCard(item.id)}
                                            className="text-sm font-semibold text-slate-500 hover:text-red-600"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            value={item.front}
                                            onChange={(event) =>
                                                updateEditCard(item.id, "front", event.target.value)
                                            }
                                            placeholder="Thuật ngữ"
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00A651]"
                                        />
                                        <input
                                            value={item.back}
                                            onChange={(event) =>
                                                updateEditCard(item.id, "back", event.target.value)
                                            }
                                            placeholder="Định nghĩa"
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00A651]"
                                        />
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addEditCard}
                                className="w-full rounded-2xl border-2 border-dashed border-[#00A651] bg-emerald-50 px-6 py-2.5 text-base font-semibold text-[#00A651] hover:bg-emerald-100"
                            >
                                + Thêm thẻ mới
                            </button>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
                            <button
                                type="button"
                                onClick={() => setViewMode("library")}
                                className="rounded-xl border border-slate-300 px-6 py-2.5 text-base font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEditSet}
                                disabled={savingEdit}
                                className="rounded-xl bg-[#00A651] px-6 py-2.5 text-base font-semibold text-white hover:bg-[#008f45] disabled:opacity-50"
                            >
                                {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        );
    }

    return (
        <div className="max-w-6xl space-y-6 mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-green-100 pb-3">
                <div>
                    <h1 className="text-3xl font-bold text-[#00A651]">Quản lý thẻ ghi nhớ</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Tạo, chỉnh sửa và ôn tập các bộ thẻ ghi nhớ của bạn.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-400">
                        <Search className="h-4 w-4" />
                        <input
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setLibraryStartIndex(0);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleActivateSearchedSet();
                                }
                            }}
                            placeholder="Tìm kiếm bộ thẻ..."
                            className="w-44 bg-transparent text-sm text-slate-700 outline-none"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => setViewMode("create")}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#00A651] px-8 py-2 text-base font-semibold text-white hover:bg-[#008f45]"
                    >
                        <Plus className="h-4 w-4" />
                        Tạo bộ thẻ
                    </button>
                </div>
            </div>

            <div className="-mt-2 flex flex-wrap items-center gap-3">
                <select
                    value={selectedDocumentId}
                    onChange={(event) => setSelectedDocumentId(event.target.value)}
                    disabled={!documents.length || generatingAiSet}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00A651] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {!documents.length && <option value="">Chưa có tài liệu</option>}
                    {documents.map((doc) => (
                        <option key={doc.document_id} value={doc.document_id}>
                            {doc.title}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => void handleGenerateAiSet()}
                    disabled={generatingAiSet || !selectedDocumentId}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#00A651] bg-white px-5 py-2 text-sm font-semibold text-[#00A651] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {generatingAiSet ? "Đang tạo thẻ bằng AI..." : "Tạo thẻ bằng AI"}
                </button>
                {!selectedDocumentId && (
                    <p className="text-xs text-slate-500">Chưa có tài liệu để tạo thẻ bằng AI.</p>
                )}
            </div>

            {loadingSets && (
                <p className="text-sm text-slate-500">Đang tải thư viện flashcard...</p>
            )}
            {!loadingSets && filteredSets.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <p className="text-slate-600">Chưa có bộ thẻ nào.</p>
                    <Link
                        href="/documents"
                        className="mt-2 inline-block text-sm font-semibold text-[#00A651] hover:text-[#008f45]"
                    >
                        Đi đến tài liệu để tải file học tập
                    </Link>
                </div>
            )}

            {visibleSets.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setLibraryStartIndex((prev) => Math.max(0, prev - PAGE_SIZE))
                            }
                            disabled={!canSlideLeft}
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            aria-label="Slide left"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setLibraryStartIndex((prev) =>
                                    Math.min(
                                        prev + PAGE_SIZE,
                                        Math.max(0, filteredSets.length - PAGE_SIZE),
                                    ),
                                )
                            }
                            disabled={!canSlideRight}
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            aria-label="Slide right"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 justify-items-start gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {visibleSets.map((setItem) => {
                            const isActive = setItem.set_id === selectedSetId;
                            const statusLabel =
                                setItem.learning_status === "da_hoc_xong"
                                    ? "Hoàn thành"
                                    : setItem.learning_status === "dang_hoc"
                                      ? "Đang học"
                                      : "Chưa học";
                            const statusClass =
                                setItem.learning_status === "da_hoc_xong"
                                    ? "bg-emerald-50 text-[#00A651]"
                                    : setItem.learning_status === "dang_hoc"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-slate-100 text-slate-700";
                            return (
                                <div
                                    key={setItem.set_id}
                                    className={`w-full max-w-[220px] rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md ${
                                        isActive ? "border-[#00A651]" : "border-slate-200"
                                    }`}
                                >
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}
                                        >
                                            {statusLabel}
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                            {setItem.studied_cards}/{setItem.card_count}
                                        </span>
                                    </div>
                                    <h3 className="line-clamp-2 text-lg font-bold text-slate-900">
                                        {setItem.title}
                                    </h3>
                                    <div className="mt-3 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openSet(setItem.set_id)}
                                            className="flex-1 whitespace-nowrap rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-[#00A651] hover:bg-emerald-100"
                                        >
                                            Học ngay
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                openSet(setItem.set_id);
                                                setViewMode("edit");
                                            }}
                                            className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                                        >
                                            Chi tiết
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-emerald-700">{notice}</p>}

            {isStudyOpen && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-[#00A651]" />
                            <p className="text-lg font-semibold text-slate-900">
                                {studySource === "today"
                                    ? "Từ cần học hôm nay"
                                    : (setDetail?.title ?? "Bộ ôn tập")}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setStudySource("set");
                                    if (!selectedSetId && setList.length > 0) {
                                        setSelectedSetId(setList[0].set_id);
                                    }
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                    studySource === "set"
                                        ? "bg-[#00A651] text-white"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                Bộ đang chọn
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setStudySource("today");
                                    setIsStudyOpen(true);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                    studySource === "today"
                                        ? "bg-[#00A651] text-white"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                Từ cần học hôm nay ({dueTodayCards.length})
                            </button>
                        </div>
                    </div>

                    {studySource === "set" && loadingSetData && (
                        <span className="mb-3 block text-sm text-slate-500">
                            Đang tải bộ thẻ...
                        </span>
                    )}
                    {studySource === "today" && loadingDueToday && (
                        <span className="mb-3 block text-sm text-slate-500">
                            Đang tải danh sách hôm nay...
                        </span>
                    )}

                    {studySource === "set" && (
                        <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-[0.7fr_1fr_1fr_auto]">
                            <select
                                value={quickCardType}
                                onChange={(event) =>
                                    setQuickCardType(
                                        event.target.value as "term_definition" | "qa" | "cloze",
                                    )
                                }
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                            >
                                <option value="term_definition">term_definition</option>
                                <option value="qa">qa</option>
                                <option value="cloze">cloze</option>
                            </select>
                            <input
                                value={quickFront}
                                onChange={(event) => setQuickFront(event.target.value)}
                                placeholder="Mặt trước"
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                            />
                            <input
                                value={quickBack}
                                onChange={(event) => setQuickBack(event.target.value)}
                                placeholder="Mặt sau"
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                            />
                            <button
                                type="button"
                                onClick={handleQuickAdd}
                                disabled={
                                    quickAdding ||
                                    !selectedSetId ||
                                    !quickFront.trim() ||
                                    !quickBack.trim()
                                }
                                className="rounded-lg bg-[#00A651] px-4 py-2 text-sm font-semibold text-white hover:bg-[#008f45] disabled:opacity-50"
                            >
                                {quickAdding ? "Đang thêm..." : "Thêm thẻ"}
                            </button>
                        </div>
                    )}

                    {!loadingSetData && studySource === "set" && !card && (
                        <p className="text-sm text-slate-500">Bộ thẻ này chưa có thẻ để ôn tập.</p>
                    )}
                    {!loadingDueToday && studySource === "today" && !card && (
                        <p className="text-sm text-slate-500">
                            Hôm nay không có thẻ nào đến hạn ôn tập.
                        </p>
                    )}

                    {card && (
                        <div className="flex flex-col items-center">
                            <div
                                className="mb-5 h-64 w-full max-w-3xl cursor-pointer [perspective:1000px]"
                                onClick={() => setIsFlipped((prev) => !prev)}
                            >
                                <div
                                    className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                                        isFlipped ? "[transform:rotateX(180deg)]" : ""
                                    }`}
                                >
                                    <div className="absolute flex h-full w-full flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-white p-8 text-center [backface-visibility:hidden]">
                                        <span className="absolute left-5 top-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Front
                                        </span>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {card.front}
                                        </p>
                                        <p className="absolute bottom-4 flex items-center gap-2 text-xs text-slate-400">
                                            <RefreshCcw className="h-3.5 w-3.5" />
                                            Bấm để lật
                                        </p>
                                    </div>
                                    <div className="absolute flex h-full w-full flex-col items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-100 p-8 text-center text-emerald-950 [backface-visibility:hidden] [transform:rotateX(180deg)]">
                                        <span className="absolute left-5 top-4 text-xs font-semibold uppercase tracking-wide text-emerald-900">
                                            Back
                                        </span>
                                        <p className="text-xl font-semibold leading-relaxed">
                                            {card.back}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="rounded-full border border-slate-200 p-3 text-slate-600 hover:bg-slate-50"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsFlipped((prev) => !prev)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Lật thẻ
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="rounded-full bg-[#00A651] p-3 text-white hover:bg-[#008f45]"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>

                            {cardStatusLabel && (
                                <p className="mt-3 text-xs text-slate-500">
                                    Trạng thái: {cardStatusLabel}
                                </p>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleReview("hard")}
                                    disabled={reviewing}
                                    className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                                >
                                    Khó
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleReview("medium")}
                                    disabled={reviewing}
                                    className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                                >
                                    Trung bình
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleReview("easy")}
                                    disabled={reviewing}
                                    className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                    Dễ
                                </button>
                                {studySource === "set" && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteCurrentCard}
                                        disabled={deletingCard}
                                        className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                    >
                                        {deletingCard ? "Đang xóa..." : "Xóa thẻ"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
