// src/components/Header.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaMoon, 
  FaSun, 
  FaBell, 
  FaBars, 
  FaChevronLeft,
  FaUserCircle,
  FaSignOutAlt,
  FaCog,
  FaUser,
  FaQuestionCircle,
  FaSearch
} from 'react-icons/fa';

interface HeaderProps {
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
  isMobile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuClick, 
  onSidebarToggle, 
  sidebarCollapsed = false,
  isMobile = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, unreadNotificationsCount, logout, userSettings, updateUserSettings } = useAuth();
  
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('ux4_th') as 'light' | 'dark') || 'dark'
  );
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // الحصول على عنوان الصفحة الحالية
  const getPageTitle = () => {
    const path = location.pathname;
    const titles: Record<string, string> = {
      '/dashboard': 'لوحة التحكم الرئيسية',
      '/calendar': 'التقويم',
      '/tasks': 'المهام',
      '/meetings': 'الاجتماعات',
      '/chat': 'المحادثات',
      '/notifications': 'الإشعارات',
      '/profile': 'الملف الشخصي',
      '/admin': 'لوحة التحكم الإدارية',
      '/users': 'إدارة المستخدمين',
      '/departments': 'إدارة الإدارات',
      '/reports': 'التقارير والإحصائيات',
    };
    return titles[path] || 'نظام إدارة المهام';
  };

  // تغيير الثيم
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ux4_th', newTheme);
    
    // تحديث إعدادات المستخدم إذا كان مسجل الدخول
    if (userSettings) {
      updateUserSettings({ theme: newTheme });
    }
  };

  // تطبيق الثيم عند التحميل
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // إغلاق القوائم عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // معالجة البحث
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  // تنسيق التاريخ والوقت
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      setCurrentDateTime(now.toLocaleDateString('ar-SA', options));
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header 
      className="h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0 relative z-20"
      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)' }}
    >
      {/* الجانب الأيمن - عنوان الصفحة وزر القائمة */}
      <div className="flex items-center gap-3">
        {/* زر القائمة للجوال */}
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="icon-btn"
            aria-label="القائمة"
          >
            <FaBars />
          </button>
        )}
        
        {/* زر تصغير القائمة للشاشات الكبيرة */}
        {!isMobile && onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="icon-btn hidden md:flex"
            aria-label={sidebarCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            <FaChevronLeft className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
        
        <div>
          <h1 className="text-base md:text-lg font-bold">{getPageTitle()}</h1>
          <p className="text-xs text-gray-500 hidden md:block">{currentDateTime}</p>
        </div>
      </div>

      {/* الجانب الأيسر - الإشعارات والبحث والثيم والمستخدم */}
      <div className="flex items-center gap-2 md:gap-3">
        
        {/* زر البحث */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="icon-btn"
            aria-label="بحث"
          >
            <FaSearch />
          </button>
          
          {showSearch && (
            <form 
              onSubmit={handleSearch}
              className="absolute top-full left-0 mt-2 w-72 animate-fadeIn"
            >
              <div className="flex gap-2 p-2 rounded-lg" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث عن مهام، اجتماعات، مستخدمين..."
                  className="input flex-1 text-sm"
                  autoFocus
                />
                <button type="submit" className="btn-primary px-3 py-1 text-sm">
                  بحث
                </button>
              </div>
            </form>
          )}
        </div>

        {/* زر تغيير الثيم */}
        <button
          onClick={toggleTheme}
          className="icon-btn"
          aria-label={theme === 'light' ? 'الوضع المظلم' : 'الوضع الفاتح'}
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>

        {/* زر الإشعارات */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative icon-btn"
          aria-label="الإشعارات"
        >
          <FaBell />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* قائمة المستخدم */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-lg transition-all hover:bg-hv"
            aria-label="قائمة المستخدم"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--brand-primary)' }}
            >
              {userProfile?.name ? userProfile.name[0] : 'U'}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold">{userProfile?.name || 'مستخدم'}</p>
              <p className="text-[10px] text-gray-500">{userProfile?.department || 'الإدارة'}</p>
            </div>
          </button>

          {/* القائمة المنسدلة للمستخدم */}
          {showUserMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-lg shadow-xl overflow-hidden animate-fadeIn"
              style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }}
            >
              {/* معلومات المستخدم */}
              <div className="p-4 border-b border-bd" style={{ background: 'var(--bg2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ background: 'var(--brand-primary)' }}
                  >
                    {userProfile?.name ? userProfile.name[0] : 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{userProfile?.name}</p>
                    <p className="text-xs text-gray-500">{userProfile?.email}</p>
                    <p className="text-xs text-brand-light mt-1">{userProfile?.department}</p>
                  </div>
                </div>
              </div>

              {/* الروابط */}
              <div className="py-2">
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-right flex items-center gap-3 hover:bg-hv transition-colors"
                >
                  <FaUser size={14} />
                  <span>الملف الشخصي</span>
                </button>
                <button
                  onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-right flex items-center gap-3 hover:bg-hv transition-colors"
                >
                  <FaCog size={14} />
                  <span>الإعدادات</span>
                </button>
                <button
                  onClick={() => { navigate('/help'); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-right flex items-center gap-3 hover:bg-hv transition-colors"
                >
                  <FaQuestionCircle size={14} />
                  <span>المساعدة والدعم</span>
                </button>
                <div className="border-t border-bd my-1"></div>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-right flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <FaSignOutAlt size={14} />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};