"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw, ChevronLeft, ChevronRight, Layers } from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import {
  getFlashcardSetDetail,
  listFlashcardSets,
  listFlashcardsInSet,
  reviewFlashcard,
} from "@/features/workspace/services/learningService";
import type { FlashcardCard, FlashcardSetDetail, FlashcardSetListItem } from "@/features/workspace/types";

export function Flashcards() {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const initSession = useAuthStore((state) => state.initSession);

  const [isFlipped, setIsFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setList, setSetList] = useState<FlashcardSetListItem[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [setDetail, setSetDetail] = useState<FlashcardSetDetail | null>(null);
  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      void initSession();
    }
  }, [initSession, initialized]);

  useEffect(() => {
    const loadSetList = async () => {
      if (!initialized || status !== "authenticated") {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sets = await listFlashcardSets(20, 0);
        setSetList(sets);
        setSelectedSetId(sets.find((item) => item.generation_status === "completed")?.set_id ?? sets[0]?.set_id ?? null);
      } catch {
        setError("Không thể tải danh sách bộ flashcards.");
      } finally {
        setLoading(false);
      }
    };

    void loadSetList();
  }, [initialized, status]);

  useEffect(() => {
    const loadSetDetail = async () => {
      if (!selectedSetId) {
        return;
      }

      setLoading(true);
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
        setError("Không thể tải dữ liệu flashcards.");
      } finally {
        setLoading(false);
      }
    };

    void loadSetDetail();
  }, [selectedSetId]);

  const card = useMemo(() => cards[currentIndex] ?? null, [cards, currentIndex]);

  const handleNext = () => {
    if (cards.length === 0) {
      return;
    }

    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    if (cards.length === 0) {
      return;
    }

    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const handleReview = async (rating: "hard" | "medium" | "easy") => {
    if (!card) {
      return;
    }

    try {
      setReviewing(true);
      setError(null);
      await reviewFlashcard(card.card_id, rating);
      handleNext();
    } catch {
      setError("Không thể lưu đánh giá thẻ.");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00A651]">Thẻ ghi nhớ</h1>
          <p className="text-gray-600 mt-2">Ôn tập từ vựng và khái niệm qua các flashcards.</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg text-[#00A651] font-medium">
          <Layers className="w-5 h-5" />
          {cards.length === 0 ? "0 / 0" : `${currentIndex + 1} / ${cards.length}`}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <label className="text-sm text-gray-600">Chọn bộ flashcards</label>
        <select
          value={selectedSetId ?? ""}
          onChange={(event) => setSelectedSetId(event.target.value)}
          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg"
        >
          {setList.length === 0 && <option value="">Chưa có bộ flashcards</option>}
          {setList.map((setItem) => (
            <option key={setItem.set_id} value={setItem.set_id}>
              {setItem.title} ({setItem.generation_status})
            </option>
          ))}
        </select>
        {setDetail && (
          <p className="mt-2 text-xs text-gray-500">
            {setDetail.title} - {setDetail.card_count} thẻ
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Đang tải flashcards...</p>}
      {!loading && !card && <p className="text-sm text-gray-500">Bộ thẻ chưa có dữ liệu để ôn tập.</p>}

      {card && (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        {/* Flashcard */}
        <div 
          className="w-full max-w-2xl h-80 [perspective:1000px] cursor-pointer mb-8"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? "[transform:rotateX(180deg)]" : ""}`}>
            
            {/* Front */}
            <div className="absolute w-full h-full [backface-visibility:hidden] bg-white border-2 border-[#00A651] rounded-3xl shadow-lg flex flex-col items-center justify-center p-8 text-center">
              <span className="absolute top-6 left-6 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Thuật ngữ
              </span>
              <span className="absolute top-6 right-6 text-xs font-semibold bg-green-50 text-[#00A651] px-3 py-1 rounded-full">
                {setDetail?.title ?? "Flashcard"}
              </span>
              <h2 className="text-4xl font-bold text-gray-900">{card.front}</h2>
              <p className="absolute bottom-6 text-gray-400 flex items-center gap-2 text-sm">
                <RefreshCcw className="w-4 h-4" />
                Nhấp để lật
              </p>
            </div>

            {/* Back */}
            <div className="absolute w-full h-full [backface-visibility:hidden] bg-[#00A651] text-white border-2 border-[#00A651] rounded-3xl shadow-lg flex flex-col items-center justify-center p-12 text-center [transform:rotateX(180deg)]">
              <span className="absolute top-6 left-6 text-sm font-semibold text-green-200 uppercase tracking-wider">
                Định nghĩa
              </span>
              <p className="text-2xl font-medium leading-relaxed">{card.back}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button 
            onClick={handlePrev}
            className="w-14 h-14 bg-white border border-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-50 hover:text-[#00A651] hover:border-[#00A651] transition-all shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => setIsFlipped(!isFlipped)}
            className="px-8 py-3 bg-white border-2 border-[#00A651] text-[#00A651] font-bold rounded-xl hover:bg-green-50 transition-colors shadow-sm"
          >
            Lật thẻ
          </button>
          
          <button 
            onClick={handleNext}
            className="w-14 h-14 bg-[#00A651] text-white rounded-full flex items-center justify-center hover:bg-[#008f45] transition-all shadow-sm shadow-green-200"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleReview("hard")}
            disabled={reviewing}
            className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            Khó
          </button>
          <button
            type="button"
            onClick={() => void handleReview("medium")}
            disabled={reviewing}
            className="px-4 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50"
          >
            Trung bình
          </button>
          <button
            type="button"
            onClick={() => void handleReview("easy")}
            disabled={reviewing}
            className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
          >
            Dễ
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
