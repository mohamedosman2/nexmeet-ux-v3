// src/components/Layout.tsx

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../contexts/AuthContext';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';

export const Layout: React.FC = () => {
  const { userProfile } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // مراقبة تغيير حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // حفظ حالة القائمة الجانبية في localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null && !isMobile) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // إغلاق القائمة عند تغيير الصفحة في وضع الجوال
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  // عرض شاشة ترحيب للمستخدم الجديد
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('welcomeSeen');
    if (!hasSeenWelcome && userProfile && !userProfile.isActive) {
      setShowWelcome(true);
      setTimeout(() => {
        setShowWelcome(false);
        localStorage.setItem('welcomeSeen', 'true');
      }, 5000);
    }
  }, [userProfile]);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--tx)', direction: 'rtl' }}>
      
      {/* شاشة الترحيب المنبثقة */}
      {showWelcome && userProfile && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideInUp">
          <div className="bg-gradient-to-r from-brand to-brand-light text-white rounded-lg shadow-xl p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xl">👋</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">مرحباً {userProfile.name}!</h4>
                <p className="text-xs opacity-90 mt-1">
                  حسابك قيد المراجعة من قبل الإدارة. سيتم إشعارك عند التفعيل.
                </p>
              </div>
              <button 
                onClick={() => setShowWelcome(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* القائمة الجانبية - للشاشات الكبيرة */}
      {!isMobile && (
        <div 
          className={`transition-all duration-300 ease-in-out flex-shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
          style={{ background: 'var(--bg2)', borderLeft: '1px solid var(--bd)' }}
        >
          <Sidebar collapsed={sidebarCollapsed} />
        </div>
      )}

      {/* القائمة الجانبية - للجوال (منبثقة) */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={toggleMobileMenu}
        >
          <div 
            className="absolute right-0 top-0 h-full w-64 animate-slideInRight"
            style={{ background: 'var(--bg2)', borderLeft: '1px solid var(--bd)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar collapsed={false} isMobile={true} onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        
        {/* الشريط العلوي */}
        <Header 
          onMenuClick={isMobile ? toggleMobileMenu : undefined}
          onSidebarToggle={!isMobile ? toggleSidebar : undefined}
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
        />
        
        {/* زر تصغير/تكبير القائمة للشاشات الكبيرة */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="absolute top-20 right-0 z-20 translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ 
              background: 'var(--bg3)', 
              border: '1px solid var(--bd)',
              color: 'var(--tx2)'
            }}
          >
            {sidebarCollapsed ? <FaChevronLeft size={10} /> : <FaChevronRight size={10} />}
          </button>
        )}
        
        {/* منطقة عرض الصفحات */}
        <div 
          id="content-area" 
          className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* الخلفيات المتحركة */}
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="floating-shape" style={{ width: '300px', height: '300px', background: '#8B1A1A', top: '10%', right: '10%' }}></div>
            <div className="floating-shape" style={{ width: '200px', height: '200px', background: '#1E3A6E', bottom: '15%', left: '15%' }}></div>
            <div className="floating-shape" style={{ width: '250px', height: '250px', background: '#A52A2A', top: '40%', left: '40%', opacity: '0.05' }}></div>
            <div className="floating-shape" style={{ width: '150px', height: '150px', background: '#3B82F6', bottom: '30%', right: '20%', opacity: '0.03' }}></div>
          </div>
          
          {/* المحتوى */}
          <div className="relative z-10">
            <Outlet />
          </div>
        </div>

        {/* زر العودة للأعلى */}
        <ScrollToTopButton />
      </main>
    </div>
  );
};

// ==========================================
// زر العودة للأعلى
// ==========================================

const ScrollToTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    const handleScroll = () => {
      setVisible(contentArea.scrollTop > 300);
    };

    contentArea.addEventListener('scroll', handleScroll);
    return () => contentArea.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg animate-fadeIn"
      style={{ 
        background: 'var(--brand-primary)',
        color: 'white',
        border: 'none',
        cursor: 'pointer'
      }}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
};