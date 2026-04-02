"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  BookOpen, 
  LogOut,
  User,
  Bell
} from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import {
  getReminderPreferences,
  listReminderFeed,
  updateReminderPreferences,
} from "@/features/workspace/services/learningService";
import type {
  ReminderChannel,
  ReminderFeedItem,
  ReminderPreference,
} from "@/features/workspace/types";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showReminderSettingsModal, setShowReminderSettingsModal] = useState(false);
  const [reminderFeed, setReminderFeed] = useState<ReminderFeedItem[]>([]);
  const [reminderChannelFilter, setReminderChannelFilter] = useState<"all" | ReminderChannel>("all");
  const [reminderPreferences, setReminderPreferences] = useState<ReminderPreference | null>(null);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [savingReminderSettings, setSavingReminderSettings] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);
  const initSession = useAuthStore((state) => state.initSession);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    const syncSession = async () => {
      if (!initialized) {
        await initSession();
        return;
      }

      if (status === "unauthenticated") {
        router.replace("/login");
      }
    };

    void syncSession();
  }, [initSession, initialized, router, status]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const loadReminderData = async () => {
    try {
      setLoadingReminders(true);
      const [feed, preferences] = await Promise.all([
        listReminderFeed(12, 0, reminderChannelFilter === "all" ? undefined : reminderChannelFilter),
        getReminderPreferences(),
      ]);
      setReminderFeed(feed);
      setReminderPreferences(preferences);
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    if (!initialized || status !== "authenticated") {
      return;
    }
    if (!showNotificationMenu) {
      return;
    }

    void loadReminderData();
  }, [initialized, status, showNotificationMenu, reminderChannelFilter]);

  const handleSaveReminderSettings = async () => {
    if (!reminderPreferences) {
      return;
    }

    try {
      setSavingReminderSettings(true);
      const updated = await updateReminderPreferences({
        timezone: reminderPreferences.timezone,
        email_digest_enabled: reminderPreferences.email_digest_enabled,
        digest_hour: reminderPreferences.digest_hour,
        digest_minute: reminderPreferences.digest_minute,
        due_soon_hours: reminderPreferences.due_soon_hours,
        overdue_cooldown_hours: reminderPreferences.overdue_cooldown_hours,
      });
      setReminderPreferences(updated);
      setShowReminderSettingsModal(false);
    } finally {
      setSavingReminderSettings(false);
    }
  };

  const formatDateTime = (value: string) => {
    try {
      return new Date(value).toLocaleString("vi-VN");
    } catch {
      return value;
    }
  };

  const navItems = [
    { name: "Tổng quan", path: "/dashboard" },
    { name: "Tài liệu", path: "/documents" },
    { name: "Trắc nghiệm", path: "/quiz" },
    { name: "Thẻ ghi nhớ", path: "/flashcards" },
    { name: "Mục tiêu", path: "/goals" },
    { name: "Thống kê", path: "/statistics" },
  ];

  return (
    <div className="min-h-screen bg-[#f4fae8] font-sans text-gray-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 py-1.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="flex items-center gap-6 min-w-0">
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-1.5 whitespace-nowrap">
                <div className="bg-[#00A651] p-1 rounded-lg">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-base text-[#00A651] leading-none">EduSmart</span>
              </Link>

              {/* Main Navigation */}
              <nav className="hidden md:flex items-center space-x-2 lg:space-x-3 flex-nowrap">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      className={`px-1.5 lg:px-2 pt-2 pb-[6px] text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        isActive
                          ? "text-[#00A651] border-[#00A651]"
                          : "text-gray-600 border-transparent hover:text-[#00A651]"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User actions */}
            <div className="flex items-center gap-2.5 lg:gap-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationMenu((prev) => !prev);
                    setShowUserMenu(false);
                  }}
                  className="h-8 w-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#00A651] hover:border-[#00A651] transition-colors"
                  aria-label="Thông báo"
                >
                  <Bell className="h-5 w-5" />
                </button>

                {showNotificationMenu && (
                  <div className="absolute right-0 mt-2 w-[360px] max-w-[85vw] rounded-lg border border-gray-200 bg-white py-3 shadow-lg z-50">
                    <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Lịch sử nhắc nhở</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={reminderChannelFilter}
                          onChange={(event) => setReminderChannelFilter(event.target.value as "all" | ReminderChannel)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="all">Tất cả</option>
                          <option value="in_app">In-app</option>
                          <option value="email">Email</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowReminderSettingsModal(true)}
                          className="rounded-md border border-green-300 px-2 py-1 text-xs font-semibold text-[#00A651] hover:bg-green-50"
                        >
                          Cài đặt nhắc hẹn
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto px-4 pt-3 space-y-2">
                      {loadingReminders ? (
                        <p className="text-sm text-gray-500">Đang tải nhắc nhở...</p>
                      ) : !reminderFeed.length ? (
                        <p className="text-sm text-gray-500">Chưa có nhắc nhở nào.</p>
                      ) : (
                        reminderFeed.map((item) => (
                          <div key={item.event_id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <p className="text-xs font-semibold text-gray-700">
                              {item.event_type} • {item.channel} • {item.status}
                            </p>
                            <p className="text-xs text-gray-500">Lên lịch: {formatDateTime(item.scheduled_for)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotificationMenu(false);
                  }}
                  className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center text-[#00A651] hover:bg-green-200 transition-colors relative"
                  aria-label="Thông tin người dùng"
                  title="Thông tin người dùng"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                </button>
                
                {/* User Info Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-3">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-[#00A651]">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user?.full_name || "Người dùng"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email || "email@example.com"}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-2 space-y-1 text-sm">
                      <div className="py-2 border-b border-gray-100">
                        <p className="text-gray-600">
                          <span className="text-gray-400">ID: </span>
                          <span className="font-medium text-gray-900">{user?.id || "—"}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          void handleSignOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pb-6 pt-3 sm:px-6 sm:pt-4 sm:pb-8 lg:px-8 lg:pt-5">
        {children}
      </main>

      {showReminderSettingsModal && reminderPreferences && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Cài đặt nhắc hẹn</h3>
              <button
                type="button"
                onClick={() => setShowReminderSettingsModal(false)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-700">Múi giờ</label>
                <input
                  value={reminderPreferences.timezone}
                  onChange={(e) => setReminderPreferences((prev) => (prev ? { ...prev, timezone: e.target.value } : prev))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={reminderPreferences.email_digest_enabled}
                    onChange={(e) =>
                      setReminderPreferences((prev) =>
                        prev ? { ...prev, email_digest_enabled: e.target.checked } : prev,
                      )
                    }
                  />
                  Bật email tổng hợp
                </label>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Giờ gửi digest</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={reminderPreferences.digest_hour}
                  onChange={(e) =>
                    setReminderPreferences((prev) =>
                      prev ? { ...prev, digest_hour: Math.max(0, Math.min(23, Number(e.target.value) || 0)) } : prev,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Phút gửi digest</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={reminderPreferences.digest_minute}
                  onChange={(e) =>
                    setReminderPreferences((prev) =>
                      prev ? { ...prev, digest_minute: Math.max(0, Math.min(59, Number(e.target.value) || 0)) } : prev,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Nhắc trước hạn (giờ)</label>
                <input
                  type="number"
                  min={1}
                  value={reminderPreferences.due_soon_hours}
                  onChange={(e) =>
                    setReminderPreferences((prev) =>
                      prev ? { ...prev, due_soon_hours: Math.max(1, Number(e.target.value) || 1) } : prev,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Cooldown quá hạn (giờ)</label>
                <input
                  type="number"
                  min={1}
                  value={reminderPreferences.overdue_cooldown_hours}
                  onChange={(e) =>
                    setReminderPreferences((prev) =>
                      prev ? { ...prev, overdue_cooldown_hours: Math.max(1, Number(e.target.value) || 1) } : prev,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSaveReminderSettings()}
                disabled={savingReminderSettings}
                className="rounded-lg bg-[#00A651] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007a38] disabled:opacity-50"
              >
                {savingReminderSettings ? "Đang lưu..." : "Lưu cài đặt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
