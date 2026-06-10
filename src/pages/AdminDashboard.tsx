import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaUserTie, FaTrash, FaUserShield } from 'react-icons/fa';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { UserProfile, Role } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'approvals'>('users');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب البيانات الحية من Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: UserProfile[] = [];
      const seen = new Set<string>();
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (u.email && !seen.has(u.email)) {
          seen.add(u.email);
          users.push({ ...u, uid: u.uid || docSnap.id });
        }
      });
      setUsersList(users);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const pendingApprovals = usersList.filter(u => !u.isActive);
  const activeUsers = usersList.filter(u => u.isActive);

  // قاعدة الحماية الأمنية القصوى: منع حذف محمد عثمان ورئيس مجلس الإدارة
  const isProtectedAccount = (email: string) => {
    if (!email) return false;
    const protectedEmails = ['mohd@uexperts.sa', 'm.othman@uexperts.sa'];
    return protectedEmails.includes(email.toLowerCase());
  };

  const handleApproveUser = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isActive: true });
      await updateDoc(doc(db, 'users', user.email.toLowerCase()), { isActive: true });
      alert('تم تفعيل حساب الموظف بنجاح.');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تفعيل الحساب.');
    }
  };

  const handleRejectUser = async (user: UserProfile) => {
    if (confirm('هل تود رفض هذا الطلب وحذفه نهائياً؟')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteDoc(doc(db, 'users', user.email.toLowerCase()));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    if (isProtectedAccount(user.email)) {
      alert('حظر أمني: لا يمكن تعديل الصلاحية الأساسية لهذا الحساب القيادي.');
      return;
    }
    
    // دورة الصلاحيات المتاحة
    const roles: Role[] = ['chairman', 'vp', 'manager', 'employee'];
    const currentIdx = roles.indexOf(user.primaryRole);
    const nextIdx = (currentIdx + 1) % roles.length;
    const nextRole = roles[nextIdx];

    if (confirm(`هل ترغب في ترقية/تعديل صلاحية ${user.name} إلى دور: ${nextRole}؟`)) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { primaryRole: nextRole });
        await updateDoc(doc(db, 'users', user.email.toLowerCase()), { primaryRole: nextRole });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEditTitles = async (user: UserProfile) => {
    const currentTitles = user.additionalTitles?.join('، ') || '';
    const newTitlesStr = prompt('أدخل الألقاب أو المناصب الإضافية (مفصولة بفاصلة):', currentTitles);
    if (newTitlesStr !== null) {
      const additionalTitles = newTitlesStr.split('،').map(t => t.trim()).filter(t => t.length > 0);
      try {
        await updateDoc(doc(db, 'users', user.uid), { additionalTitles });
        await updateDoc(doc(db, 'users', user.email.toLowerCase()), { additionalTitles });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (isProtectedAccount(user.email)) {
      alert('حظر أمني صارم! بناءً على سياسات النظام، لا يمكن إزالة رئيس مجلس الإدارة أو المستشار محمد عثمان نهائياً.');
      return;
    }
    if (confirm(`تحذير: هل أنت متأكد من حذف حساب ${user.name} وإلغاء وصوله للنظام تماماً؟`)) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteDoc(doc(db, 'users', user.email.toLowerCase()));
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">جاري الاتصال بقاعدة البيانات السحابية...</div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6 border-b border-[#1f1f1f] pb-4">
        <h2 className="text-xl font-bold text-white">لوحة تحكم الإدارة العليا</h2>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'users' ? 'bg-[#8B1A1A] text-white' : 'bg-[#111] text-gray-400 hover:bg-[#151515]'}`}>
          المستخدمين الحاليين والصلاحيات ({activeUsers.length})
        </button>
        <button onClick={() => setActiveTab('approvals')} className={`px-4 py-2 rounded-lg text-xs font-bold relative ${activeTab === 'approvals' ? 'bg-[#8B1A1A] text-white' : 'bg-[#111] text-gray-400 hover:bg-[#151515]'}`}>
          طلبات الانضمام المعلقة
          {pendingApprovals.length > 0 && <span className="absolute -top-1 -left-1 bg-yellow-600 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center">{pendingApprovals.length}</span>}
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl overflow-x-auto shadow-lg">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-[#111] text-gray-400 text-xs border-b border-[#1f1f1f]">
                <th className="p-4">الموظف / الاسم</th>
                <th className="p-4">البريد الإلكتروني</th>
                <th className="p-4">الإدارة المختصة</th>
                <th className="p-4">مستوى الصلاحية (Role)</th>
                <th className="p-4">المناصب والألقاب</th>
                <th className="p-4">إجراءات التحكم</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => (
                <tr key={user.uid} className="border-b border-[#1f1f1f] hover:bg-[#111]/50 transition-colors">
                  <td className="p-4 font-semibold text-white">{user.name}</td>
                  <td className="p-4 text-xs text-gray-400">{user.email}</td>
                  <td className="p-4 text-xs">{user.department}</td>
                  <td className="p-4 text-xs text-yellow-500 font-bold uppercase">{user.primaryRole}</td>
                  <td className="p-4 flex flex-wrap gap-1">
                    {user.additionalTitles?.map((t, idx) => (
                      <span key={idx} className="bg-[#8B1A1A]/20 text-red-100 text-[10px] px-2 py-0.5 rounded border border-[#8B1A1A]/40">{t}</span>
                    ))}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleRole(user)} className="p-2 rounded bg-[#111] border border-[#1f1f1f] text-yellow-500 hover:bg-[#222]" title="تغيير مستوى الصلاحية"><FaUserShield size={12} /></button>
                      <button onClick={() => handleEditTitles(user)} className="p-2 rounded bg-[#111] border border-[#1f1f1f] text-blue-400 hover:bg-[#222]" title="إسناد مناصب أو ألقاب إضافية"><FaUserTie size={12} /></button>
                      <button onClick={() => handleDeleteUser(user)} className={`p-2 rounded border border-[#1f1f1f] ${isProtectedAccount(user.email) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-[#111] text-red-500 hover:bg-red-900/30'}`} title="حذف المستخدم نهائياً"><FaTrash size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="grid gap-4">
          {pendingApprovals.length === 0 ? (
            <div className="text-center bg-[#151515] border border-[#1f1f1f] p-10 rounded-xl text-gray-500">لا توجد طلبات انضمام معلقة حالياً في النظام.</div>
          ) : (
            pendingApprovals.map(app => (
              <div key={app.uid} className="bg-[#151515] border border-[#1f1f1f] p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
                <div>
                  <h4 className="font-bold text-white text-base mb-1">{app.name}</h4>
                  <p className="text-xs text-gray-400">البريد: {app.email} | الجوال: {app.phone || 'غير مسجل'}</p>
                  <p className="text-xs text-gray-400 mt-1">الإدارة المطلوبة: <span className="text-yellow-500">{app.department}</span></p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleApproveUser(app)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors"><FaCheck /> موافقة ومنح الدخول</button>
                  <button onClick={() => handleRejectUser(app)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors"><FaTimes /> رفض وحذف</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};