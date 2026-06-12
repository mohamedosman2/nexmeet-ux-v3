// src/components/Sidebar.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { 
  FaCalendarAlt, 
  FaTasks, 
  FaVideo, 
  FaComments, 
  FaBell, 
  FaUserCog, 
  FaShieldAlt, 
  FaSignOutAlt,
  FaChartLine,
  FaUsers,
  FaBuilding,
  FaFileAlt,
  FaQuestionCircle,
  FaRegLightbulb,
  FaCog,
  FaHome,
  FaTimes
} from 'react-icons/fa';

interface SidebarProps {
  collapsed?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  id: string;
  path: string;
  icon: React.ReactNode;
  label: string;
  showBadge?: boolean;
  roles?: ('chairman' | 'vp' | 'manager' | 'employee')[];
  permissions?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, isMobile = false, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, unreadNotificationsCount, logout } = useAuth();
  const { canAccessAdminPanel, isTopManagement, isManager } = usePermissions();
  
  const [activeItem, setActiveItem] = useState<string>('');

  // تحديث العنصر النشط بناءً على المسار الحالي
  useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/calendar') setActiveItem('calendar');
    else if (path === '/tasks') setActiveItem('tasks');
    else if (path === '/meetings') setActiveItem('meetings');
    else if (path === '/chat') setActiveItem('chat');
    else if (path === '/notifications') setActiveItem('notifications');
    else if (path === '/profile') setActiveItem('profile');
    else if (path === '/admin') setActiveItem('admin');
    else if (path === '/users') setActiveItem('users');
    else if (path === '/departments') setActiveItem('departments');
    else if (path === '/reports') setActiveItem('reports');
    else setActiveItem('');
  }, [location.pathname]);

  // قائمة عناصر القائمة
  const menuItems: MenuItem[] = [
    {
      id: 'calendar',
      path: '/dashboard',
      icon: <FaCalendarAlt size={18} />,
      label: 'التقويم',
      roles: ['chairman', 'vp', 'manager', 'employee']
    },
    {
      id: 'tasks',
      path: '/tasks',
      icon: <FaTasks size={18} />,
      label: 'المهام',
      roles: ['chairman', 'vp', 'manager', 'employee']
    },
    {
      id: 'meetings',
      path: '/meetings',
      icon: <FaVideo size={18} />,
      label: 'الاجتماعات',
      roles: ['chairman', 'vp', 'manager', 'employee']
    },
    {
      id: 'chat',
      path: '/chat',
      icon: <FaComments size={18} />,
      label: 'المحادثات',
      roles: ['chairman', 'vp', 'manager', 'employee']
    },
    {
      id: 'notifications',
      path: '/notifications',
      icon: <FaBell size={18} />,
      label: 'الإشعارات',
      showBadge: true,
      roles: ['chairman', 'vp', 'manager', 'employee']
    }
  ];

  // قائمة عناصر الإدارة (تظهر فقط للمديرين والإدارة العليا)
  const adminItems: MenuItem[] = [
    { id: 'divider1', path: '', icon: <></>, label: '', type: 'divider' },
    {
      id: 'admin',
      path: '/admin',
      icon: <FaShieldAlt size={18} />,
      label: 'لوحة التحكم',
      roles: ['chairman', 'vp', 'manager'],
      permissions: ['admin']
    },
    {
      id: 'users',
      path: '/users',
      icon: <FaUsers size={18} />,
      label: 'المستخدمين',
      roles: ['chairman', 'vp', 'manager'],
      permissions: ['admin']
    },
    {
      id: 'departments',
      path: '/departments',
      icon: <FaBuilding size={18} />,
      label: 'الإدارات',
      roles: ['chairman', 'vp'],
      permissions: ['admin']
    },
    {
      id: 'reports',
      path: '/reports',
      icon: <FaChartLine size={18} />,
      label: 'التقارير',
      roles: ['chairman', 'vp', 'manager'],
      permissions: ['admin']
    }
  ];

  // قائمة عناصر إضافية
  const extraItems: MenuItem[] = [
    { id: 'divider2', path: '', icon: <></>, label: '', type: 'divider' },
    {
      id: 'profile',
      path: '/profile',
      icon: <FaUserCog size={18} />,
      label: 'الملف الشخصي',
      roles: ['chairman', 'vp', 'manager', 'employee']
    },
    {
      id: 'help',
      path: '/help',
      icon: <FaQuestionCircle size={18} />,
      label: 'المساعدة',
      roles: ['chairman', 'vp', 'manager', 'employee']
    },
    {
      id: 'suggestions',
      path: '/suggestions',
      icon: <FaRegLightbulb size={18} />,
      label: 'اقتراحات',
      roles: ['chairman', 'vp', 'manager', 'employee']
    },
    {
      id: 'settings',
      path: '/settings',
      icon: <FaCog size={18} />,
      label: 'الإعدادات',
      roles: ['chairman', 'vp', 'manager', 'employee']
    }
  ];

  // دالة للتحقق مما إذا كان العنصر مسموحاً به للمستخدم الحالي
  const isMenuItemAllowed = (item: MenuItem): boolean => {
    if (!userProfile) return false;
    
    // إذا كان العنصر مقسماً (divider)
    if (item.type === 'divider') return true;
    
    // التحقق من الأدوار
    if (item.roles && !item.roles.includes(userProfile.primaryRole)) {
      // إذا كان المستخدم من الإدارة العليا وله صلاحية الوصول
      if (!isTopManagement && !isManager) return false;
    }
    
    // التحقق من الصلاحيات الخاصة
    if (item.permissions) {
      if (item.permissions.includes('admin') && !canAccessAdminPanel) return false;
    }
    
    return true;
  };

  // تصفية العناصر المسموحة
  const visibleMenuItems = menuItems.filter(isMenuItemAllowed);
  const visibleAdminItems = adminItems.filter(isMenuItemAllowed);
  const visibleExtraItems = extraItems.filter(isMenuItemAllowed);

  // الحصول على الحروف الأولى للاسم
  const getInitials = (name: string): string => {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2);
  };

  // الحصول على عرض الدور
  const getRoleDisplay = () => {
    if (!userProfile) return 'جاري التحميل...';
    
    const titles = userProfile.additionalTitles?.length > 0
      ? userProfile.additionalTitles.join(' / ')
      : '';
    
    let baseRole = 'موظف';
    if (userProfile.primaryRole === 'chairman') baseRole = 'رئيس مجلس الإدارة';
    else if (userProfile.primaryRole === 'vp') baseRole = 'نائب رئيس مجلس الإدارة';
    else if (userProfile.primaryRole === 'manager') baseRole = 'مدير إدارة';

    return titles ? `${baseRole} (${titles})` : baseRole;
  };

  return (
    <aside 
      className={`flex flex-col h-full flex-shrink-0 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{ background: 'var(--bg2)', borderLeft: '1px solid var(--bd)' }}
    >
      {/* زر الإغلاق للجوال */}
      {isMobile && (
        <div className="flex justify-end p-3">
          <button onClick={onClose} className="icon-btn">
            <FaTimes />
          </button>
        </div>
      )}

      {/* الشعار */}
      <div className={`p-4 ${collapsed ? 'text-center' : ''}`} style={{ borderBottom: '1px solid var(--bd)' }}>
        {!collapsed ? (
          <svg viewBox="0 0 340 70" className="w-full max-w-[160px] mx-auto">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity="0.4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity="0.4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">
              United Experts
            </text>
          </svg>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center" style={{ background: 'var(--brand-primary)' }}>
            <span className="text-white font-bold text-lg">U</span>
          </div>
        )}
      </div>

      {/* قائمة التنقل */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {/* العناصر الرئيسية */}
        {visibleMenuItems.map((item) => (
          <MenuItemComponent
            key={item.id}
            item={item}
            active={activeItem === item.id}
            collapsed={collapsed}
            onClick={() => navigate(item.path)}
            badgeCount={item.showBadge ? unreadNotificationsCount : undefined}
          />
        ))}

        {/* العناصر الإدارية */}
        {visibleAdminItems.map((item) => (
          item.type === 'divider' ? (
            <div key={item.id} className={`my-2 ${collapsed ? 'mx-2' : 'mx-4'}`} style={{ borderTop: '1px solid var(--bd)' }} />
          ) : (
            <MenuItemComponent
              key={item.id}
              item={item}
              active={activeItem === item.id}
              collapsed={collapsed}
              onClick={() => navigate(item.path)}
            />
          )
        ))}

        {/* العناصر الإضافية */}
        {visibleExtraItems.map((item) => (
          item.type === 'divider' ? (
            <div key={item.id} className={`my-2 ${collapsed ? 'mx-2' : 'mx-4'}`} style={{ borderTop: '1px solid var(--bd)' }} />
          ) : (
            <MenuItemComponent
              key={item.id}
              item={item}
              active={activeItem === item.id}
              collapsed={collapsed}
              onClick={() => navigate(item.path)}
            />
          )
        ))}
      </nav>

      {/* معلومات المستخدم */}
      <div 
        className={`p-4 flex items-center gap-3 cursor-pointer transition-all hover:bg-hv ${collapsed ? 'justify-center' : ''}`}
        style={{ borderTop: '1px solid var(--bd)' }}
        onClick={() => navigate('/profile')}
      >
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--brand-primary)' }}
        >
          {userProfile?.avatarUrl ? (
            <img src={userProfile.avatarUrl} className="w-full h-full object-cover rounded-full" alt="Avatar" />
          ) : (
            userProfile?.name ? getInitials(userProfile.name) : 'UX'
          )}
        </div>
        
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{userProfile?.name || 'جاري التحميل...'}</div>
            <div className="text-[10px] text-gray-500 truncate">{getRoleDisplay()}</div>
            <div className="text-[9px] text-brand-light truncate">{userProfile?.department}</div>
          </div>
        )}
        
        {!collapsed && (
          <FaSignOutAlt 
            className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); logout(); }}
            title="تسجيل الخروج"
          />
        )}
      </div>
    </aside>
  );
};

// ==========================================
// مكون عنصر القائمة
// ==========================================

interface MenuItemComponentProps {
  item: MenuItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badgeCount?: number;
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ 
  item, 
  active, 
  collapsed, 
  onClick, 
  badgeCount 
}) => {
  return (
    <div
      onClick={onClick}
      className={`sidebar-item ${active ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <div className="relative">
        {item.icon}
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
      {!collapsed && <span className="flex-1">{item.label}</span>}
    </div>
  );
};