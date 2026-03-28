"use client";

import React from "react";
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
  Legend
} from "recharts";
import { Clock, BookOpen, Star, Trophy } from "lucide-react";

export function Statistics() {
  const studyData = [
    { name: "Tháng 1", hours: 30, id: "m1" },
    { name: "Tháng 2", hours: 45, id: "m2" },
    { name: "Tháng 3", hours: 25, id: "m3" },
    { name: "Tháng 4", hours: 60, id: "m4" },
    { name: "Tháng 5", hours: 40, id: "m5" },
    { name: "Tháng 6", hours: 75, id: "m6" },
  ];

  const categoryData = [
    { name: "Lập trình Web", value: 40, id: "c1" },
    { name: "Tiếng Anh", value: 30, id: "c2" },
    { name: "Kỹ năng mềm", value: 20, id: "c3" },
    { name: "Thiết kế", value: 10, id: "c4" },
  ];

  const COLORS = ['#00A651', '#34d399', '#6ee7b7', '#a7f3d0'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[#00A651]">Báo cáo & Thống kê</h1>
          <p className="text-gray-600 mt-2">Theo dõi tiến độ và hiệu suất học tập của bạn.</p>
        </div>
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A651] text-gray-700 font-medium bg-white">
            <option>6 tháng gần đây</option>
            <option>Tháng này</option>
            <option>Năm nay</option>
          </select>
          <button className="px-4 py-2 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008f45] transition-colors">
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="w-10 h-10 rounded-full bg-green-50 text-[#00A651] flex items-center justify-center mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Tổng thời gian học</p>
          <h3 className="text-3xl font-bold text-gray-900">275 <span className="text-lg font-normal text-gray-500">giờ</span></h3>
          <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-2">
            ↑ 12% <span className="text-gray-400 font-normal">so với tháng trước</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Khóa học hoàn thành</p>
          <h3 className="text-3xl font-bold text-gray-900">8 <span className="text-lg font-normal text-gray-500">khóa</span></h3>
          <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-2">
            ↑ 2 <span className="text-gray-400 font-normal">so với tháng trước</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center mb-2">
            <Star className="w-5 h-5" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Điểm trung bình</p>
          <h3 className="text-3xl font-bold text-gray-900">9.2 <span className="text-lg font-normal text-gray-500">/ 10</span></h3>
          <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-2">
            ↑ 0.5 <span className="text-gray-400 font-normal">so với tháng trước</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Chứng chỉ đạt được</p>
          <h3 className="text-3xl font-bold text-gray-900">5 <span className="text-lg font-normal text-gray-500">chứng chỉ</span></h3>
          <p className="text-sm text-gray-400 font-normal flex items-center gap-1 mt-2">
            Không thay đổi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Biểu đồ thời gian học (giờ)</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} dx={-10} />
                <Tooltip 
                  cursor={{fill: '#f4fae8'}}
                  contentStyle={{borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="hours" fill="#00A651" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Phân bổ môn học (%)</h3>
          <div className="w-full h-80">
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: '1px solid #e5e7eb'}}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
