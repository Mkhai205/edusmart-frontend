"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { Clock, BookOpen, Star, Trophy, RefreshCw } from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import { getStatisticsSnapshot } from "@/features/workspace/services/statisticsService";
import type {
    FlashcardSetListItem,
    LearningGoal,
    LearningGoalDashboard,
    LearningGoalProgressLog,
    QuizListItem,
} from "@/features/workspace/types";

export function Statistics() {
    const initialized = useAuthStore((state) => state.initialized);
    const status = useAuthStore((state) => state.status);
    const initSession = useAuthStore((state) => state.initSession);

    const [documentsCount, setDocumentsCount] = useState(0);
    const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
    const [flashcards, setFlashcards] = useState<FlashcardSetListItem[]>([]);
    const [goals, setGoals] = useState<LearningGoal[]>([]);
    const [goalDashboard, setGoalDashboard] = useState<LearningGoalDashboard | null>(null);
    const [goalProgressLogs, setGoalProgressLogs] = useState<LearningGoalProgressLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usingMockFallback, setUsingMockFallback] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);

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
            setUsingMockFallback(false);

            try {
                const snapshot = await getStatisticsSnapshot();

                setDocumentsCount(snapshot.documentsCount);
                setQuizzes(snapshot.quizzes);
                setFlashcards(snapshot.flashcards);
                setGoals(snapshot.goals);
                setGoalDashboard(snapshot.goalDashboard);
                setGoalProgressLogs(snapshot.goalProgressLogs);
                setUsingMockFallback(snapshot.usedMockFallback);
            } catch {
                setError("Không thể tải dữ liệu thống kê. Vui lòng thử lại.");
                setDocumentsCount(0);
                setQuizzes([]);
                setFlashcards([]);
                setGoals([]);
                setGoalDashboard(null);
                setGoalProgressLogs([]);
            }

            setLoading(false);
        };

        void loadData();
    }, [initialized, status, reloadTick]);

    const monthlyProgressData = useMemo(() => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("vi-VN", { month: "numeric" });

        return Array.from({ length: 6 }).map((_, idx) => {
            const monthOffset = 5 - idx;
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

    const categoryData = useMemo(() => {
        return [
            { name: "Tài liệu", value: documentsCount, id: "c1" },
            { name: "Quiz", value: quizzes.length, id: "c2" },
            { name: "Flashcard", value: flashcards.length, id: "c3" },
            { name: "Mục tiêu", value: goals.length, id: "c4" },
        ].filter((item) => item.value > 0);
    }, [documentsCount, quizzes.length, flashcards.length, goals.length]);

    const completionRate = useMemo(() => {
        if (!goalDashboard) return 0;
        const total =
            goalDashboard.completed_count +
            goalDashboard.in_progress_count +
            goalDashboard.overdue_count;
        if (total === 0) return 0;
        return Math.round((goalDashboard.completed_count / total) * 100);
    }, [goalDashboard]);

    const avgGoalProgress = useMemo(() => {
        if (!goals.length) return 0;
        const total = goals.reduce((sum, goal) => sum + goal.progress, 0);
        return Math.round(total / goals.length);
    }, [goals]);

    const COLORS = ["#00A651", "#34d399", "#6ee7b7", "#a7f3d0"];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-green-100 pb-3">
                <div>
                    <h1 className="text-3xl font-bold text-[#00A651]">Báo cáo & Thống kê</h1>
                    <p className="text-gray-600 mt-2">
                        Theo dõi tiến độ và hiệu suất học tập từ dữ liệu hệ thống.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setReloadTick((value) => value + 1)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Làm mới
                </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {usingMockFallback && !error && (
                <p className="text-sm text-amber-700">
                    Không kết nối được API, đang hiển thị dữ liệu mẫu tạm thời.
                </p>
            )}

            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    Đang tải dữ liệu thống kê...
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
                            <div className="w-10 h-10 rounded-full bg-green-50 text-[#00A651] flex items-center justify-center mb-2">
                                <Clock className="w-5 h-5" />
                            </div>
                            <p className="text-gray-500 font-medium text-sm">Tổng tài liệu</p>
                            <h3 className="text-3xl font-bold text-gray-900">{documentsCount}</h3>
                            <p className="text-sm text-gray-400">Đang quản lý trong hệ thống</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <p className="text-gray-500 font-medium text-sm">Tổng quiz</p>
                            <h3 className="text-3xl font-bold text-gray-900">{quizzes.length}</h3>
                            <p className="text-sm text-gray-400">Bài quiz đã tạo</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
                            <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center mb-2">
                                <Star className="w-5 h-5" />
                            </div>
                            <p className="text-gray-500 font-medium text-sm">Tiến độ TB mục tiêu</p>
                            <h3 className="text-3xl font-bold text-gray-900">
                                {avgGoalProgress}
                                <span className="text-lg font-normal text-gray-500">%</span>
                            </h3>
                            <p className="text-sm text-gray-400">Tính từ dữ liệu mục tiêu</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
                            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <p className="text-gray-500 font-medium text-sm">Tỉ lệ hoàn thành</p>
                            <h3 className="text-3xl font-bold text-gray-900">
                                {completionRate}
                                <span className="text-lg font-normal text-gray-500">%</span>
                            </h3>
                            <p className="text-sm text-gray-400">Mục tiêu đã hoàn thành</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">
                                Tiến độ mục tiêu theo tháng (%)
                            </h3>
                            <div className="w-full h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyProgressData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="#f0f0f0"
                                        />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#6b7280" }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#6b7280" }}
                                            dx={-10}
                                            domain={[0, 100]}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "#f4fae8" }}
                                            contentStyle={{
                                                borderRadius: "12px",
                                                border: "1px solid #e5e7eb",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                            }}
                                        />
                                        <Bar
                                            dataKey="score"
                                            fill="#00A651"
                                            radius={[6, 6, 0, 0]}
                                            barSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">
                                Phân bổ dữ liệu học tập
                            </h3>
                            <div className="w-full h-80">
                                {categoryData.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={80}
                                                outerRadius={120}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell
                                                        key={entry.id}
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: "12px",
                                                    border: "1px solid #e5e7eb",
                                                }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                        Chưa có dữ liệu để hiển thị biểu đồ.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
