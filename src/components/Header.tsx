// ==========================================
// ملف الشريط العلوي (Header)
// ==========================================
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaMoon, FaSun, FaBell } from 'react-icons/fa';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // جلب الثيم من المتصفح كما في كودك الأصلي
  const [theme, setTheme] = useState(localStorage.getItem('ux4_th') || 'dark');

  // دالة لمعرفة اسم الصفحة الحالية
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'التقويم';
      case '/tasks': return 'المهام';
      case '/meetings': return 'الاجتماعات';
      case '/chat': return 'المحادثات';
      case '/notifications': return 'الإشعارات';
      case '/profile': return 'الملف الشخصي';
      case '/admin': return 'لوحة التحكم';
      default: return 'نظام إدارة المهام';
    }
  };

  // دالة تغيير الثيم
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ux4_th', newTheme);
  };

  // تطبيق الثيم عند التحميل
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <header className="h-14 flex items-center justify-between px-6 flex-shrink-0" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)' }}>
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="tgb" onClick={toggleTheme}>
          {theme === 'light' ? <FaSun /> : <FaMoon />}
        </button>
        <button type="button" onClick={() => navigate('/notifications')} className="relative cursor-pointer" style={{ color: 'var(--tx2)' }}>
          <FaBell />
          <span style={{ display: 'none' }} className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">0</span>
        </button>
      </div>
    </header>
  );
};