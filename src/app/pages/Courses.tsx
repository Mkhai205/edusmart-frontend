"use client";

import React from "react";
import { BookOpen, Star, Clock, PlayCircle } from "lucide-react";

export function Courses() {
  const courses = [
    {
      id: 1,
      title: "Nhập môn Lập trình Web",
      category: "Công nghệ thông tin",
      duration: "12 tuần",
      rating: 4.8,
      students: 1240,
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      progress: 60,
    },
    {
      id: 2,
      title: "Tiếng Anh Giao Tiếp Nâng Cao",
      category: "Ngoại ngữ",
      duration: "8 tuần",
      rating: 4.9,
      students: 856,
      image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      progress: 25,
    },
    {
      id: 3,
      title: "Thiết kế Đồ họa Cơ bản",
      category: "Nghệ thuật & Thiết kế",
      duration: "6 tuần",
      rating: 4.7,
      students: 532,
      image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      progress: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[#00A651]">Khóa học của tôi</h1>
          <p className="text-gray-600 mt-2">
            Khám phá và tiếp tục các khóa học bạn đang theo dõi.
          </p>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Tìm kiếm khóa học..." 
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer flex flex-col">
            <div className="h-48 overflow-hidden relative">
              <img 
                src={course.image} 
                alt={course.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-gray-800 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                {course.rating}
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
              <div className="text-xs font-semibold text-[#00A651] uppercase tracking-wider mb-2">
                {course.category}
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 group-hover:text-[#00A651] transition-colors">
                {course.title}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 mt-auto">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {course.students} học viên
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2 text-sm">
                  <span className="font-medium text-gray-700">Tiến độ</span>
                  <span className="font-bold text-[#00A651]">{course.progress}%</span>
                </div>
                <div className="w-full bg-green-50 rounded-full h-2.5">
                  <div 
                    className="bg-[#00A651] h-2.5 rounded-full" 
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
                
                <button className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-[#00A651] font-medium rounded-xl hover:bg-[#00A651] hover:text-white transition-colors">
                  <PlayCircle className="w-5 h-5" />
                  {course.progress > 0 ? "Tiếp tục học" : "Bắt đầu học"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
