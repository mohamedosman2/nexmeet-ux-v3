import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#e8e8e8] overflow-hidden" dir="rtl">
      {/* الشريط الجانبي */}
      <Sidebar />
      
      {/* القسم الأيسر الذي يحتوي على المحتوى المتغير */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <div id="cArea" className="flex-1 overflow-y-auto p-6">
          {/* هنا يتم عرض الصفحات (التقويم، المهام، الخ) بناءً على الرابط */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};