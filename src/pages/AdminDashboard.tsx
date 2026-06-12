// src/pages/AdminDashboard.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { db, auth } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { 
  FaUsers, 
  FaUserPlus, 
  FaUserCheck, 
  FaUserTimes, 
  FaBuilding, 
  FaMapMarkerAlt, 
  FaShieldAlt,
  FaChartLine,
  FaCalendarAlt,
  FaTasks,
  FaVideo,
  FaComments,
  FaBell,
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes,
  FaKey,
  FaUserTie,
  FaUserCog,
  FaPlus,
  FaDownload,
  FaPrint,
  FaSearch,
  FaFilter,
  FaEye,
  FaBan,
  FaUndo,
  FaExclamationTriangle,
  FaSpinner
} from 'react-icons/fa';

// ==========================================
// الأنواع
// ==========================================

interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  primaryRole: 'chairman' | 'vp' | 'manager' | 'employee';
  additionalTitles: string[];
  isActive: boolean;
  avatarUrl?: string;
  hasCustomAdminAccess?: boolean;
  accessibleDepartments?: string[];
  createdAt: number;
  lastLoginAt?: number;
}

interface Department {
  id: string;
  name: string;
  managerUid: string | null;
  memberCount?: number;
  createdAt: number;
}

interface JoinRequest {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  status: 'pending_manager' | 'pending_chairman' | 'approved' | 'rejected';
  createdAt: number;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  onClick?: () => void;
}

// ==========================================
// بطاقة الإحصائيات
// ==========================================

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, onClick }) => (
  <div 
    className={`card p-4 ${onClick ? 'cursor-pointer hover:translate-y-0' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        {trend !== undefined && (
          <p className={`text-xs mt-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </p>
        )}
      </div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
    </div>
  </div>
);

// ==========================================
// لوحة التحكم الرئيسية
// ==========================================

export const AdminDashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isTopManagement, isManager, canAccessAdminPanel } = usePermissions();
  
  // حالة التبويب النشط
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'requests' | 'departments' | 'activity'>('overview');
  
  // حالات البيانات
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  
  // حالات النوافذ المنبثقة
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserRole, setNewUserRole] = useState<'employee' | 'manager'>('employee');
  
  // حالات تعديل الصلاحيات
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<User | null>(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [customAdminAccess, setCustomAdminAccess] = useState(false);
  const [accessibleDepts, setAccessibleDepts] = useState<string[]>([]);
  const [additionalTitles, setAdditionalTitles] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  
  // إحصائيات
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalDepartments: 0,
    managers: 0,
    employees: 0,
    requestsPending: 0,
    newUsersThisMonth: 0
  });
  
  // ==========================================
  // جلب البيانات
  // ==========================================
  
  // جلب المستخدمين
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(fetchedUsers);
      
      // تحديث الإحصائيات
      const totalUsers = fetchedUsers.length;
      const activeUsers = fetchedUsers.filter(u => u.isActive).length;
      const pendingUsers = fetchedUsers.filter(u => !u.isActive).length;
      const managers = fetchedUsers.filter(u => u.primaryRole === 'manager' || u.primaryRole === 'chairman' || u.primaryRole === 'vp').length;
      const employees = fetchedUsers.filter(u => u.primaryRole === 'employee').length;
      const newUsersThisMonth = fetchedUsers.filter(u => {
        const createdAt = new Date(u.createdAt);
        const now = new Date();
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      }).length;
      
      setStats(prev => ({
        ...prev,
        totalUsers,
        activeUsers,
        pendingUsers,
        managers,
        employees,
        newUsersThisMonth
      }));
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);
  
  // جلب الإدارات
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const fetchedDepts: Department[] = [];
      snapshot.forEach((doc) => {
        fetchedDepts.push({ id: doc.id, ...doc.data() } as Department);
      });
      setDepartments(fetchedDepts);
      setStats(prev => ({ ...prev, totalDepartments: fetchedDepts.length }));
    });
    return unsubscribe;
  }, []);
  
  // جلب طلبات الانضمام
  useEffect(() => {
    const q = query(collection(db, 'joinRequests'), where('status', 'in', ['pending_manager', 'pending_chairman']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests: JoinRequest[] = [];
      snapshot.forEach((doc) => {
        fetchedRequests.push({ id: doc.id, ...doc.data() } as JoinRequest);
      });
      setJoinRequests(fetchedRequests);
      setStats(prev => ({ ...prev, requestsPending: fetchedRequests.length }));
    });
    return unsubscribe;
  }, []);
  
  // ==========================================
  // فلترة المستخدمين
  // ==========================================
  
  const filteredUsers = users.filter(user => {
    // فلترة حسب البحث
    if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase()) && !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // فلترة حسب الإدارة
    if (selectedDepartment !== 'all' && user.department !== selectedDepartment) {
      return false;
    }
    // المدير العادي يرى فقط مستخدمي إدارته
    if (!isTopManagement && isManager) {
      return user.department === userProfile?.department;
    }
    return true;
  });
  
  // ==========================================
  // إدارة المستخدمين
  // ==========================================
  
  const handleActivateUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: true });
      toast.success('تم تفعيل المستخدم بنجاح');
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('حدث خطأ في تفعيل المستخدم');
    }
  };
  
  const handleDeactivateUser = async (userId: string) => {
    if (!window.confirm('هل أنت متأكد من تعطيل هذا المستخدم؟')) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: false });
      toast.success('تم تعطيل المستخدم');
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('حدث خطأ في تعطيل المستخدم');
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('تم حذف المستخدم');
      setShowDeleteConfirm(false);
      setDeletingUserId(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('حدث خطأ في حذف المستخدم');
    }
  };
  
  const handleToggleManagerRole = async (userId: string, currentRole: string, department: string) => {
    const newRole = currentRole === 'manager' ? 'employee' : 'manager';
    const action = newRole === 'manager' ? 'ترقية إلى مدير' : 'إزالة صلاحية المدير';
    
    if (!window.confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), { primaryRole: newRole });
      
      // تحديث مدير الإدارة إذا كان المستخدم مديراً
      if (newRole === 'manager') {
        const dept = departments.find(d => d.name === department);
        if (dept) {
          await updateDoc(doc(db, 'departments', dept.id), { managerUid: userId });
        }
      } else {
        const dept = departments.find(d => d.name === department);
        if (dept && dept.managerUid === userId) {
          await updateDoc(doc(db, 'departments', dept.id), { managerUid: null });
        }
      }
      
      toast.success(`تم ${action} بنجاح`);
    } catch (error) {
      console.error('Error toggling manager role:', error);
      toast.error('حدث خطأ في تغيير الدور');
    }
  };
  
  const handleResetPassword = async (email: string) => {
    if (!window.confirm(`هل أنت متأكد من إرسال رابط إعادة تعيين كلمة المرور إلى ${email}؟`)) return;
    
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('حدث خطأ في إرسال الرابط');
    }
  };
  
  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserDepartment) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    
    if (newUserPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    try {
      // إنشاء مستخدم في Firebase Auth (هذا يتطلب Cloud Function أو سيتم إنشاؤه عند أول تسجيل دخول)
      // هنا سنضيف المستخدم مباشرة إلى Firestore
      const newUser: User = {
        uid: `temp_${Date.now()}`,
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        department: newUserDepartment,
        primaryRole: newUserRole,
        additionalTitles: [],
        isActive: true,
        createdAt: Date.now()
      };
      
      await addDoc(collection(db, 'users'), newUser);
      toast.success('تم إضافة المستخدم بنجاح');
      
      // تنظيف الحقول
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
      setNewUserDepartment('');
      setNewUserRole('employee');
      setShowAddUserModal(false);
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('حدث خطأ في إضافة المستخدم');
    }
  };
  
  // ==========================================
  // إدارة طلبات الانضمام
  // ==========================================
  
  const handleApproveRequest = async (request: JoinRequest) => {
    try {
      // تحديث حالة الطلب
      if (request.status === 'pending_manager') {
        await updateDoc(doc(db, 'joinRequests', request.id), { status: 'pending_chairman' });
        toast.success('تمت الموافقة المبدئية، في انتظار موافقة الرئيس');
      } else if (request.status === 'pending_chairman') {
        await updateDoc(doc(db, 'joinRequests', request.id), { status: 'approved' });
        // تفعيل المستخدم
        await updateDoc(doc(db, 'users', request.uid), { isActive: true });
        toast.success('تمت الموافقة على طلب الانضمام');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('حدث خطأ في الموافقة على الطلب');
    }
  };
  
  const handleRejectRequest = async (requestId: string, userId: string) => {
    if (!window.confirm('هل أنت متأكد من رفض هذا الطلب؟')) return;
    
    try {
      await updateDoc(doc(db, 'joinRequests', requestId), { status: 'rejected' });
      await deleteDoc(doc(db, 'users', userId));
      toast.success('تم رفض الطلب وحذف المستخدم');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('حدث خطأ في رفض الطلب');
    }
  };
  
  // ==========================================
  // إدارة الصلاحيات المتقدمة
  // ==========================================
  
  const openRolesModal = (user: User) => {
    setSelectedUserForRoles(user);
    setCustomAdminAccess(user.hasCustomAdminAccess || false);
    setAccessibleDepts(user.accessibleDepartments || []);
    setAdditionalTitles(user.additionalTitles || []);
    setShowRolesModal(true);
  };
  
  const handleSaveRoles = async () => {
    if (!selectedUserForRoles) return;
    
    try {
      await updateDoc(doc(db, 'users', selectedUserForRoles.uid), {
        hasCustomAdminAccess: customAdminAccess,
        accessibleDepartments: accessibleDepts,
        additionalTitles: additionalTitles
      });
      toast.success('تم تحديث الصلاحيات');
      setShowRolesModal(false);
    } catch (error) {
      console.error('Error saving roles:', error);
      toast.error('حدث خطأ في تحديث الصلاحيات');
    }
  };
  
  const handleAddAccessibleDept = (dept: string) => {
    if (!accessibleDepts.includes(dept)) {
      setAccessibleDepts([...accessibleDepts, dept]);
    }
  };
  
  const handleRemoveAccessibleDept = (dept: string) => {
    setAccessibleDepts(accessibleDepts.filter(d => d !== dept));
  };
  
  const handleAddTitle = () => {
    if (newTitle.trim() && !additionalTitles.includes(newTitle.trim())) {
      setAdditionalTitles([...additionalTitles, newTitle.trim()]);
      setNewTitle('');
    }
  };
  
  const handleRemoveTitle = (title: string) => {
    setAdditionalTitles(additionalTitles.filter(t => t !== title));
  };
  
  // ==========================================
  // إدارة الإدارات
  // ==========================================
  
  const handleAddDepartment = async () => {
    const name = prompt('أدخل اسم الإدارة الجديدة:');
    if (!name) return;
    
    try {
      await addDoc(collection(db, 'departments'), {
        name,
        managerUid: null,
        createdAt: Date.now()
      });
      toast.success('تم إضافة الإدارة');
    } catch (error) {
      console.error('Error adding department:', error);
      toast.error('حدث خطأ في إضافة الإدارة');
    }
  };
  
  const handleDeleteDepartment = async (deptId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الإدارة؟')) return;
    
    try {
      await deleteDoc(doc(db, 'departments', deptId));
      toast.success('تم حذف الإدارة');
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('حدث خطأ في حذف الإدارة');
    }
  };
  
  // ==========================================
  // تصدير البيانات
  // ==========================================
  
  const exportUsersData = () => {
    const data = filteredUsers.map(user => ({
      الاسم: user.name,
      البريد: user.email,
      الجوال: user.phone,
      الإدارة: user.department,
      الدور: user.primaryRole === 'chairman' ? 'رئيس مجلس الإدارة' : user.primaryRole === 'vp' ? 'نائب رئيس' : user.primaryRole === 'manager' ? 'مدير' : 'موظف',
      الحالة: user.isActive ? 'نشط' : 'غير نشط',
      تاريخ_الانضمام: new Date(user.createdAt).toLocaleDateString('ar-SA')
    }));
    
    const csv = convertToCSV(data);
    downloadCSV(csv, `users_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('تم تصدير البيانات');
  };
  
  const convertToCSV = (data: any[]) => {
    const headers = Object.keys(data[0] || {});
    const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || '')).join(','));
    return [headers.join(','), ...rows].join('\n');
  };
  
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // ==========================================
  // واجهة المستخدمين
  // ==========================================
  
  const UsersTab: React.FC = () => (
    <div className="space-y-4">
      {/* شريط البحث والفلترة */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن مستخدم..."
            className="input pr-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="all">جميع الإدارات</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
          <button onClick={exportUsersData} className="icon-btn" title="تصدير">
            <FaDownload size={14} />
          </button>
          <button onClick={() => setShowAddUserModal(true)} className="btn-primary">
            <FaUserPlus className="ml-2" /> إضافة مستخدم
          </button>
        </div>
      </div>
      
      {/* جدول المستخدمين */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
              <th className="text-right p-3">المستخدم</th>
              <th className="text-right p-3">البريد الإلكتروني</th>
              <th className="text-right p-3">الإدارة</th>
              <th className="text-right p-3">الدور</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">آخر دخول</th>
              <th className="text-right p-3">إجراءات</th>
             </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const isProtected = user.email === 'm.othman@uexperts.sa' || user.email === 'mohd@uexperts.sa';
              
              return (
                <tr key={user.uid} className="border-b hover:bg-hv transition-colors" style={{ borderColor: 'var(--bd)' }}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--brand-primary)' }}>
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500">{user.email}</td>
                  <td className="p-3">{user.department}</td>
                  <td className="p-3">
                    <span className={`badge ${user.primaryRole === 'chairman' ? 'badge-primary' : user.primaryRole === 'vp' ? 'badge-secondary' : user.primaryRole === 'manager' ? 'badge-info' : 'badge'}`}>
                      {user.primaryRole === 'chairman' ? 'رئيس مجلس الإدارة' : user.primaryRole === 'vp' ? 'نائب رئيس' : user.primaryRole === 'manager' ? 'مدير' : 'موظف'}
                    </span>
                    {user.additionalTitles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.additionalTitles.slice(0, 2).map((title, idx) => (
                          <span key={idx} className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--hv)' }}>
                            {title}
                          </span>
                        ))}
                        {user.additionalTitles.length > 2 && (
                          <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--hv)' }}>
                            +{user.additionalTitles.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {user.isActive ? (
                      <span className="badge badge-success">نشط</span>
                    ) : (
                      <span className="badge badge-warning">غير نشط</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ar-SA') : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {(isTopManagement || (isManager && user.department === userProfile?.department)) && (
                        <>
                          <button
                            onClick={() => openRolesModal(user)}
                            className="p-1.5 rounded hover:bg-hv transition-colors"
                            title="صلاحيات متقدمة"
                          >
                            <FaUserCog size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleManagerRole(user.uid, user.primaryRole, user.department)}
                            className="p-1.5 rounded hover:bg-hv transition-colors"
                            title={user.primaryRole === 'manager' ? 'إزالة صلاحية المدير' : 'ترقية إلى مدير'}
                          >
                            <FaUserTie size={14} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.email)}
                            className="p-1.5 rounded hover:bg-hv transition-colors"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <FaKey size={14} />
                          </button>
                        </>
                      )}
                      {isTopManagement && (
                        <>
                          {user.isActive ? (
                            <button
                              onClick={() => handleDeactivateUser(user.uid)}
                              className="p-1.5 rounded hover:bg-yellow-500/10 transition-colors text-yellow-500"
                              title="تعطيل"
                            >
                              <FaBan size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.uid)}
                              className="p-1.5 rounded hover:bg-green-500/10 transition-colors text-green-500"
                              title="تفعيل"
                            >
                              <FaCheck size={14} />
                            </button>
                          )}
                          {!isProtected && (
                            <button
                              onClick={() => {
                                setDeletingUserId(user.uid);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-red-500"
                              title="حذف"
                            >
                              <FaTrash size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
  
  // ==========================================
  // واجهة طلبات الانضمام
  // ==========================================
  
  const RequestsTab: React.FC = () => (
    <div className="space-y-3">
      {joinRequests.length === 0 ? (
        <div className="card text-center py-12">
          <FaUserCheck className="text-4xl mx-auto mb-3 text-gray-500" />
          <p className="text-gray-500">لا توجد طلبات انضمام معلقة</p>
        </div>
      ) : (
        joinRequests.map(request => {
          const isPendingManager = request.status === 'pending_manager';
          const canApprove = isTopManagement || (isPendingManager && isManager && request.department === userProfile?.department);
          
          return (
            <div key={request.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: 'var(--brand-primary)' }}>
                    {request.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold">{request.name}</h4>
                    <p className="text-sm text-gray-500">{request.email}</p>
                    <p className="text-xs text-gray-500">{request.phone}</p>
                  </div>
                </div>
                <div className="flex-1">
                  <span className="badge badge-info">طلب انضمام إلى {request.department}</span>
                  <p className="text-xs text-gray-500 mt-1">
                    تاريخ التقديم: {new Date(request.createdAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canApprove && (
                    <button
                      onClick={() => handleApproveRequest(request)}
                      className="btn-success"
                    >
                      <FaCheck className="ml-2" /> موافقة
                    </button>
                  )}
                  {(isTopManagement || (isPendingManager && isManager)) && (
                    <button
                      onClick={() => handleRejectRequest(request.id, request.uid)}
                      className="btn-danger"
                    >
                      <FaTimes className="ml-2" /> رفض
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
  
  // ==========================================
  // واجهة الإدارات
  // ==========================================
  
  const DepartmentsTab: React.FC = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleAddDepartment} className="btn-primary">
          <FaPlus className="ml-2" /> إدارة جديدة
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(dept => {
          const manager = users.find(u => u.uid === dept.managerUid);
          const memberCount = users.filter(u => u.department === dept.name).length;
          
          return (
            <div key={dept.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">{dept.name}</h3>
                {isTopManagement && dept.name !== 'الإدارة العليا' && (
                  <button
                    onClick={() => handleDeleteDepartment(dept.id)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                  >
                    <FaTrash size={14} />
                  </button>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FaUserTie className="text-gray-500" size={14} />
                  <span>مدير الإدارة: {manager?.name || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaUsers className="text-gray-500" size={14} />
                  <span>عدد الموظفين: {memberCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  
  // ==========================================
  // نافذة الصلاحيات المتقدمة
  // ==========================================
  
  const RolesModal: React.FC = () => {
    if (!selectedUserForRoles) return null;
    
    const availableDepts = departments.map(d => d.name).filter(d => !accessibleDepts.includes(d) && d !== selectedUserForRoles.department);
    
    return (
      <div className="modal-overlay" onClick={() => setShowRolesModal(false)}>
        <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold">صلاحيات المستخدم: {selectedUserForRoles.name}</h3>
            <button onClick={() => setShowRolesModal(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body space-y-4">
            {/* صلاحية استثنائية */}
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--hv)' }}>
              <div>
                <p className="font-medium">صلاحية لوحة التحكم</p>
                <p className="text-xs text-gray-500">منح المستخدم صلاحية الوصول إلى لوحة التحكم الإدارية</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={customAdminAccess}
                  onChange={(e) => setCustomAdminAccess(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-brand peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            
            {/* الإدارات المسموح بها */}
            <div>
              <label className="block text-sm font-medium mb-2">إدارات إضافية للمستخدم</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {accessibleDepts.map(dept => (
                  <div key={dept} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'var(--hv)' }}>
                    {dept}
                    <button onClick={() => handleRemoveAccessibleDept(dept)} className="text-red-500">
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value=""
                  onChange={(e) => e.target.value && handleAddAccessibleDept(e.target.value)}
                  className="input text-sm flex-1"
                >
                  <option value="">اختر إدارة...</option>
                  {availableDepts.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* الألقاب الإضافية */}
            <div>
              <label className="block text-sm font-medium mb-2">الألقاب والمناصب الإضافية</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {additionalTitles.map(title => (
                  <div key={title} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'var(--hv)' }}>
                    {title}
                    <button onClick={() => handleRemoveTitle(title)} className="text-red-500">
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                 // src/pages/AdminDashboard.tsx (الجزء الأخير)

                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTitle()}
                  className="input text-sm flex-1"
                  placeholder="أضف لقباً... (مثال: مستشار رئيس مجلس الإدارة)"
                />
                <button onClick={handleAddTitle} className="btn-primary px-3">
                  <FaPlus size={12} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowRolesModal(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={handleSaveRoles} className="btn-primary">
              حفظ التغييرات
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // نافذة إضافة مستخدم
  // ==========================================
  
  const AddUserModal: React.FC = () => (
    <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-bold">إضافة مستخدم جديد</h3>
          <button onClick={() => setShowAddUserModal(false)} className="icon-btn">
            <FaTimes />
          </button>
        </div>
        
        <div className="modal-body space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الكامل *</label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="input"
              placeholder="أدخل الاسم الكامل"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="input"
              placeholder="example@uexperts.sa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الجوال</label>
            <input
              type="tel"
              value={newUserPhone}
              onChange={(e) => setNewUserPhone(e.target.value)}
              className="input"
              placeholder="05xxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">كلمة المرور *</label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="input"
              placeholder="6 أحرف على الأقل"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الإدارة *</label>
            <select
              value={newUserDepartment}
              onChange={(e) => setNewUserDepartment(e.target.value)}
              className="input"
            >
              <option value="">اختر الإدارة</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الدور</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="employee"
                  checked={newUserRole === 'employee'}
                  onChange={() => setNewUserRole('employee')}
                  className="accent-brand"
                />
                <span>موظف</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="manager"
                  checked={newUserRole === 'manager'}
                  onChange={() => setNewUserRole('manager')}
                  className="accent-brand"
                />
                <span>مدير</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={() => setShowAddUserModal(false)} className="btn-outline">
            إلغاء
          </button>
          <button onClick={handleAddUser} className="btn-primary">
            <FaUserPlus className="ml-2" /> إضافة المستخدم
          </button>
        </div>
      </div>
    </div>
  );
  
  // ==========================================
  // نافذة تأكيد الحذف
  // ==========================================
  
  const DeleteConfirmModal: React.FC = () => {
    if (!deletingUserId) return null;
    const userToDelete = users.find(u => u.uid === deletingUserId);
    
    return (
      <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
        <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold text-red-500">تأكيد الحذف</h3>
            <button onClick={() => setShowDeleteConfirm(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-500/10">
              <FaExclamationTriangle className="text-red-500 text-2xl" />
            </div>
            <p className="mb-2">هل أنت متأكد من حذف هذا المستخدم؟</p>
            <p className="text-sm font-medium">{userToDelete?.name}</p>
            <p className="text-xs text-gray-500 mt-4">لا يمكن التراجع عن هذا الإجراء</p>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={() => handleDeleteUser(deletingUserId)} className="btn-danger">
              <FaTrash className="ml-2" /> حذف نهائي
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // واجهة النشاطات
  // ==========================================
  
  const ActivityTab: React.FC = () => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">سجل النشاطات</h3>
        <button className="text-sm text-brand-light hover:text-brand transition-colors">
          عرض الكل
        </button>
      </div>
      <div className="space-y-3">
        {[
          { action: 'تم إضافة مستخدم جديد', user: 'محمد عثمان', time: 'منذ 5 دقائق', icon: <FaUserPlus /> },
          { action: 'تم تحديث صلاحيات مستخدم', user: 'أحمد التميمي', time: 'منذ ساعة', icon: <FaShieldAlt /> },
          { action: 'تم إنشاء إدارة جديدة', user: 'محمد أبو نواف', time: 'منذ 3 ساعات', icon: <FaBuilding /> },
          { action: 'تمت الموافقة على طلب انضمام', user: 'نورة العتيبي', time: 'أمس', icon: <FaUserCheck /> }
        ].map((activity, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-hv transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--hv)' }}>
              {activity.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm">{activity.action}</p>
              <p className="text-xs text-gray-500">بواسطة {activity.user} • {activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  // ==========================================
  // واجهة النظرة العامة (Overview)
  // ==========================================
  
  const OverviewTab: React.FC = () => (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المستخدمين"
          value={stats.totalUsers}
          icon={<FaUsers size={24} />}
          color="#3B82F6"
          trend={12}
          onClick={() => setActiveTab('users')}
        />
        <StatCard
          title="المستخدمين النشطين"
          value={stats.activeUsers}
          icon={<FaUserCheck size={24} />}
          color="#22C55E"
          trend={8}
          onClick={() => setActiveTab('users')}
        />
        <StatCard
          title="طلبات الانتظار"
          value={stats.requestsPending}
          icon={<FaUserTimes size={24} />}
          color="#F59E0B"
          trend={-5}
          onClick={() => setActiveTab('requests')}
        />
        <StatCard
          title="المستخدمين الجدد"
          value={stats.newUsersThisMonth}
          icon={<FaUserPlus size={24} />}
          color="#8B1A1A"
          onClick={() => setActiveTab('users')}
        />
      </div>
      
      {/* إحصائيات إضافية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold mb-4">توزيع المستخدمين حسب الإدارة</h3>
          <div className="space-y-3">
            {departments.map(dept => {
              const count = users.filter(u => u.department === dept.name).length;
              const percentage = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0;
              
              return (
                <div key={dept.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{dept.name}</span>
                    <span>{count} مستخدم ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-primary-light))' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="card">
          <h3 className="font-bold mb-4">توزيع المستخدمين حسب الدور</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>الإدارة العليا (رئيس/نائب)</span>
                <span>{users.filter(u => u.primaryRole === 'chairman' || u.primaryRole === 'vp').length}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>المديرين</span>
                <span>{stats.managers}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>الموظفين</span>
                <span>{stats.employees}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* النشاطات الأخيرة */}
      <ActivityTab />
    </div>
  );
  
  // ==========================================
  // التحقق من الصلاحيات
  // ==========================================
  
  if (!canAccessAdminPanel) {
    return (
      <div className="text-center py-12">
        <FaShieldAlt className="text-6xl mx-auto mb-4 text-gray-500" />
        <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p className="text-gray-500">ليس لديك الصلاحية الكافية للوصول إلى لوحة التحكم</p>
      </div>
    );
  }
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* عنوان الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم الإدارية</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة المستخدمين والصلاحيات والإدارات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportUsersData} className="icon-btn" title="تصدير التقرير">
            <FaDownload size={16} />
          </button>
          <button onClick={() => window.print()} className="icon-btn" title="طباعة">
            <FaPrint size={16} />
          </button>
        </div>
      </div>
      
      {/* تبويبات التنقل */}
      <div className="flex flex-wrap gap-2 border-b" style={{ borderColor: 'var(--bd)' }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'overview' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaChartLine className="inline ml-2" size={14} /> نظرة عامة
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'users' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaUsers className="inline ml-2" size={14} /> المستخدمين
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'requests' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaUserPlus className="inline ml-2" size={14} /> طلبات الانضمام
          {stats.requestsPending > 0 && (
            <span className="mr-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
              {stats.requestsPending}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'departments' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaBuilding className="inline ml-2" size={14} /> الإدارات
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'activity' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaBell className="inline ml-2" size={14} /> النشاطات
        </button>
      </div>
      
      {/* محتوى التبويب النشط */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'activity' && <ActivityTab />}
        </>
      )}
      
      {/* النوافذ المنبثقة */}
      {showAddUserModal && <AddUserModal />}
      {showRolesModal && <RolesModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
    </div>
  );
};

export default AdminDashboard;