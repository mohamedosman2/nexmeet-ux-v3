import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  return (
    // الحاوية الرئيسية: تقسم الشاشة بمرونة (Flex) على كامل الارتفاع (h-screen)
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--tx)', direction: 'rtl' }}>
      
      {/* القائمة الجانبية */}
      <Sidebar />

      {/* مساحة المحتوى الرئيسية */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        
        {/* الشريط العلوي */}
        <Header />
        
        {/* منطقة عرض الصفحات (المهام، الاجتماعات، إلخ) */}
        <div id="cnt" className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
          <Outlet />
        </div>

        {/* الخلفية المتحركة الأصلية الخاصة بك */}
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'var(--lg)' }}></div>
        <div className="fs bg-[#8B1A1A] w-64 h-64 top-[10%] left-[20%] blur-[100px]"></div>
        <div className="fs bg-[#1E3A6E] w-80 h-80 top-[40%] right-[15%] blur-[120px]"></div>
        <div className="fs bg-[#A52A2A] w-72 h-72 bottom-[10%] left-[30%] blur-[90px]"></div>
      </main>
    </div>
  );
};