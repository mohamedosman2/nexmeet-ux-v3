import React, { useState, useEffect } from 'react';
import { 
  FaCheck, FaTimes, FaUserTie, FaKey, FaTrash, 
  FaUserShield, FaPlus, FaBuilding, FaMapMarkerAlt 
} from 'react-icons/fa';
import { db, auth } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile, Role, Department, Region } from '../types';

export const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'depts' | 'branches'>('users');
  
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
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

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const depts: Department[] = [];
      snapshot.forEach(docSnap => depts.push({ id: docSnap.id, ...docSnap.data() } as Department));
      setDepartments(depts);
    });

    const unsubRegions = onSnapshot(collection(db, 'regions'), (snapshot) => {
      const reg: Region[] = [];
      snapshot.forEach(docSnap => reg.push({ id: docSnap.id, ...docSnap.data() } as Region));
      setRegions(reg);
    });

    return () => { unsubUsers(); unsubDepts(); unsubRegions(); };
  }, []);

  const pendingApprovals = usersList.filter(u => !u.isActive);
  const activeUsers = usersList.filter(u => u.isActive);

  const isProtectedAccount = (email: string) => {
    if (!email) return false;
    const protectedEmails = ['mohd@uexperts.sa', 'm.othman@uexperts.sa', 'ali@uexperts.sa'];
    return protectedEmails.includes(email.toLowerCase());
  };

  const handleApproveUser = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isActive: true });
      await updateDoc(doc(db, 'users', user.email.toLowerCase()), { isActive: true });
    } catch (err) {
      alert('خطأ في الموافقة السحابية.');
    }
  };

  const handleRejectUser = async (user: UserProfile) => {
    if (confirm('هل أنت متأكد من رفض وحذف هذا الطلب نهائياً؟')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteDoc(doc(db, 'users', user.email.toLowerCase()));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (isProtectedAccount(user.email)) {
      alert('⚠️ حظر أمني صارم: لا يمكن إزالة رئيس مجلس الإدارة أو المستشارين المعتمدين في النواة.');
      return;
    }
    if (confirm(`تحذير: هل تود حذف حساب ${user.name} وجميع صلاحياته؟`)) {
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
      alert('⚠️ حظر أمني: لا يمكن تعديل الصلاحية الأساسية لهذا الحساب القيادي.');
      return;
    }
    const roles: Role[] = ['chairman', 'vp', 'manager', 'employee'];
    const nextRole = roles[(roles.indexOf(user.primaryRole) + 1) % roles.length];

    if (confirm(`هل ترغب في تغيير الصلاحية التقنية لـ ${user.name} إلى: ${nextRole}؟`)) {
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
    const newTitlesStr = prompt('أدخل الألقاب الإدارية الإضافية (مفصولة بفاصلة):', currentTitles);
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

  const handleResetPassword = async (email: string) => {
    if (confirm(`هل تريد إرسال رابط رسمي لإعادة تعيين كلمة المرور إلى ${email}؟`)) {
      try {
        await sendPasswordResetEmail(auth, email);
        alert('تم إرسال رابط إعادة التعيين بنجاح!');
      } catch (err) {
        alert('حدث خطأ أثناء الإرسال.');
      }
    }
  };

  const handleAddDept = async () => {
    const name = prompt('أدخل اسم الإدارة الجديدة:');
    if (name) {
      await addDoc(collection(db, 'departments'), { name, managerUid: null });
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (confirm('حذف هذه الإدارة؟')) await deleteDoc(doc(db, 'departments', id));
  };

  const handleAddRegion = async () => {
    const region = prompt('اسم المنطقة الجديدة:');
    if (region) {
      await addDoc(collection(db, 'regions'), { region, branches: [] });
    }
  };

  const handleDeleteRegion = async (id: string) => {
    if (confirm('حذف هذه المنطقة بالكامل بكل فروعها؟')) await deleteDoc(doc(db, 'regions', id));
  };

  const handleAddBranch = async (regionId: string, currentBranches: any[]) => {
    const branchName = prompt('اسم الفرع الجديد:');
    if (!branchName) return;
    const roomsStr = prompt('أدخل أسماء القاعات (مفصولة بفاصلة):', 'القاعة الرئيسية');
    const rooms = roomsStr ? roomsStr.split('،').map(r => r.trim()) : ['القاعة الرئيسية'];
    
    const newBranch = { id: `br_${Date.now()}`, name: branchName, rooms };
    await updateDoc(doc(db, 'regions', regionId), { branches: [...currentBranches, newBranch] });
  };

  const handleDeleteBranch = async (regionId: string, currentBranches: any[], branchId: string) => {
    if (confirm('حذف هذا الفرع؟')) {
      const updatedBranches = currentBranches.filter(b => b.id !== branchId);
      await updateDoc(doc(db, 'regions', regionId), { branches: updatedBranches });
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">جاري الاتصال بقاعدة البيانات السحابية...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="flex gap-2 mb-6 flex-wrap border-b border-[#1f1f1f] pb-4">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'users' ? 'bg-[#8B1A1A] text-white' : 'bg-[#111] text-gray-400 hover:bg-[#151515]'}`}>
          المستخدمين الحاليين ({activeUsers.length})
        </button>
        <button onClick={() => setActiveTab('approvals')} className={`px-4 py-2 rounded-lg text-xs font-bold relative ${activeTab === 'approvals' ? 'bg-[#8B1A1A] text-white' : 'bg-[#111] text-gray-400 hover:bg-[#151515]'}`}>
          طلبات الانضمام المعلقة
          {pendingApprovals.length > 0 && <span className="absolute -top-1 -left-1 bg-yellow-600 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center">{pendingApprovals.length}</span>}
        </button>
        {userProfile?.primaryRole === 'chairman' && (
          <>
            <button onClick={() => setActiveTab('depts')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'depts' ? 'bg-[#8B1A1A] text-white' : 'bg-[#111] text-gray-400 hover:bg-[#151515]'}`}>
              الإدارات والهياكل
            </button>
            <button onClick={() => setActiveTab('branches')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'branches' ? 'bg-[#8B1A1A] text-white' : 'bg-[#111] text-gray-400 hover:bg-[#151515]'}`}>
              الفروع والمناطق
            </button>
          </>
        )}
      </div>

      {activeTab === 'users' && (
        <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-[#111] text-gray-400 text-xs border-b border-[#1f1f1f]">
                <th className="p-4">الاسم / الموظف</th>
                <th className="p-4">البريد الإلكتروني</th>
                <th className="p-4">الإدارة</th>
                <th className="p-4">الصلاحية التقنية</th>
                <th className="p-4">المناصب والألقاب الإدارية</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => (
                <tr key={user.uid} className="border-b border-[#1f1f1f] hover:bg-[#111]/50">
                  <td className="p-4 font-semibold">{user.name}</td>
                  <td className="p-4 text-xs text-gray-400">{user.email}</td>
                  <td className="p-4 text-xs">{user.department}</td>
                  <td className="p-4 text-xs font-bold uppercase text-yellow-500">{user.primaryRole}</td>
                  <td className="p-4 flex flex-wrap gap-1">
                    {user.additionalTitles?.map((t, idx) => (
                      <span key={idx} className="bg-[#8B1A1A]/20 text-red-100 text-[10px] px-2 py-0.5 rounded border border-[#8B1A1A]/40">{t}</span>
                    ))}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleRole(user)} className="p-2 rounded bg-[#111] text-yellow-500 hover:bg-[#222]" title="تغيير مستوى الصلاحية"><FaUserShield size={12} /></button>
                      <button onClick={() => handleEditTitles(user)} className="p-2 rounded bg-[#111] text-blue-400 hover:bg-[#222]" title="إسناد منصب أو لقب إضافي"><FaUserTie size={12} /></button>
                      <button onClick={() => handleResetPassword(user.email)} className="p-2 rounded bg-[#111] text-green-400 hover:bg-[#222]" title="إرسال رابط إعادة تعيين كلمة المرور"><FaKey size={12} /></button>
                      <button onClick={() => handleDeleteUser(user)} className={`p-2 rounded ${isProtectedAccount(user.email) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-red-500/10 text-red-500 hover:bg-red-900/30'}`} title="حذف الموظف نهائياً"><FaTrash size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="grid gap-3">
          {pendingApprovals.length === 0 ? (
            <p className="text-center p-8 text-gray-500 text-sm">لا توجد طلبات انضمام معلقة حالياً.</p>
          ) : (
            pendingApprovals.map(app => (
              <div key={app.uid} className="bg-[#151515] border border-[#1f1f1f] p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">{app.name}</h4>
                  <p className="text-xs text-gray-400">البريد: {app.email} | الإدارة المطلوبة: <span className="text-yellow-500">{app.department}</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApproveUser(app)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1"><FaCheck /> قبول وتفعيل</button>
                  <button onClick={() => handleRejectUser(app)} className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1"><FaTimes /> رفض وحذف</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'depts' && userProfile?.primaryRole === 'chairman' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">الإدارات المعتمدة في النظام</h3>
            <button onClick={handleAddDept} className="bb flex items-center gap-1"><FaPlus /> إدارة جديدة</button>
          </div>
          <div className="grid gap-3">
            {departments.length === 0 ? <div className="text-gray-500 text-xs">لا توجد إدارات، قم بإضافة واحدة.</div> : null}
            {departments.map(d => (
              <div key={d.id} className="cd flex items-center justify-between p-4">
                <div className="flex items-center gap-2"><FaBuilding className="text-[#8B1A1A]" /> <span className="font-semibold">{d.name}</span></div>
                <button onClick={() => handleDeleteDept(d.id)} className="text-xs text-red-400 hover:underline">حذف</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'branches' && userProfile?.primaryRole === 'chairman' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">مراكز وفروع الشركة</h3>
            <button onClick={handleAddRegion} className="bb flex items-center gap-1"><FaPlus /> منطقة جديدة</button>
          </div>
          <div className="grid gap-4">
            {regions.length === 0 ? <div className="text-gray-500 text-xs">لا توجد مناطق جغرافية، قم بالإضافة.</div> : null}
            {regions.map(r => (
              <div key={r.id} className="cd p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-[#A52A2A]"><FaMapMarkerAlt className="inline mr-1" /> {r.region}</h4>
                  <button onClick={() => handleDeleteRegion(r.id)} className="text-xs text-red-500">حذف المنطقة</button>
                </div>
                <div className="grid gap-2 mb-3 pl-4 border-r border-[#1f1f1f]">
                  {r.branches.map(b => (
                    <div key={b.id} className="p-3 bg-[#111] rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm">{b.name}</div>
                        <div className="text-[10px] text-gray-500 mt-1">القاعات: {b.rooms.join(' - ')}</div>
                      </div>
                      <button onClick={() => handleDeleteBranch(r.id, r.branches, b.id)} className="text-xs text-red-400">حذف الفرع</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleAddBranch(r.id, r.branches)} className="text-xs text-blue-400 flex items-center gap-1"><FaPlus /> إضافة فرع لهذه المنطقة</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};