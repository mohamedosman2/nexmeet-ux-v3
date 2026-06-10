// ==========================================
// ملف القائمة الجانبية (Sidebar)
// ==========================================
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaTasks, FaVideo, FaComments, FaBell, FaUserCog, FaShieldAlt, FaSignOutAlt } from 'react-icons/fa';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();

  // دالة تسجيل الخروج
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // دالة ترجمة الصلاحيات للعربية كما في كودك الأصلي
  const getRoleName = (role: string | undefined) => {
    switch(role) {
      case 'chairman': return 'رئيس مجلس الإدارة';
      case 'vp': return 'نائب رئيس';
      case 'manager': return 'مدير';
      case 'employee': return 'موظف';
      default: return 'موظف';
    }
  };

  // قائمة الروابط الأساسية
  const menuItems = [
    { path: '/dashboard', icon: <FaCalendarAlt className="w-5 text-center" />, label: 'التقويم' },
    { path: '/tasks', icon: <FaTasks className="w-5 text-center" />, label: 'المهام' },
    { path: '/meetings', icon: <FaVideo className="w-5 text-center" />, label: 'الاجتماعات' },
    { path: '/chat', icon: <FaComments className="w-5 text-center" />, label: 'المحادثات' },
    { path: '/notifications', icon: <FaBell className="w-5 text-center" />, label: 'الإشعارات', hasBadge: true },
    { type: 'divider' },
    { path: '/profile', icon: <FaUserCog className="w-5 text-center" />, label: 'الملف الشخصي' }
  ];

  // إضافة لوحة التحكم فقط للقيادات العليا (الرئيس والنائب)
  if (userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp') {
    menuItems.push({ path: '/admin', icon: <FaShieldAlt className="w-5 text-center" />, label: 'لوحة التحكم' });
  }

  // استخراج أول حرفين من اسم المستخدم
  const userInitials = userProfile?.name ? userProfile.name.substring(0, 2) : 'م';

  return (
    <aside className="w-64 flex flex-col h-full flex-shrink-0 overflow-y-auto" style={{ background: 'var(--bg2)', borderLeft: '1px solid var(--bd)' }}>
      {/* اللوجو من تصميمك الأصلي */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--bd)' }}>
        <svg viewBox="0 0 340 70" className="w-48 mx-auto">
          <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
          <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
          <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
          <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
          <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
        </svg>
      </div>

      <nav className="flex-1 py-3">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={index} style={{ borderTop: '1px solid var(--bd)', margin: '8px 0' }}></div>;
          }
          
          const isActive = location.pathname === item.path;
          return (
            <div 
              key={item.path}
              onClick={() => navigate(item.path!)}
              className={`si ${isActive ? 'ac' : ''}`}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.hasBadge && (
                <span id="nBS" style={{ display: 'none', background: '#EF4444', color: '#fff', fontSize: '10px', borderRadius: '50%', width: '20px', height: '20px', alignItems: 'center', justifyContent: 'center' }}>0</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* بيانات المستخدم أسفل القائمة */}
      <div className="p-4 flex items-center gap-3 cursor-pointer" style={{ borderTop: '1px solid var(--bd)' }} onClick={() => navigate('/profile')}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#8B1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700, overflow: 'hidden' }}>
          {userInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userProfile?.name}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--tx2)' }}>
            {getRoleName(userProfile?.primaryRole)} - {userProfile?.department}
          </div>
        </div>
        <FaSignOutAlt className="cursor-pointer" style={{ color: 'var(--tx2)' }} title="تسجيل الخروج" onClick={(e) => { e.stopPropagation(); handleLogout(); }} />
      </div>
    </aside>
  );
};