"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { 
  BookOpen, 
  Clock, 
  Award, 
  TrendingUp, 
  PlayCircle,
  CheckCircle2
} from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { listDocuments } from "@/features/workspace/services/documentsService";
import {
  getLearningGoalDashboard,
  listFlashcardSets,
  listLearningGoals,
  listQuizzes,
} from "@/features/workspace/services/learningService";
import type {
  DocumentListItem,
  FlashcardSetListItem,
  LearningGoal,
  LearningGoalDashboard,
  QuizListItem,
} from "@/features/workspace/types";

const activityData = [
  { name: "T2", hours: 2, id: "mon" },
  { name: "T3", hours: 3.5, id: "tue" },
  { name: "T4", hours: 1.5, id: "wed" },
  { name: "T5", hours: 4, id: "thu" },
  { name: "T6", hours: 2.5, id: "fri" },
  { name: "T7", hours: 5, id: "sat" },
  { name: "CN", hours: 3, id: "sun" },
];

const progressData = [
  { name: "Tuần 1", score: 65, id: "w1" },
  { name: "Tuần 2", score: 70, id: "w2" },
  { name: "Tuần 3", score: 85, id: "w3" },
  { name: "Tuần 4", score: 92, id: "w4" },
];

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
          listLearningGoals(10, 0),
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
    return goals.filter((goal) => goal.status === "in_progress").slice(0, 3);
  }, [goals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Chào mừng trở lại, {user?.full_name ?? user?.email ?? "Học viên"}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Tiếp tục hành trình học tập của bạn hôm nay.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-[#00A651]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tài liệu đã tải</p>
            <h3 className="text-2xl font-bold text-gray-900">{loading ? "..." : documents.length}</h3>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Bài quiz đã tạo</p>
            <h3 className="text-2xl font-bold text-gray-900">{loading ? "..." : quizzes.length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Bộ flashcards</p>
            <h3 className="text-2xl font-bold text-gray-900">{loading ? "..." : flashcards.length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Mục tiêu đang thực hiện</p>
            <h3 className="text-2xl font-bold text-gray-900">{loading ? "..." : goalDashboard?.in_progress_count ?? 0}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Hoạt động học tập</h3>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f4fae8'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="hours" fill="#00A651" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Tiến bộ điểm số</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#00A651" 
                    strokeWidth={3} 
                    dot={{r: 4, fill: '#00A651', strokeWidth: 2, stroke: '#fff'}} 
                    activeDot={{r: 6}} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Sidebar content (right column) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-0"></div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 relative z-10">Tiếp tục học</h3>
            
            <div className="space-y-4 relative z-10">
              {recentDocuments.length === 0 && (
                <p className="text-sm text-gray-500">Chưa có tài liệu. Hãy tải tệp đầu tiên của bạn.</p>
              )}

              {recentDocuments.map((document, index) => (
                <div className="group block" key={document.document_id}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800 group-hover:text-[#00A651] transition-colors line-clamp-1">
                      {document.title}
                    </h4>
                    <span className="text-xs font-semibold text-[#00A651] bg-green-50 px-2 py-1 rounded">
                      {document.extraction_status}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#00A651] h-2 rounded-full"
                      style={{ width: document.extraction_status === "completed" ? "100%" : "55%" }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                    <PlayCircle className="w-4 h-4" />
                    <span>{document.content_type.toUpperCase()}</span>
                  </div>
                  {index === 0 && recentDocuments.length > 1 && <div className="w-full h-px bg-gray-100 my-4" />}
                </div>
              ))}
            </div>
            
            <Link href="/documents" className="mt-6 w-full py-2 bg-green-50 text-[#00A651] font-medium rounded-lg hover:bg-green-100 transition-colors block text-center">
              Xem tất cả tài liệu
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Mục tiêu hôm nay</h3>
            <div className="space-y-3">
              {dueGoals.length === 0 && (
                <p className="text-sm text-gray-500">Bạn chưa có mục tiêu đang thực hiện.</p>
              )}

              {dueGoals.map((goal) => (
                <label key={goal.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/50 cursor-pointer transition-colors">
                  <div className="mt-0.5">
                    {goal.progress >= 100 ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${goal.progress >= 100 ? "text-gray-800 line-through opacity-70" : "text-gray-800"}`}>
                      {goal.title}
                    </p>
                    <p className="text-xs text-gray-500">Tiến độ: {goal.progress}%</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
