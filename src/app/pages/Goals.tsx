"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  listLearningGoals,
  getLearningGoalDashboard,
  updateLearningGoal,
  createLearningGoal,
} from "@/features/workspace/services/learningService";
import type {
  GoalRecurrenceType,
  LearningGoal,
  LearningGoalDashboard,
  LearningGoalMilestone,
} from "@/features/workspace/types";

const statusConfig: Record<LearningGoal["status"], { label: string; text: string }> = {
  in_progress: { label: "Đang thực hiện", text: "text-[#00A651]" },
  completed: { label: "Hoàn thành", text: "text-emerald-600" },
  overdue: { label: "Trễ hạn", text: "text-red-600" },
  archived: { label: "Đã lưu trữ", text: "text-gray-500" },
};

export function Goals() {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const initSession = useAuthStore((state) => state.initSession);

  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [dashboard, setDashboard] = useState<LearningGoalDashboard | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingMilestoneGoalId, setAddingMilestoneGoalId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneNotes, setNewMilestoneNotes] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalTargetDate, setNewGoalTargetDate] = useState("");
  const [newGoalRecurrenceType, setNewGoalRecurrenceType] = useState<GoalRecurrenceType>("weekly");
  const [newGoalMilestones, setNewGoalMilestones] = useState<Array<{ title: string; description: string }>>([
    { title: "", description: "" },
  ]);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalTitle, setEditGoalTitle] = useState("");
  const [editGoalDescription, setEditGoalDescription] = useState("");
  const [editGoalTargetDate, setEditGoalTargetDate] = useState("");
  const [editGoalRecurrenceType, setEditGoalRecurrenceType] = useState<GoalRecurrenceType>("weekly");
  const [editGoalDocumentId, setEditGoalDocumentId] = useState("");
  const [savingGoalDetails, setSavingGoalDetails] = useState(false);
  const [goalSearchKeyword, setGoalSearchKeyword] = useState("");
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);

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
      const [goalList, overview] = await Promise.all([
        listLearningGoals({ limit: 50 }),
        getLearningGoalDashboard(),
      ]);

      setGoals(goalList);
      setDashboard(overview);
      
      // Initialize completed milestones based on goal progress
      if (goalList && goalList.length > 0) {
        setSelectedGoalId((prev) => prev ?? goalList[0].id);
      }
    } catch {
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [initialized, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredGoals = goals.filter((goal) => {
    const keyword = goalSearchKeyword.trim().toLowerCase();
    if (!keyword) return true;
    const inTitle = goal.title.toLowerCase().includes(keyword);
    const inDescription = (goal.description ?? "").toLowerCase().includes(keyword);
    return inTitle || inDescription;
  });

  useEffect(() => {
    if (!filteredGoals.length) return;
    if (!selectedGoalId || !filteredGoals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(filteredGoals[0].id);
    }
  }, [filteredGoals, selectedGoalId]);

  const getMilestoneStats = (goal: LearningGoal) => {
    const milestones = goal.milestones ?? [];
    const total = milestones.length;
    const completed = milestones.filter((m) => {
      const p = typeof m.progress === "number" ? m.progress : m.completed ? 100 : 0;
      return p === 100;
    }).length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, progress };
  };

  const persistMilestones = async (
    goalId: string,
    updatedMilestones: LearningGoalMilestone[],
  ) => {
    const updatedGoal = await updateLearningGoal(goalId, {
      milestones: updatedMilestones as any,
    });

    setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)));
  };

  const handleMilestoneToggle = async (goalId: string, milestoneIndex: number) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || !goal.milestones) return;

    try {
      const updatedMilestones = goal.milestones.map((m, index) => {
        if (index !== milestoneIndex) return m;

        // Cycle status: not_started -> in_progress -> completed -> not_started
        const current = typeof m.progress === "number" ? m.progress : m.completed ? 100 : 0;
        const next = current === 0 ? 50 : current === 50 ? 100 : 0;

        return {
          ...m,
          progress: next,
          completed: next === 100,
        } satisfies LearningGoalMilestone;
      });

      await persistMilestones(goalId, updatedMilestones);
    } catch (err) {
      console.error("Lỗi khi cập nhật cột mốc:", err);
      setError("Không thể cập nhật cột mốc. Vui lòng thử lại.");
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN");
    } catch {
      return dateString;
    }
  };

  const getDeadlineLabel = (targetDate?: string | null): string => {
    if (!targetDate) return "Chưa đặt hạn";
    const target = new Date(targetDate);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return `Quá hạn ${Math.abs(daysLeft)} ngày`;
    }

    if (daysLeft === 0) {
      return "Đến hạn hôm nay";
    }

    return `Còn ${daysLeft} ngày`;
  };

  const getDeadlineBadgeClass = (targetDate?: string | null): string => {
    if (!targetDate) {
      return "bg-gray-100 text-gray-600";
    }

    const target = new Date(targetDate);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return "bg-red-100 text-red-700";
    }

    if (daysLeft <= 1) {
      return "bg-orange-100 text-orange-700";
    }

    return "bg-green-100 text-[#007a38]";
  };

  const handleAddMilestone = async (goalId: string) => {
    if (!newMilestoneTitle.trim()) {
      setError("Tên mục phụ không được để trống");
      return;
    }

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    try {
      const newMilestone = {
        title: newMilestoneTitle,
        description: newMilestoneNotes,
        completed: false,
        progress: 0,
      };

      const updatedMilestones = [...(goal.milestones || []), newMilestone];
      const updatedGoal = await updateLearningGoal(goalId, { 
        milestones: updatedMilestones as any 
      });

      setGoals(goals.map(g => g.id === goalId ? updatedGoal : g));
      setNewMilestoneTitle("");
      setNewMilestoneNotes("");
      setAddingMilestoneGoalId(null);
    } catch (err) {
      console.error("Lỗi khi thêm mục phụ:", err);
      setError("Không thể thêm mục phụ. Vui lòng thử lại.");
    }
  };

  const handleDeleteMilestone = async (goalId: string, milestoneIndex: number) => {
    const shouldDelete = window.confirm("Bạn có chắc muốn xoá mục phụ này không?");
    if (!shouldDelete) return;

    const goal = goals.find(g => g.id === goalId);
    if (!goal || !goal.milestones) return;

    try {
      const updatedMilestones = goal.milestones.filter((_, index) => index !== milestoneIndex);
      await persistMilestones(goalId, updatedMilestones);
    } catch (err) {
      console.error("Lỗi khi xoá mục phụ:", err);
      setError("Không thể xoá mục phụ. Vui lòng thử lại.");
    }
  };

  const handleCreateGeneralGoal = async () => {
    const title = newGoalTitle.trim();
    if (!title) {
      setError("Tên mục tiêu không được để trống");
      return;
    }
    if (!newGoalTargetDate) {
      setError("Vui lòng chọn hạn hoàn thành");
      return;
    }

    try {
      setCreatingGoal(true);
      setError(null);

      const milestonesPayload = newGoalMilestones
        .map((milestone) => ({
          title: milestone.title.trim(),
          description: milestone.description.trim() || undefined,
          progress: 0,
          completed: false,
        }))
        .filter((milestone) => Boolean(milestone.title));

      const createdGoal = await createLearningGoal({
        title,
        description: newGoalDescription.trim() || undefined,
        recurrence_type: newGoalRecurrenceType,
        target_date: newGoalTargetDate,
        milestones: milestonesPayload,
      });

      setGoals((prev) => [createdGoal, ...prev]);
      setSelectedGoalId(createdGoal.id);

      setNewGoalTitle("");
      setNewGoalDescription("");
      setNewGoalTargetDate("");
      setNewGoalRecurrenceType("weekly");
      setNewGoalMilestones([{ title: "", description: "" }]);
      setIsCreatingGoal(false);

      void loadData();
    } catch (err) {
      console.error("Lỗi khi tạo mục tiêu:", err);
      setError("Không thể tạo mục tiêu mới. Vui lòng thử lại.");
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleStartCreateGoal = () => {
    setIsCreatingGoal(true);
    setIsEditingGoal(false);
    setAddingMilestoneGoalId(null);
    setError(null);
  };

  const handleDropGoal = (targetGoalId: string) => {
    if (!draggingGoalId || draggingGoalId === targetGoalId) {
      setDraggingGoalId(null);
      return;
    }

    setGoals((prev) => {
      const sourceIndex = prev.findIndex((goal) => goal.id === draggingGoalId);
      const targetIndex = prev.findIndex((goal) => goal.id === targetGoalId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;

      const reordered = [...prev];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });

    setDraggingGoalId(null);
  };

  const handleCancelCreateGoal = () => {
    setIsCreatingGoal(false);
    setNewGoalTitle("");
    setNewGoalDescription("");
    setNewGoalTargetDate("");
    setNewGoalRecurrenceType("weekly");
    setNewGoalMilestones([{ title: "", description: "" }]);
  };

  const handleStartEditGoal = () => {
    if (!selectedGoal) {
      return;
    }
    setIsCreatingGoal(false);
    setEditGoalTitle(selectedGoal.title ?? "");
    setEditGoalDescription(selectedGoal.description ?? "");
    setEditGoalTargetDate(selectedGoal.target_date ? selectedGoal.target_date.slice(0, 10) : "");
    setEditGoalRecurrenceType(selectedGoal.recurrence_type ?? "weekly");
    setEditGoalDocumentId(selectedGoal.document_id ?? "");
    setIsEditingGoal(true);
    setError(null);
  };

  const handleCancelEditGoal = () => {
    setIsEditingGoal(false);
    setError(null);
  };

  const handleSaveGoalDetails = async () => {
    if (!selectedGoal) {
      return;
    }

    const title = editGoalTitle.trim();
    if (!title) {
      setError("Tên mục tiêu không được để trống");
      return;
    }

    if (!editGoalTargetDate) {
      setError("Vui lòng chọn hạn hoàn thành");
      return;
    }

    try {
      setSavingGoalDetails(true);
      setError(null);

      const updatedGoal = await updateLearningGoal(selectedGoal.id, {
        title,
        description: editGoalDescription.trim() || undefined,
        target_date: editGoalTargetDate,
        recurrence_type: editGoalRecurrenceType,
        document_id: editGoalDocumentId.trim() || undefined,
      });

      setGoals((prev) => prev.map((goal) => (goal.id === updatedGoal.id ? updatedGoal : goal)));
      setSelectedGoalId(updatedGoal.id);
      setIsEditingGoal(false);
      void loadData();
    } catch (err) {
      console.error("Lỗi khi cập nhật mục tiêu:", err);
      setError("Không thể cập nhật mục tiêu. Vui lòng thử lại.");
    } finally {
      setSavingGoalDetails(false);
    }
  };

  const handleAddCreateMilestoneRow = () => {
    setNewGoalMilestones((prev) => [...prev, { title: "", description: "" }]);
  };

  const handleRemoveCreateMilestoneRow = (index: number) => {
    setNewGoalMilestones((prev) => {
      if (prev.length === 1) {
        return [{ title: "", description: "" }];
      }
      return prev.filter((_, milestoneIndex) => milestoneIndex !== index);
    });
  };

  const handleChangeCreateMilestone = (
    index: number,
    field: "title" | "description",
    value: string,
  ) => {
    setNewGoalMilestones((prev) =>
      prev.map((milestone, milestoneIndex) =>
        milestoneIndex === index ? { ...milestone, [field]: value } : milestone,
      ),
    );
  };

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? goals[0] ?? null;
  const selectedGoalStats = selectedGoal
    ? getMilestoneStats(selectedGoal)
    : { total: 0, completed: 0, progress: 0 };

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
        <p className="text-gray-600 mt-1">Hiện thực hoá ước mơ của bạn với những mục tiêu cụ thể.</p>
      </section>

      {/* Stats Section */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Đang thực hiện</p>
            <p className="text-2xl font-bold text-[#00A651] mt-1">{dashboard.in_progress_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Hoàn thành</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{dashboard.completed_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Trễ hạn</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{dashboard.overdue_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Hôm nay</p>
            <p className="text-2xl font-bold text-[#00A651] mt-1">{dashboard.due_today_count}</p>
          </div>
        </div>
      )}

      {/* Active Objectives */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Mục tiêu hoạt động</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#00A651] text-white px-2 py-1 rounded">
              {goals.length} MỤC TIÊU
            </span>
            <button
              onClick={handleStartCreateGoal}
              className="text-xs font-semibold text-white bg-[#00A651] hover:bg-[#007a38] px-3 py-1 rounded"
            >
              + Thêm mục tiêu
            </button>
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-500 mb-4">Chưa có mục tiêu nào</p>
            <button
              onClick={handleStartCreateGoal}
              className="inline-block bg-[#00A651] text-white px-4 py-2 rounded-lg hover:bg-[#009940] text-sm font-medium"
            >
              + Tạo mục tiêu đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Tìm kiếm mục tiêu</label>
                <input
                  type="text"
                  value={goalSearchKeyword}
                  onChange={(e) => setGoalSearchKeyword(e.target.value)}
                  placeholder="Nhập tên hoặc mô tả mục tiêu"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                />
              </div>

              {filteredGoals.map((goal) => {
                const { total, completed, progress } = getMilestoneStats(goal);
                const meta = statusConfig[goal.status];
                const isSelected = selectedGoal?.id === goal.id;
                const progressBarClass = isSelected
                  ? progress === 100
                    ? "bg-[#007a38]"
                    : "bg-[#00A651]"
                  : "bg-black";
                const categoryLabel = goal.document_id ? "DỰA TRÊN TÀI LIỆU" : "MỤC TIÊU CHUNG";

                return (
                  <button
                    key={goal.id}
                    draggable
                    onClick={() => {
                      setSelectedGoalId(goal.id);
                      setIsCreatingGoal(false);
                      setIsEditingGoal(false);
                    }}
                    onMouseDown={() => setIsCreatingGoal(false)}
                    onDragStart={() => setDraggingGoalId(goal.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDropGoal(goal.id)}
                    onDragEnd={() => setDraggingGoalId(null)}
                    className={`relative w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-gray-200 bg-white shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } ${draggingGoalId === goal.id ? "opacity-60" : ""}`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-0 h-full w-1.5 rounded-l-xl bg-[#007a38]" aria-hidden="true" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[11px] font-semibold tracking-wide uppercase ${isSelected ? "text-[#00A651]" : "text-black"}`}>{categoryLabel}</p>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isSelected ? "text-gray-700" : "text-black"}`}>{progress}%</p>
                        <p className={`text-[10px] uppercase ${isSelected ? "text-gray-500" : "text-black"}`}>{completed} of {Math.max(total, 1)} tasks</p>
                      </div>
                    </div>
                    <h3 className={`text-lg leading-snug font-semibold mt-1 line-clamp-2 ${isSelected ? "text-gray-900" : "text-black"}`}>{goal.title}</h3>
                    <div className="mt-3">
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${progressBarClass}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className={`text-[11px] ${isSelected ? "text-gray-500" : "text-black"}`}>{goal.target_date ? formatDate(goal.target_date) : "Không có hạn"}</p>
                      <p className={`text-[11px] font-semibold ${isSelected ? meta.text : "text-black"}`}>{completed}/{total} cột mốc xong</p>
                    </div>
                  </button>
                );
              })}

              {!filteredGoals.length && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  Không tìm thấy mục tiêu phù hợp.
                </div>
              )}
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                {isCreatingGoal ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900">Tạo mục tiêu chung mới</h3>
                        <p className="text-sm text-gray-600 mt-1">Điền đầy đủ thông tin và các cột mốc của mục tiêu ngay tại đây.</p>
                      </div>
                      <button
                        onClick={handleCancelCreateGoal}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300"
                      >
                        Hủy
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-gray-700">Tên mục tiêu</label>
                        <input
                          type="text"
                          value={newGoalTitle}
                          onChange={(e) => setNewGoalTitle(e.target.value)}
                          placeholder="Ví dụ: Hoàn thành 20 câu trắc nghiệm mỗi ngày"
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-gray-700">Mô tả</label>
                        <textarea
                          value={newGoalDescription}
                          onChange={(e) => setNewGoalDescription(e.target.value)}
                          placeholder="Ghi chú mục tiêu của bạn"
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651] resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Hạn hoàn thành</label>
                        <input
                          type="date"
                          value={newGoalTargetDate}
                          onChange={(e) => setNewGoalTargetDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Chu kỳ</label>
                        <select
                          value={newGoalRecurrenceType}
                          onChange={(e) => setNewGoalRecurrenceType(e.target.value as GoalRecurrenceType)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                        >
                          <option value="daily">Hàng ngày</option>
                          <option value="weekly">Hàng tuần</option>
                          <option value="monthly">Hàng tháng</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-gray-900">Các cột mốc của mục tiêu</h4>
                        <button
                          onClick={handleAddCreateMilestoneRow}
                          className="text-sm font-medium text-[#00A651] hover:text-[#007a38]"
                        >
                          + Thêm cột mốc
                        </button>
                      </div>

                      <div className="mt-3 space-y-3">
                        {newGoalMilestones.map((milestone, index) => (
                          <div key={`create-milestone-${index}`} className="rounded-lg border border-gray-200 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-gray-500 uppercase">Cột mốc {index + 1}</p>
                              <button
                                onClick={() => handleRemoveCreateMilestoneRow(index)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium px-2"
                                aria-label="Xoá cột mốc trong form tạo"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="mt-2 space-y-2">
                              <input
                                type="text"
                                value={milestone.title}
                                onChange={(e) => handleChangeCreateMilestone(index, "title", e.target.value)}
                                placeholder="Tên cột mốc"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                              />
                              <textarea
                                value={milestone.description}
                                onChange={(e) => handleChangeCreateMilestone(index, "description", e.target.value)}
                                placeholder="Ghi chú cột mốc"
                                rows={2}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651] resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end">
                      <button
                        onClick={handleCreateGeneralGoal}
                        disabled={creatingGoal}
                        className="rounded-lg bg-[#00A651] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#007a38] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {creatingGoal ? "Đang tạo..." : "Tạo mục tiêu"}
                      </button>
                    </div>
                  </>
                ) : selectedGoal ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {isEditingGoal ? (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-medium text-gray-700">Tên mục tiêu</label>
                                <input
                                  type="text"
                                  value={editGoalTitle}
                                  onChange={(e) => setEditGoalTitle(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                                  placeholder="Nhập tên mục tiêu"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-700">Mô tả</label>
                                <textarea
                                  value={editGoalDescription}
                                  onChange={(e) => setEditGoalDescription(e.target.value)}
                                  rows={3}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651] resize-none"
                                  placeholder="Thêm mô tả cho mục tiêu"
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-700">Hạn hoàn thành</label>
                                  <input
                                    type="date"
                                    value={editGoalTargetDate}
                                    onChange={(e) => setEditGoalTargetDate(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-700">Chu kỳ</label>
                                  <select
                                    value={editGoalRecurrenceType}
                                    onChange={(e) => setEditGoalRecurrenceType(e.target.value as GoalRecurrenceType)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                                  >
                                    <option value="daily">Hàng ngày</option>
                                    <option value="weekly">Hàng tuần</option>
                                    <option value="monthly">Hàng tháng</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-700">Document ID (tuỳ chọn)</label>
                                  <input
                                    type="text"
                                    value={editGoalDocumentId}
                                    onChange={(e) => setEditGoalDocumentId(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
                                    placeholder="Thêm liên kết tài liệu nếu có"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="text-2xl font-semibold text-gray-900">{selectedGoal.title}</h3>
                              {selectedGoal.description ? (
                                <p className="text-sm text-gray-600 mt-2">{selectedGoal.description}</p>
                              ) : (
                                <p className="text-sm text-gray-400 mt-2 italic">
                                  Chưa có mô tả. Bấm Chỉnh sửa để thêm thông tin.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditingGoal ? (
                            <>
                              <button
                                onClick={handleCancelEditGoal}
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={handleSaveGoalDetails}
                                disabled={savingGoalDetails}
                                className="text-sm font-semibold text-white bg-[#00A651] hover:bg-[#007a38] px-3 py-1.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {savingGoalDetails ? "Đang lưu..." : "Lưu"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={handleStartEditGoal}
                                className="text-sm font-medium text-[#00A651] hover:text-[#007a38] px-3 py-1.5 rounded-lg border border-green-300"
                              >
                                Chỉnh sửa
                              </button>
                              <span className={`text-xs font-medium px-2 py-1 rounded bg-gray-100 ${statusConfig[selectedGoal.status].text}`}>
                                {statusConfig[selectedGoal.status].label}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getDeadlineBadgeClass(
                            selectedGoal.target_date,
                          )}`}
                        >
                          Deadline: {getDeadlineLabel(selectedGoal.target_date)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-[#00A651] border border-green-200">
                          {selectedGoalStats.completed}/{Math.max(selectedGoalStats.total, 1)} Hoàn thành
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-4">
                        <span>Tạo: {formatDate(selectedGoal.created_at)}</span>
                        {selectedGoal.target_date && <span>Hạn chót: {formatDate(selectedGoal.target_date)}</span>}
                      </div>

                      <div className="mt-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-semibold text-gray-900">Cột mốc (Mục phụ)</h4>
                          <button className="text-sm font-medium text-[#00A651] hover:text-[#007a38]">⚡ Gợi ý từ AI</button>
                        </div>

                        {selectedGoal.milestones && selectedGoal.milestones.length > 0 ? (
                          <div className="mt-4 space-y-4">
                            {selectedGoal.milestones.map((milestone, index) => {
                              const currentProgress =
                                typeof milestone.progress === "number"
                                  ? milestone.progress
                                  : milestone.completed
                                    ? 100
                                    : 0;

                              const statusLabel =
                                currentProgress === 0
                                  ? "Chưa bắt đầu"
                                  : currentProgress === 100
                                    ? "Đã xong"
                                    : "Đang tiến hành";

                              const statusColor =
                                currentProgress === 0
                                  ? "text-gray-500"
                                  : currentProgress === 100
                                    ? "text-[#00A651]"
                                    : "text-[#007a38]";

                              const isCompleted = currentProgress === 100;

                              return (
                                <div key={milestone.id || index} className="flex items-start gap-3">
                                  <button
                                    onClick={() => handleMilestoneToggle(selectedGoal.id, index)}
                                    className={`mt-1 h-5 w-5 rounded-sm border flex items-center justify-center flex-shrink-0 transition ${
                                      currentProgress === 0
                                        ? "border-gray-300 bg-white"
                                        : currentProgress === 50
                                          ? "border-[#00A651] bg-green-100 text-[#007a38]"
                                          : "border-[#00A651] bg-[#00A651] text-white"
                                    }`}
                                    aria-label="Đổi trạng thái cột mốc"
                                    title="Bấm để chuyển trạng thái: Chưa bắt đầu -> Đang tiến hành -> Đã xong"
                                  >
                                    {currentProgress === 50 && <span className="text-[10px] leading-none">■</span>}
                                    {currentProgress === 100 && <span className="text-[11px] leading-none">✓</span>}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm ${isCompleted ? "text-gray-400 line-through" : "text-gray-900 font-medium"}`}>
                                        {milestone.title || "Cột mốc chưa đặt tên"}
                                      </p>
                                      <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
                                    </div>
                                    {milestone.description && (
                                      <p className="text-xs text-gray-500 mt-1">{milestone.description}</p>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleDeleteMilestone(selectedGoal.id, index)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium px-2 flex-shrink-0"
                                    aria-label="Xoá cột mốc"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic mt-4">Chưa có cột mốc nào. Hãy thêm một để bắt đầu</p>
                        )}

                        <div className="mt-4">
                          {addingMilestoneGoalId === selectedGoal.id ? (
                            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                              <p className="text-sm font-semibold text-gray-900 mb-3">Thêm mục phụ</p>
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  placeholder="Tên mục phụ"
                                  value={newMilestoneTitle}
                                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#00A651]"
                                />
                                <textarea
                                  placeholder="Ghi chú"
                                  value={newMilestoneNotes}
                                  onChange={(e) => setNewMilestoneNotes(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#00A651] resize-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAddMilestone(selectedGoal.id)}
                                    className="text-sm font-medium text-white bg-[#00A651] hover:bg-[#007a38] px-4 py-2 rounded-lg"
                                  >
                                    Thêm
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAddingMilestoneGoalId(null);
                                      setNewMilestoneTitle("");
                                      setNewMilestoneNotes("");
                                    }}
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingMilestoneGoalId(selectedGoal.id)}
                              className="w-full flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                            >
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-500 border border-dashed border-gray-400">+</span>
                              Thêm mục phụ
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Hãy chọn một mục tiêu để xem chi tiết.</p>
                  )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
