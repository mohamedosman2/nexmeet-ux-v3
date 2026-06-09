import React from 'react';
import { FaMoon, FaBell } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();
  
  // تغيير العنوان بناءً على الرابط الحالي
  const getTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'التقويم';
      case '/tasks': return 'المهام';
      case '/meetings': return 'الاجتماعات';
      case '/chat': return 'المحادثات';
      case '/admin': return 'لوحة التحكم';
      default: return 'لوحة العمليات';
    }
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 flex-shrink-0 bg-[#111] border-b border-[#1f1f1f]">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold">{getTitle()}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-full border border-[#1f1f1f] bg-[#151515] flex items-center justify-center text-[#888] hover:text-[#8B1A1A] hover:border-[#8B1A1A] transition-all">
          <FaMoon />
        </button>
        <button className="relative text-[#888] hover:text-[#e8e8e8] cursor-pointer">
          <FaBell />
          {/* دائرة الإشعارات الحمراء */}
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
            3
          </span>
        </button>
      </div>
    </header>
  );
};