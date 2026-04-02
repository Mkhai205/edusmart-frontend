"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { getQuizDetail, listQuizzes, submitQuiz } from "@/features/workspace/services/learningService";
import type { QuizDetail, QuizSubmitResponse } from "@/features/workspace/types";

export function Quiz() {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const initSession = useAuthStore((state) => state.initSession);

  const [quizList, setQuizList] = useState<Array<{ quiz_id: string; title: string; quiz_status: string }>>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [quizDetail, setQuizDetail] = useState<QuizDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitResult, setSubmitResult] = useState<QuizSubmitResponse | null>(null);
  const [showFullResults, setShowFullResults] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!initialized) {
      void initSession();
    }
  }, [initSession, initialized]);

  useEffect(() => {
    const loadQuizList = async () => {
      if (!initialized || status !== "authenticated") {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const list = await listQuizzes(20, 0);
        setQuizList(list);

        const defaultQuizId = list.find((item) => item.quiz_status === "completed")?.quiz_id ?? list[0]?.quiz_id;
        if (defaultQuizId) {
          setSelectedQuizId(defaultQuizId);
        }
      } catch {
        setError("Không thể tải danh sách quiz.");
      } finally {
        setLoading(false);
      }
    };

    void loadQuizList();
  }, [initialized, status]);

  useEffect(() => {
    const loadQuizDetail = async () => {
      if (!selectedQuizId) {
        return;
      }

      setLoading(true);
      setError(null);
      setSubmitResult(null);
      setShowFullResults(false);
      setAnswers({});
      setCurrentQuestion(0);
      setStartTime(Date.now());

      try {
        const detail = await getQuizDetail(selectedQuizId);
        setQuizDetail(detail);
      } catch {
        setError("Không thể tải nội dung quiz.");
      } finally {
        setLoading(false);
      }
    };

    void loadQuizDetail();
  }, [selectedQuizId]);

  const questions = quizDetail?.questions ?? [];
  const question = questions[currentQuestion] ?? null;

  const currentAnswer = useMemo(() => {
    if (!question) {
      return null;
    }
    return answers[question.question_index] ?? null;
  }, [answers, question]);

  const resultByQuestionIndex = useMemo(() => {
    return new Map((submitResult?.results ?? []).map((item) => [item.question_index, item]));
  }, [submitResult]);

  const handleSelect = (index: number) => {
    if (submitResult || !question) {
      return;
    }

    setAnswers((prev) => ({ ...prev, [question.question_index]: index }));
  };

  const handleNextOrSubmit = async () => {
    if (!question) {
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      return;
    }

    if (!quizDetail) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payloadAnswers = questions.map((item) => ({
        question_index: item.question_index,
        selected_option_index: answers[item.question_index] ?? null,
      }));

      const timeSpentSeconds = Math.max(1, Math.floor((Date.now() - startTime) / 1000));

      const result = await submitQuiz(quizDetail.quiz_id, {
        answers: payloadAnswers,
        time_spent_seconds: timeSpentSeconds,
      });

      setSubmitResult(result);
      setShowFullResults(false);
    } catch {
      setError("Nộp bài thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="border-b border-green-100 pb-3">
          <h1 className="text-3xl font-bold text-[#00A651]">Bài trắc nghiệm</h1>
          <p className="text-gray-600 mt-2">
            Đánh giá kiến thức từ tài liệu bạn đã tạo quiz
          </p>
        </div>

      <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg text-[#00A651] font-medium">
          <Clock className="w-5 h-5" />
          {submitResult ? `${submitResult.time_spent_seconds}s` : `${Math.floor((Date.now() - startTime) / 1000)}s`}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <label className="text-sm text-gray-600">Chọn quiz</label>
        <select
          value={selectedQuizId ?? ""}
          onChange={(event) => setSelectedQuizId(event.target.value)}
          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg"
        >
          {quizList.length === 0 && <option value="">Chưa có quiz</option>}
          {quizList.map((quiz) => (
            <option key={quiz.quiz_id} value={quiz.quiz_id}>
              {quiz.title} ({quiz.quiz_status})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {submitResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-sm text-emerald-700">Kết quả bài làm</p>
          <h3 className="text-2xl font-bold text-emerald-900 mt-1">
            {submitResult.correct_count}/{submitResult.total_questions} câu đúng - {submitResult.score.toFixed(1)} điểm
          </h3>
          <button
            type="button"
            onClick={() => setShowFullResults((prev) => !prev)}
            className="mt-4 px-4 py-2 text-sm font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
          >
            {showFullResults ? "Ẩn toàn bộ kết quả" : "Xem toàn bộ kết quả"}
          </button>
        </div>
      )}

      {submitResult && showFullResults && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h4 className="text-lg font-bold text-gray-900">Tổng kết theo từng câu</h4>
          {submitResult.results.map((result) => {
            const questionItem = questions.find((item) => item.question_index === result.question_index);
            const selectedOption =
              result.selected_option_index !== null && questionItem
                ? questionItem.options[result.selected_option_index]
                : null;
            const correctOption = questionItem?.options[result.correct_option_index] ?? "";

            return (
              <div
                key={result.question_index}
                className={`rounded-xl border p-4 ${result.is_correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
              >
                <p className="text-sm font-semibold text-gray-800">Câu {result.question_index + 1}</p>
                <p className="text-sm text-gray-700 mt-1">
                  Bạn chọn: {selectedOption ?? "Bỏ qua"}
                </p>
                <p className="text-sm text-gray-700 mt-1">Đáp án đúng: {correctOption}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuestion(result.question_index);
                    setShowFullResults(false);
                  }}
                  className="mt-3 text-sm font-medium text-[#00A651] hover:text-[#008f45]"
                >
                  Quay lại câu này
                </button>
              </div>
            );
          })}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Đang tải quiz...</p>}
      {!loading && !question && <p className="text-sm text-gray-500">Quiz chưa sẵn sàng hoặc chưa có câu hỏi.</p>}

      {question && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Câu hỏi {currentQuestion + 1} / {questions.length}
          </span>
          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <button
                key={idx} 
                type="button"
                onClick={() => {
                  if (submitResult) {
                    setCurrentQuestion(idx);
                  }
                }}
                className={`w-8 h-2 rounded-full ${idx === currentQuestion ? 'bg-[#00A651]' : idx < currentQuestion ? 'bg-green-200' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-8 leading-snug">
          {question.question_text}
        </h2>

        <div className="space-y-4">
          {question.options.map((option, index) => {
            const isSelected = currentAnswer === index;
            const result = resultByQuestionIndex.get(question.question_index);
            const isCorrect = result?.correct_option_index === index;
            
            let buttonClass = "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ";
            
            if (!submitResult) {
              buttonClass += isSelected 
                ? "border-[#00A651] bg-green-50 text-[#00A651]" 
                : "border-gray-200 hover:border-green-200 hover:bg-gray-50 text-gray-700";
            } else {
              if (isCorrect) {
                buttonClass += "border-green-500 bg-green-50 text-green-700";
              } else if (isSelected && !isCorrect) {
                buttonClass += "border-red-500 bg-red-50 text-red-700";
              } else {
                buttonClass += "border-gray-200 text-gray-500 opacity-50";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                disabled={Boolean(submitResult)}
                className={buttonClass}
              >
                <span className="font-medium text-lg">{option}</span>
                {submitResult && isCorrect && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                {submitResult && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500" />}
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
          {!submitResult ? (
            <button
              onClick={() => void handleNextOrSubmit()}
              disabled={currentAnswer === null || submitting}
              className={`px-8 py-3 rounded-xl font-bold transition-colors ${
                currentAnswer !== null && !submitting
                  ? "bg-[#00A651] text-white hover:bg-[#008f45]" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {currentQuestion < questions.length - 1 ? "Câu tiếp theo" : "Nộp bài"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowFullResults((prev) => !prev)}
                className="px-8 py-3 bg-white text-[#00A651] border border-green-200 rounded-xl font-bold hover:bg-green-50 transition-colors"
              >
                {showFullResults ? "Ẩn kết quả" : "Xem toàn bộ kết quả"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitResult(null);
                  setShowFullResults(false);
                  setAnswers({});
                  setCurrentQuestion(0);
                  setStartTime(Date.now());
                }}
                className="px-8 py-3 bg-[#00A651] text-white rounded-xl font-bold hover:bg-[#008f45] transition-colors flex items-center gap-2"
              >
                Làm lại
              </button>
            </>
          )}
        </div>
      </div>
      )}
    </div>
    </div>
  );
}
