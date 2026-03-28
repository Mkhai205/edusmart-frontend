"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  BookOpen, 
  LayoutDashboard, 
  FileText, 
  HelpCircle, 
  Layers, 
  BarChart2, 
  LogOut,
  User
} from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
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

  const navItems = [
    { name: "Tổng quan", path: "/dashboard", icon: LayoutDashboard },
    { name: "Khóa học", path: "/courses", icon: BookOpen },
    { name: "Tài liệu", path: "/documents", icon: FileText },
    { name: "Trắc nghiệm", path: "/quiz", icon: HelpCircle },
    { name: "Thẻ ghi nhớ", path: "/flashcards", icon: Layers },
    { name: "Thống kê", path: "/statistics", icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-[#f4fae8] font-sans text-gray-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="bg-[#00A651] p-2 rounded-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl text-[#00A651] hidden sm:block">EduGreen</span>
              </Link>
            </div>

            {/* Main Navigation */}
            <nav className="hidden md:flex space-x-1 lg:space-x-4 items-center flex-1 justify-center">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-green-50 text-[#00A651]"
                        : "text-gray-600 hover:bg-green-50 hover:text-[#00A651]"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-full transition-colors">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-[#00A651]">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.full_name ?? user?.email ?? "Học viên"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
