// ==========================================
// ملف الهيكل العام للموقع (Layout)
// ==========================================
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  return (
    <div className="h-screen flex font-cairo" dir="rtl">
      {/* القائمة الجانبية */}
      <Sidebar />
      
      {/* المحتوى الأيسر (الهيدر + الصفحات) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        
        {/* منطقة المحتوى المتغيرة (سيتم عرض المهام والتقويم هنا) */}
        <div id="cArea" className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg)' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};