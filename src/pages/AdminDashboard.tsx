import React, { useState } from 'react';
import { FaCheck, FaTimes, FaUserTie, FaKey, FaTrash } from 'react-icons/fa';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'depts'>('users');

  // بيانات وهمية للإدارة يتم تعويضها بـ Firestore لاحقاً
  const [pendingApprovals] = useState([
    { id: 'app1', name: 'أحمد التميمي', email: 'a.tamimi@uexperts.sa', department: 'التكنولوجيا' }
  ]);

  const [usersList, setUsersList] = useState([
    { email: 'mohd@uexperts.sa', name: 'محمد آل نصار (أبو نواف)', department: 'الإدارة العليا', role: 'chairman', titles: ['رئيس مجلس الإدارة'] },
    { email: 'ali@uexperts.sa', name: 'علي آل رابعة القحطاني', department: 'التسويق', role: 'vp', titles: ['نائب رئيس مجلس الإدارة', 'مدير التسويق'] },
    { email: 'm.othman@uexperts.sa', name: 'محمد عثمان', department: 'المالية والتدقيق', role: 'manager', titles: ['مستشار رئيس مجلس الإدارة'] },
    { email: 'muharib@uexperts.sa', name: 'خالد المحارب', department: 'العلاقات العامة', role: 'manager', titles: ['مستشار رئيس مجلس الإدارة'] }
  ]);

  // دالة أمنية لحظر إزالة الموظفين القياديين
  const isProtectedAccount = (email: string) => {
    return email === 'mohd@uexperts.sa' || email === 'm.othman@uexperts.sa' || email === 'ali@uexperts.sa';
  };

  const handleDeleteUser = (email: string) => {
    if (isProtectedAccount(email)) {
      alert('خطأ أمني: حظر النظام! لا يمكن حذف هذا الحساب القيادي نهائياً بناءً على سياسة الأمان.');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا الموظف نهائياً؟')) {
      setUsersList(usersList.filter(u => u.email !== email));
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* التبويبات العلوية */}
      <div className="flex gap-2 mb-6 flex-wrap border-b border-[#1f1f1f] pb-3">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'users' ? 'bg-[#8B1A1A] text-white' : 'bg-[#111] text-gray-400 hover:bg-[#151515]'}`}>
          المستخدمين الحاليين
        </button>
        <button onClick={() => setActiveTab('approvals')} className={`px-4 py-2 rounded-lg text-xs font-bold relative ${activeTab === 'approvals' ? 'bg-[#8B1A1A] text-white' : 'bg-[#111] text-gray-400 hover:bg-[#151515]'}`}>
          طلبات الانضمام المعلقة
          {pendingApprovals.length > 0 && <span className="absolute -top-1 -left-1 bg-yellow-600 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center">{pendingApprovals.length}</span>}
        </button>
      </div>

      {/* محتوى تبويب المستخدمين */}
      {activeTab === 'users' && (
        <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-[#111] text-gray-400 text-xs border-b border-[#1f1f1f]">
                <th className="p-4">الموظف الأقدم</th>
                <th className="p-4">البريد الإلكتروني</th>
                <th className="p-4">الإدارة الإدارية</th>
                <th className="p-4">الألقاب والمسميات</th>
                <th className="p-4">إجراءات التحكم</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((user) => (
                <tr key={user.email} className="border-b border-[#1f1f1f] hover:bg-[#111]/50">
                  <td className="p-4 font-semibold">{user.name}</td>
                  <td className="p-4 text-xs text-gray-400">{user.email}</td>
                  <td className="p-4 text-xs">{user.department}</td>
                  <td className="p-4 flex flex-wrap gap-1">
                    {user.titles.map((t, idx) => (
                      <span key={idx} className="bg-[#8B1A1A]/10 text-[#e8e8e8] text-[10px] px-2 py-0.5 rounded border border-[#8B1A1A]/20">{t}</span>
                    ))}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded bg-[#111] text-blue-400 hover:bg-[#1E3A6E]/20" title="إسناد لقب أو ترقية"><FaUserTie size={12} /></button>
                      <button className="p-1.5 rounded bg-[#111] text-yellow-500 hover:bg-[#151515]" title="إعادة تعيين كلمة مرور سريعة"><FaKey size={12} /></button>
                      <button onClick={() => handleDeleteUser(user.email)} className={`p-1.5 rounded ${isProtectedAccount(user.email) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`} title="حذف المستخدم"><FaTrash size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* محتوى تبويب طلبات الانضمام */}
      {activeTab === 'approvals' && (
        <div className="grid gap-3">
          {pendingApprovals.length === 0 ? (
            <p className="text-center p-8 text-gray-500 text-sm">لا توجد طلبات انضمام حالياً.</p>
          ) : (
            pendingApprovals.map(app => (
              <div key={app.id} className="bg-[#151515] border border-[#1f1f1f] p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">{app.name}</h4>
                  <p className="text-xs text-gray-400">{app.email} - إدارة {app.department}</p>
                </div>
                <div className="flex gap-2">
                  <button className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1"><FaCheck /> موافقة</button>
                  <button className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1"><FaTimes /> رفض</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};