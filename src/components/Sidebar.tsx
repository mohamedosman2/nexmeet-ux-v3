import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaTasks, FaVideo, FaComments, FaBell, FaUserCog, FaShieldAlt, FaSignOutAlt } from 'react-icons/fa';
import { auth } from '../config/firebase';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // لمعرفة الصفحة الحالية وتظليلها

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: <FaCalendarAlt />, label: 'التقويم' },
    { path: '/tasks', icon: <FaTasks />, label: 'المهام' },
    { path: '/meetings', icon: <FaVideo />, label: 'الاجتماعات' },
    { path: '/chat', icon: <FaComments />, label: 'المحادثات' },
    { path: '/notifications', icon: <FaBell />, label: 'الإشعارات', hasBadge: true },
    { type: 'divider' },
    { path: '/profile', icon: <FaUserCog />, label: 'الملف الشخصي' },
    { path: '/admin', icon: <FaShieldAlt />, label: 'لوحة التحكم' },
  ];

  return (
    <aside className="w-64 flex flex-col h-full flex-shrink-0 overflow-y-auto bg-[#111] border-l border-[#1f1f1f]">
      {/* الشعار */}
      <div className="p-4 border-b border-[#1f1f1f] text-center">
        <h1 className="text-[#8B1A1A] font-extrabold text-2xl font-cairo">United Experts</h1>
      </div>

      {/* روابط التنقل */}
      <nav className="flex-1 py-3">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={index} className="border-t border-[#1f1f1f] my-2"></div>;
          }
          
          const isActive = location.pathname === item.path;
          return (
            <div 
              key={item.path}
              onClick={() => navigate(item.path!)}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-all border-r-4 ${isActive ? 'bg-[#8B1A1A]/10 border-[#8B1A1A] text-[#e8e8e8]' : 'border-transparent text-[#888] hover:bg-[#8B1A1A]/10 hover:text-[#e8e8e8]'}`}
            >
              <div className="w-5 text-center">{item.icon}</div>
              <span className="flex-1 text-sm">{item.label}</span>
              {item.hasBadge && (
                <span className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">0</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* بيانات المستخدم المصغرة في الأسفل */}
      <div className="p-4 flex items-center gap-3 cursor-pointer border-t border-[#1f1f1f] hover:bg-[#151515]">
        <div className="w-9 h-9 rounded-full bg-[#8B1A1A] flex items-center justify-center text-white text-xs font-bold">
          {/* سنستبدل هذا الحرف بصورة أو اسم المستخدم الحقيقي من قاعدة البيانات لاحقاً */}
          مح
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">محمد آل نصار</div>
          <div className="text-[10px] text-[#888]">رئيس مجلس الإدارة</div>
        </div>
        <FaSignOutAlt className="text-[#888] hover:text-red-500" onClick={handleLogout} />
      </div>
    </aside>
  );
};