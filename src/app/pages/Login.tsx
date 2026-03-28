"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

import { GoogleLoginButton } from "@/features/auth/components/google-login-button";
import { useAuthStore } from "@/features/auth/store/authStore";

export function Login() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);
  const error = useAuthStore((state) => state.error);
  const initSession = useAuthStore((state) => state.initSession);

  useEffect(() => {
    if (!initialized) {
      void initSession();
      return;
    }

    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [initSession, initialized, router, status]);

  return (
    <div className="min-h-screen bg-[#f4fae8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3 mb-6">
          <div className="bg-[#00A651] p-3 rounded-xl shadow-sm">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <span className="font-bold text-3xl text-[#00A651]">EduGreen</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Đăng nhập vào hệ thống
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {status === "authenticated" && user
            ? `Xin chào ${user.full_name ?? user.email}`
            : "Sử dụng Google OAuth để đăng nhập an toàn."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-green-50">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email / Tên đăng nhập
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  disabled
                  value={user?.email ?? "Đăng nhập qua Google"}
                  onChange={() => undefined}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00A651] focus:border-[#00A651] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  disabled
                  value="********"
                  onChange={() => undefined}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00A651] focus:border-[#00A651] sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#00A651] focus:ring-[#00A651] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <div className="text-sm">
                <Link href="#" className="font-medium text-[#00A651] hover:text-[#008f45]">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#00A651] hover:bg-[#008f45] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A651] transition-colors"
              >
                Hệ thống sử dụng đăng nhập Google
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <GoogleLoginButton label="Đăng nhập bằng Google" className="w-full rounded-xl" />

              <button disabled className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-400 cursor-not-allowed">
                <span className="sr-only">Đăng nhập bằng Facebook</span>
                <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {status === "loading" && (
              <p className="mt-4 text-sm text-center text-gray-500">Đang kiểm tra phiên đăng nhập...</p>
            )}
            {error && <p className="mt-4 text-sm text-center text-red-600">{error.message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
