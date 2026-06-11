// ==========================================
// ملف القائمة الجانبية (Sidebar)
// يتحكم ديناميكياً في الروابط المعروضة بناءً على الصلاحيات المركبة الجديدة
// ==========================================
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { FaCalendarAlt, FaTasks, FaVideo, FaComments, FaBell, FaUserCog, FaShieldAlt, FaSignOutAlt } from 'react-icons/fa';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // استماع مباشر في الوقت الفعلي للإشعارات غير المقروءة الخاصة بالمستخدم من السحابة
  useEffect(() => {
    if (!userProfile?.uid) return;
    
    const q = query(
      collection(db, 'notifications'),
      where('targetUid', '==', userProfile.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error("Real-time notifications counter error:", error);
    });

    return unsubscribe;
  }, [userProfile?.uid]);

  // دالة معالجة تسجيل الخروج السحابي
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout operations failed:", error);
    }
  };

  // معالجة الألقاب والرتب الإدارية لتعرض بالكامل أسفل القائمة الجانبية
  const getRoleDisplay = () => {
    if (!userProfile) return 'جاري التحميل...';
    
    const titles = userProfile.additionalTitles && userProfile.additionalTitles.length > 0
      ? userProfile.additionalTitles.join(' / ')
      : '';
    
    let baseRole = 'موظف';
    if (userProfile.primaryRole === 'chairman') baseRole = 'رئيس مجلس الإدارة';
    else if (userProfile.primaryRole === 'vp') baseRole = 'نائب رئيس';
    else if (userProfile.primaryRole === 'manager') baseRole = 'مدير إدارة';

    return titles ? `${baseRole} (${titles})` : baseRole;
  };

  // التحقق الدقيق والمنظم لفتح صلاحية ظهور لوحة التحكم (الرئيس، النائب، المدير، أو منصب استثنائي)
  const canAccessAdminPanel = (): boolean => {
    if (!userProfile) return false;
    if (userProfile.primaryRole === 'chairman' || userProfile.primaryRole === 'vp' || userProfile.primaryRole === 'manager') {
      return true;
    }
    // تفعيل الوصول الاستثنائي للموظف أو المستشار إذا منحه الرئيس/النائب الصلاحية
    if (userProfile.hasCustomAdminAccess === true) {
      return true;
    }
    return false;
  };

  // مصفوفة الروابط الجانبية الثابتة والمطابقة لتصميمك الأصلي
  const menuItems = [
    { id: 'calendar', path: '/dashboard', icon: <FaCalendarAlt style={{ width: '20px', textAlign: 'center' }} />, label: 'التقويم' },
    { id: 'tasks', path: '/tasks', icon: <FaTasks style={{ width: '20px', textAlign: 'center' }} />, label: 'المهام' },
    { id: 'meetings', path: '/meetings', icon: <FaVideo style={{ width: '20px', textAlign: 'center' }} />, label: 'الاجتماعات' },
    { id: 'chat', path: '/chat', icon: <FaComments style={{ width: '20px', textAlign: 'center' }} />, label: 'المحادثات' },
    { id: 'notifications', path: '/notifications', icon: <FaBell style={{ width: '20px', textAlign: 'center' }} />, label: 'الإشعارات', showBadge: true },
    { id: 'divider', type: 'divider' },
    { id: 'profile', path: '/profile', icon: <FaUserCog style={{ width: '20px', textAlign: 'center' }} />, label: 'الملف الشخصي' }
  ];

  // حقن رابط لوحة التحكم برمجياً في حال توافر الصلاحيات الصارمة
  if (canAccessAdminPanel()) {
    menuItems.push({ id: 'admin', path: '/admin', icon: <FaShieldAlt style={{ width: '20px', textAlign: 'center' }} />, label: 'لوحة التحكم', showBadge: false });
  }

  // استخراج الحروف الأولى للاسم في حال غياب الصورة الشخصية
  const getInitials = (fullName: string): string => {
    return fullName.split(' ').map(w => w[0]).join('').slice(0, 2);
  };

  return (
    <aside id="side" className="w-64 flex flex-col h-full flex-shrink-0 overflow-y-auto" style={{ background: 'var(--bg2)', borderLeft: '1px solid var(--bd)' }}>
      {/* الشعار الأصلي المعتمد بقيم الـ SVG الكاملة دون تعديل */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--bd)' }}>
        <svg viewBox="0 0 340 70" className="w-48 mx-auto">
          <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
          <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
          <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
          <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
          <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
        </svg>
      </div>

      {/* قائمة عناصر الملاحة */}
      <nav id="sNav" className="flex-1 py-3">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={`divider-${index}`} style={{ borderTop: '1px solid var(--bd)', margin: '8px 0' }}></div>;
          }

          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.id}
              onClick={() => navigate(item.path!)}
              className={`si ${isActive ? 'ac' : ''}`}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.showBadge && unreadCount > 0 && (
                <span id="nBS" className="flex bg-[#EF4444] text-white text-[10px] rounded-full w-5 h-5 items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* الهيكل السفلي لبيانات المستخدم المسجل حالياً متوافق مع كود HTML القديم */}
      <div id="sUsr" className="p-4 flex items-center gap-3 cursor-pointer" style={{ borderTop: '1px solid var(--bd)' }} onClick={() => navigate('/profile')}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#8B1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700, overflow: 'hidden' }}>
          {userProfile?.avatarUrl ? (
            <img src={userProfile.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="Avatar" />
          ) : (
            userProfile?.name ? getInitials(userProfile.name) : 'UX'
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userProfile?.name || 'جاري المزامنة...'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--tx2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${getRoleDisplay()} - ${userProfile?.department}`}>
            {getRoleDisplay()} - {userProfile?.department}
          </div>
        </div>
        <FaSignOutAlt 
          id="loI" 
          className="cursor-pointer text-lg hover:text-red-500 transition-colors" 
          style={{ color: 'var(--tx2)' }} 
          title="تسجيل الخروج من النظام" 
          onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
        />
      </div>
    </aside>
  );
};