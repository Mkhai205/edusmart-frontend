'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/app/components/Layout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { createLearningGoal } from '@/features/workspace/services/learningService';
import type { GoalRecurrenceType } from '@/features/workspace/types';
import { Plus, Trash2, Zap } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  notes?: string;
}

export default function NewGoalPage() {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const initSession = useAuthStore((state) => state.initSession);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [recurrence_type, setRecurrence_type] = useState<GoalRecurrenceType>('weekly');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [newMilestoneNotes, setNewMilestoneNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      void initSession();
    }
  }, [initSession, initialized]);

  const addMilestone = () => {
    if (newMilestone.trim()) {
      setMilestones([...milestones, { id: Date.now().toString(), title: newMilestone, notes: newMilestoneNotes }]);
      setNewMilestone('');
      setNewMilestoneNotes('');
    }
  };

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Tiêu đề mục tiêu không thể để trống');
      return;
    }

    if (!targetDate) {
      setError('Vui lòng chọn ngày hoàn thành');
      return;
    }

    setLoading(true);
    try {
      await createLearningGoal({
        title,
        description,
        target_date: targetDate,
        recurrence_type,
      });
      router.push('/goals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo mục tiêu');
    } finally {
      setLoading(false);
    }
  };

  if (!initialized || status !== 'authenticated') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </Layout>
    );
  }

  const progress = milestones.length > 0 ? Math.round((0 / milestones.length) * 100) : 0;

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-4 pb-2">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <Link href="/goals" className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-[#00A651] border border-[#00A651] rounded-lg hover:bg-green-50 transition-colors font-medium text-sm">
            ← Quay lại Mục tiêu
          </Link>
          {/* <h1 className="text-3xl md:text-4xl font-bold text-[#00A651] mb-1">Xây dựng tương lai của bạn</h1>
          <p className="text-gray-600 mb-4">Định nghĩa một hành trình học tập tập trung trong môi trường hỗ trợ của chúng tôi.</p> */}
        </div>
      </div>

      <div className="min-h-screen bg-white py-4 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="grid grid-cols-3 gap-8">
            {/* Left Column - Form */}
            <div className="col-span-2">
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Goal Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Tiêu đề mục tiêu
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Thạc sĩ Phát triển Full-Stack"
                    className="w-full px-4 py-3 bg-green-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#00A651] focus:ring-1 focus:ring-[#00A651] outline-none"
                    disabled={loading}
                  />
                </div>

                {/* Intent & Context */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Ý định &amp; Bối cảnh
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả điều bạn muốn đạt được và lý do nó quan trọng..."
                    rows={4}
                    className="w-full px-4 py-3 bg-green-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#00A651] focus:ring-1 focus:ring-[#00A651] outline-none resize-none"
                    disabled={loading}
                  />
                </div>

                {/* Category & Target Date Row */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      Danh mục
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-green-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-[#00A651] focus:ring-1 focus:ring-[#00A651] outline-none"
                      disabled={loading}
                    >
                      <option value="">Chọn danh mục</option>
                      <option value="technology">Công nghệ</option>
                      <option value="business">Kinh doanh</option>
                      <option value="language">Ngôn ngữ</option>
                      <option value="science">Khoa học</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      Ngày hoàn thành
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-4 py-3 bg-green-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-[#00A651] focus:ring-1 focus:ring-[#00A651] outline-none"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Milestones Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-bold text-[#00A651]">📍 Các cột mốc</span>
                  </div>

                  {/* Milestones List */}
                  <div className="space-y-3 mb-4">
                    {milestones.map((milestone) => (
                      <div key={milestone.id} className="bg-green-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            <input type="checkbox" className="rounded cursor-pointer" disabled />
                            <span className="text-sm font-medium text-gray-900">{milestone.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMilestone(milestone.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {milestone.notes && (
                          <p className="text-xs text-gray-600 ml-6 leading-relaxed">{milestone.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Milestone Input */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newMilestone}
                      onChange={(e) => setNewMilestone(e.target.value)}
                      placeholder="VD: Thiết lập môi trường cơ bản"
                      className="w-full px-4 py-2 bg-green-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#00A651] focus:ring-1 focus:ring-[#00A651] outline-none text-sm"
                      disabled={loading}
                    />
                    <textarea
                      value={newMilestoneNotes}
                      onChange={(e) => setNewMilestoneNotes(e.target.value)}
                      placeholder="Ghi chú: VD: Cài đặt Node.js, VS Code, và Git"
                      rows={2}
                      className="w-full px-4 py-2 bg-green-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#00A651] focus:ring-1 focus:ring-[#00A651] outline-none text-sm resize-none"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      <Plus size={16} /> Thêm cột mốc
                    </button>
                  </div>

                  {/* Generate with AI Button */}
                  <button
                    type="button"
                    className="w-full mt-4 px-4 py-2 bg-white border border-[#00A651] text-[#00A651] rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                    disabled={loading || !title.trim()}
                  >
                    <Zap size={16} className="text-[#00A651]" />
                    Tạo cột mốc với AI
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column - Preview */}
            <div className="col-span-1 flex flex-col gap-6">
              {/* Progress Architecture Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-lg">
                <div className="text-xs font-semibold text-[#00A651] uppercase tracking-wider mb-6">
                  Kiến trúc tiến độ
                </div>

                {/* Circular Progress */}
                <div className="flex justify-center mb-8">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#D1E7DD"
                        strokeWidth="8"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#00A651"
                        strokeWidth="8"
                        strokeDasharray={`${(progress / 100) * 314} 314`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <div className="text-4xl font-bold text-gray-900">{progress}%</div>
                      <div className="text-xs text-gray-600 mt-1">Tiến độ</div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 border-t border-green-200 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Tổng cột mốc</span>
                    <span className="font-semibold text-gray-900">{milestones.length} Được xác định</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Thời lượng dự kiến</span>
                    <span className="font-semibold text-gray-900">{targetDate ? 'Đã đặt' : 'Cần chọn'}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-4">
                  Thiết lập các cột mốc cụ thể giúp bạn theo dõi tiến độ được tính toán chính xác hơn trong suốt hành trình học tập.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-[#00A651] hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Đang tạo...' : 'Tạo mục tiêu'}
                </button>
                <button
                  type="button"
                  className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition-colors border border-gray-200"
                  disabled={loading}
                >
                  Lưu nháp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
