"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { 
  HelpCircle,
  Layers,
  Upload,
  PlayCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FileText
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { listDocuments } from "@/features/workspace/services/documentsService";
import {
  listQuizzes,
  listFlashcardSets,
  listLearningGoals,
  listLearningGoalProgressLogs,
  getLearningGoalDashboard,
  createLearningGoal,
} from "@/features/workspace/services/learningService";
import type {
  DocumentListItem,
  QuizListItem,
  FlashcardSetListItem,
  LearningGoal,
  LearningGoalDashboard,
  LearningGoalProgressLog,
  GoalRecurrenceType,
} from "@/features/workspace/types";

interface ActivityItem {
  id: string;
  type: "document" | "quiz" | "flashcards";
  label: string;
  meta: string;
  created_at: string;
}

export function Dashboard() {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const initSession = useAuthStore((state) => state.initSession);
  const user = useAuthStore((state) => state.user);

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardSetListItem[]>([]);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [goalDashboard, setGoalDashboard] = useState<LearningGoalDashboard | null>(null);
  const [goalProgressLogs, setGoalProgressLogs] = useState<LearningGoalProgressLog[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalRecurrence, setGoalRecurrence] = useState<GoalRecurrenceType>("weekly");
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [performanceView, setPerformanceView] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      setLoading(true);
      setError(null);

      const [docsResult, quizzesResult, flashcardsResult, goalsResult, dashboardResult] =
        await Promise.allSettled([
          listDocuments(20, 0),
          listQuizzes(20, 0),
          listFlashcardSets(20, 0),
          listLearningGoals({ limit: 10, offset: 0 }),
          getLearningGoalDashboard(),
        ]);

      if (docsResult.status === "fulfilled") {
        setDocuments(docsResult.value);
      }
      if (quizzesResult.status === "fulfilled") {
        setQuizzes(quizzesResult.value);
      }
      if (flashcardsResult.status === "fulfilled") {
        setFlashcards(flashcardsResult.value);
      }
      if (goalsResult.status === "fulfilled") {
        setGoals(goalsResult.value);

        const logsByGoal = await Promise.allSettled(
          goalsResult.value.slice(0, 10).map((goal) => listLearningGoalProgressLogs(goal.id, 30, 0)),
        );
        const allLogs = logsByGoal
          .filter((item): item is PromiseFulfilledResult<LearningGoalProgressLog[]> => item.status === "fulfilled")
          .flatMap((item) => item.value);
        setGoalProgressLogs(allLogs);
      }
      if (dashboardResult.status === "fulfilled") {
        setGoalDashboard(dashboardResult.value);
      }

      if (
        docsResult.status === "rejected" &&
        quizzesResult.status === "rejected" &&
        flashcardsResult.status === "rejected" &&
        goalsResult.status === "rejected" &&
        dashboardResult.status === "rejected"
      ) {
        setError("Không thể tải dữ liệu tổng quan. Vui lòng thử lại.");
      }

      setLoading(false);
    };

    void loadData();
  }, [initialized, status]);

  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 2);
  }, [documents]);

  const dueGoals = useMemo(() => {
    return goals.filter((goal) => goal.status === "in_progress").slice(0, 4);
  }, [goals]);

  const getGoalProgressPercent = (goal: LearningGoal): number => {
    const milestones = goal.milestones ?? [];
    if (milestones.length === 0) {
      return Math.max(0, Math.min(100, goal.progress));
    }

    const completedMilestones = milestones.filter((milestone) => {
      const milestoneProgress = typeof milestone.progress === "number"
        ? milestone.progress
        : milestone.completed
          ? 100
          : 0;
      return milestoneProgress >= 100;
    }).length;

    return Math.round((completedMilestones / milestones.length) * 100);
  };

  const completionRate = useMemo(() => {
    if (!goalDashboard) {
      return 0;
    }
    const total =
      goalDashboard.completed_count + goalDashboard.in_progress_count + goalDashboard.overdue_count;
    if (total === 0) {
      return 0;
    }
    return Math.round((goalDashboard.completed_count / total) * 100);
  }, [goalDashboard]);

  const studyStreakDays = useMemo(() => {
    const toDateKey = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const activityKeys = new Set<string>();

    documents.forEach((item) => {
      const key = toDateKey(item.created_at);
      if (key) activityKeys.add(key);
    });
    quizzes.forEach((item) => {
      const key = toDateKey(item.created_at);
      if (key) activityKeys.add(key);
    });
    flashcards.forEach((item) => {
      const key = toDateKey(item.created_at);
      if (key) activityKeys.add(key);
    });
    goalProgressLogs.forEach((item) => {
      const key = toDateKey(item.created_at);
      if (key) activityKeys.add(key);
    });

    if (activityKeys.size === 0) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const toKeyFromDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    let cursor = activityKeys.has(toKeyFromDate(today)) ? today : yesterday;
    if (!activityKeys.has(toKeyFromDate(cursor))) {
      return 0;
    }

    let streak = 0;
    while (activityKeys.has(toKeyFromDate(cursor))) {
      streak += 1;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }, [documents, quizzes, flashcards, goalProgressLogs]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const docActivities: ActivityItem[] = documents.map((doc) => ({
      id: `doc-${doc.document_id}`,
      type: "document",
      label: `Đã tải lên "${doc.title}"`,
      meta: `${(doc.file_size / 1024 / 1024).toFixed(1)} MB`,
      created_at: doc.created_at,
    }));

    const quizActivities: ActivityItem[] = quizzes.map((quiz) => ({
      id: `quiz-${quiz.quiz_id}`,
      type: "quiz",
      label: `Hoàn tất quiz "${quiz.title}"`,
      meta: `${quiz.question_count} câu hỏi`,
      created_at: quiz.created_at,
    }));

    const flashcardActivities: ActivityItem[] = flashcards.map((set) => ({
      id: `flash-${set.set_id}`,
      type: "flashcards",
      label: `Tạo bộ flashcard "${set.title}"`,
      meta: `${set.card_count} thẻ`,
      created_at: set.created_at,
    }));

    return [...docActivities, ...quizActivities, ...flashcardActivities]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 4);
  }, [documents, flashcards, quizzes]);

  const weeklyProgressData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - distanceToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    return Array.from({ length: 4 }).map((_, idx) => {
      const weekOffset = 3 - idx;
      const start = new Date(currentWeekStart);
      start.setDate(currentWeekStart.getDate() - weekOffset * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const points = goalProgressLogs
        .filter((log) => {
          const t = new Date(log.created_at).getTime();
          return t >= start.getTime() && t <= end.getTime();
        })
        .map((log) => log.new_progress);

      const score = points.length
        ? Math.round(points.reduce((sum, value) => sum + value, 0) / points.length)
        : 0;

      return {
        id: `w${idx + 1}`,
        name: `Tuần ${idx + 1}`,
        score,
      };
    });
  }, [goalProgressLogs]);

  const monthlyProgressData = useMemo(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("vi-VN", { month: "numeric" });

    return Array.from({ length: 4 }).map((_, idx) => {
      const monthOffset = 3 - idx;
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();

      const points = goalProgressLogs
        .filter((log) => {
          const d = new Date(log.created_at);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .map((log) => log.new_progress);

      const score = points.length
        ? Math.round(points.reduce((sum, value) => sum + value, 0) / points.length)
        : 0;

      return {
        id: `m${idx + 1}`,
        name: `Tháng ${formatter.format(monthDate)}`,
        score,
      };
    });
  }, [goalProgressLogs]);

  const performanceDataset = performanceView === "weekly" ? weeklyProgressData : monthlyProgressData;

  const formatTimeAgo = (value: string) => {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
      return "Vừa cập nhật";
    }
    const diffMinutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (diffMinutes < 1) {
      return "Vừa xong";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} phút trước`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  const handleCreateGoal = async () => {
    if (!goalTitle.trim()) {
      setGoalError("Vui lòng nhập tên mục tiêu.");
      return;
    }

    if (!goalTargetDate) {
      setGoalError("Vui lòng chọn ngày mục tiêu.");
      return;
    }

    try {
      setSavingGoal(true);
      setGoalError(null);

      await createLearningGoal({
        title: goalTitle.trim(),
        recurrence_type: goalRecurrence,
        target_date: goalTargetDate,
        reminder_enabled: true,
      });

      const [goalsResult, dashboardResult] = await Promise.all([
        listLearningGoals({ limit: 10, offset: 0 }),
        getLearningGoalDashboard(),
      ]);

      setGoals(goalsResult);
      setGoalDashboard(dashboardResult);

      const logsByGoal = await Promise.allSettled(
        goalsResult.slice(0, 10).map((goal) => listLearningGoalProgressLogs(goal.id, 30, 0)),
      );
      const allLogs = logsByGoal
        .filter((item): item is PromiseFulfilledResult<LearningGoalProgressLog[]> => item.status === "fulfilled")
        .flatMap((item) => item.value);
      setGoalProgressLogs(allLogs);
      setGoalTitle("");
      setGoalTargetDate("");
      setGoalRecurrence("weekly");
      setShowGoalForm(false);
    } catch (goalCreateError) {
      const message = goalCreateError instanceof Error ? goalCreateError.message : "Không thể tạo mục tiêu.";
      setGoalError(message);
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="pt-0.5 pb-3 border-b border-green-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-3xl font-bold text-[#00A651]">
              Chào mừng trở lại, {user?.full_name ?? user?.email ?? "Học viên"}!
            </h1>
            <p className="text-gray-500 mt-2">
              Tiếp tục hành trình học tập và hoàn thiện mục tiêu từng ngày.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Chuỗi học tập</p>
              <p className="text-3xl font-bold text-[#00A651] mt-0.5">{studyStreakDays} ngày</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00A651] text-white font-bold text-lg">
              🔥
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-green-50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-green-100 text-[#00A651] flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 tracking-wide">Khởi động</p>
              <h3 className="text-lg font-semibold text-gray-900">Bắt đầu học ngay</h3>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Tải ghi chú hoặc tạo quiz để AI đồng hành cùng bạn trong mỗi buổi học.
          </p>
          <div className="mt-5 space-y-2.5">
            <Link
              href="/documents?openUpload=1"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008a42] transition-colors"
            >
              <Upload className="h-4 w-4" />
              Tải tài liệu
            </Link>
            <Link
              href="/quiz"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              <PlayCircle className="h-4 w-4" />
              Làm quiz
            </Link>
          </div>
          <div className="mt-5 text-xs text-gray-500">
            {recentDocuments.length > 0
              ? `Tài liệu gần nhất: ${recentDocuments[0].title}`
              : "Bạn chưa tải tài liệu nào."}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-gray-500 tracking-wide">Theo dõi</p>
              <h3 className="text-2xl font-semibold text-gray-900">Phân tích hiệu suất</h3>
            </div>
            <div className="bg-gray-100 rounded-full p-1 flex text-sm font-medium">
              {(["weekly", "monthly"] as const).map((range) => (
                <button
                  type="button"
                  key={range}
                  onClick={() => setPerformanceView(range)}
                  className={`px-4 py-1 rounded-full transition-colors ${
                    performanceView === range
                      ? "bg-white text-[#00A651] shadow"
                      : "text-gray-500"
                  }`}
                >
                  {range === "weekly" ? "Hàng tuần" : "Hàng tháng"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceDataset}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} domain={[40, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#00A651"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#00A651", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-green-50 p-3 border border-green-100">
              <p className="text-xs text-gray-500 uppercase">Tỉ lệ hoàn thành</p>
              <p className="text-3xl font-semibold text-[#00A651]">{completionRate}%</p>
              <span className="text-xs text-gray-500">So với tuần trước</span>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase">Quiz đang có</p>
              <p className="text-3xl font-semibold text-gray-900">{quizzes.length}</p>
              <span className="text-xs text-gray-500">Sẵn sàng để luyện tập</span>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase">Mục tiêu quá hạn</p>
              <p className="text-3xl font-semibold text-gray-900">{goalDashboard?.overdue_count ?? 0}</p>
              <span className="text-xs text-gray-500">Ưu tiên xử lý sớm</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Mục tiêu hiện tại</h3>
            <Link href="/goals" className="text-xs font-semibold text-[#00A651] hover:underline">
              Quản lý mục tiêu
            </Link>
          </div>
          <div className="space-y-3">
            {dueGoals.length === 0 && (
              <p className="text-sm text-gray-500">Chưa có mục tiêu nào.</p>
            )}
            {dueGoals.map((goal) => (
              <div key={goal.id} className="space-y-1.5">
                {(() => {
                  const progressPercent = getGoalProgressPercent(goal);
                  return (
                    <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
                    <p className="text-xs text-gray-500">Mục tiêu {progressPercent}% hoàn thành</p>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-[#00A651]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 && (
              <p className="text-sm text-gray-500">Chưa có hoạt động nào.</p>
            )}
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-b-0">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-[#00A651]">
                  <span className="text-xs font-bold">•</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.label}</p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(activity.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
