"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  listLearningGoals,
  getLearningGoalDashboard,
  listQuizzes,
  listFlashcardSets,
} from "@/features/workspace/services/learningService";
import { listDocuments } from "@/features/workspace/services/documentsService";
import type {
  LearningGoal,
  LearningGoalDashboard,
} from "@/features/workspace/types";

const statusConfig: Record<LearningGoal["status"], { label: string; text: string }> = {
  in_progress: { label: "Đang thực hiện", text: "text-[#00A651]" },
  completed: { label: "Hoàn thành", text: "text-emerald-600" },
  overdue: { label: "Trễ hạn", text: "text-red-600" },
  archived: { label: "Đã lưu trữ", text: "text-gray-500" },
};

interface ActivityItem {
  id: string;
  type: "quiz" | "document" | "flashcard";
  title: string;
  time: string;
  subtitle?: string;
}

export function Goals() {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const initSession = useAuthStore((state) => state.initSession);

  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [dashboard, setDashboard] = useState<LearningGoalDashboard | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      void initSession();
    }
  }, [initSession, initialized]);

  const loadData = useCallback(async () => {
    if (!initialized || status !== "authenticated") {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [goalList, overview, documents, quizzes, flashcards] = await Promise.all([
        listLearningGoals({ limit: 50 }),
        getLearningGoalDashboard(),
        listDocuments(5),
        listQuizzes(5),
        listFlashcardSets(5),
      ]);

      setGoals(goalList.slice(0, 10));
      setDashboard(overview);

      // Combine recent activities
      const allActivities: ActivityItem[] = [];

      if (quizzes && Array.isArray(quizzes)) {
        quizzes.forEach((quiz: any) => {
          allActivities.push({
            id: quiz.id,
            type: "quiz",
            title: `Completed Quiz: ${quiz.title || "Untitled"}`,
            time: "2 hours ago",
            subtitle: quiz.description,
          });
        });
      }

      if (documents && Array.isArray(documents)) {
        documents.forEach((doc: any) => {
          allActivities.push({
            id: doc.id,
            type: "document",
            title: `Uploaded "${doc.title || "Document"}"`,
            time: "Yesterday",
            subtitle: `${doc.page_count || 0} pages`,
          });
        });
      }

      if (flashcards && Array.isArray(flashcards)) {
        flashcards.forEach((fc: any) => {
          allActivities.push({
            id: fc.id,
            type: "flashcard",
            title: `Created ${fc.card_count || 0} Flashcards for ${fc.title || "Topic"}`,
            time: "2 days ago",
          });
        });
      }

      setActivities(allActivities.slice(0, 5));
    } catch {
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [initialized, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return "📝";
      case "document":
        return "📄";
      case "flashcard":
        return "🗂";
      default:
        return "•";
    }
  };

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <section className="pt-0 pb-3">
        <h1 className="text-3xl md:text-4xl font-bold text-[#00A651]">Mục tiêu học tập</h1>
        <p className="text-gray-600 mt-2">Quản lý và theo dõi các mục tiêu của bạn</p>
      </section>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Current Goals */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Mục tiêu hiện tại</h2>
            <Link href="/goals/new" className="text-sm font-medium text-[#00A651] hover:underline">
              Thêm mục tiêu
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {goals.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
                Chưa có mục tiêu nào. Hãy tạo mới để bắt đầu.
              </p>
            ) : (
              goals.map((goal) => {
                const meta = statusConfig[goal.status];
                return (
                  <div key={goal.id} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{goal.title}</h3>
                        <p className="mt-1 text-xs text-gray-500">{goal.description || "Chưa có mô tả"}</p>
                      </div>
                      <span className={`ml-2 inline-block text-xs font-medium ${meta.text}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-[#00A651]"
                            style={{ width: `${Math.min(Math.max(goal.progress, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="ml-3 text-xs font-medium text-gray-600">{goal.progress}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column - Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h2>

          <div className="mt-4 space-y-3">
            {activities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                Chưa có hoạt động nào
              </p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300">
                  <div className="flex gap-3">
                    <span className="text-lg">{getActivityIcon(activity.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      {activity.subtitle && (
                        <p className="text-xs text-gray-500 truncate">{activity.subtitle}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {activities.length > 0 && (
            <button className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-center text-sm font-medium text-gray-600 hover:bg-gray-50">
              Xem toàn bộ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
