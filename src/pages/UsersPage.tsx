// src/pages/UsersPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import toast from 'react-hot-toast';
import { 
  FaUsers, 
  FaUserPlus, 
  FaUserCheck, 
  FaUserTimes, 
  FaBuilding, 
  FaShieldAlt,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPrint,
  FaEdit,
  FaTrash,
  FaKey,
  FaUserTie,
  FaUserCog,
  FaCheck,
  FaBan,
  FaTimes,
  FaExclamationTriangle,
  FaSpinner,
  FaEye,
  FaEyeSlash,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaChartLine
} from 'react-icons/fa';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

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
  createdBy?: string;
}

interface Department {
  id: string;
  name: string;
  managerUid: string | null;
  createdAt: number;
}

// ==========================================
// صفحة إدارة المستخدمين
// ==========================================

export const UsersPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isTopManagement, isManager, canAccessAdminPanel } = usePermissions();
  
  // حالات البيانات
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // حالات النوافذ المنبثقة
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  
  // حالات النموذج
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formRole, setFormRole] = useState<'employee' | 'manager'>('employee');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // إحصائيات
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    managers: 0,
    employees: 0,
    newThisMonth: 0
  });
  
  // ==========================================
  // جلب البيانات
  // ==========================================
  
  useEffect(() => {
    if (!canAccessAdminPanel) return;
    
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as User);
      });
      
      // ترتيب حسب التاريخ
      fetchedUsers.sort((a, b) => b.createdAt - a.createdAt);
      setUsers(fetchedUsers);
      
      // تحديث الإحصائيات
      const total = fetchedUsers.length;
      const active = fetchedUsers.filter(u => u.isActive).length;
      const inactive = fetchedUsers.filter(u => !u.isActive).length;
      const managers = fetchedUsers.filter(u => u.primaryRole === 'manager' || u.primaryRole === 'chairman' || u.primaryRole === 'vp').length;
      const employees = fetchedUsers.filter(u => u.primaryRole === 'employee').length;
      const now = new Date();
      const newThisMonth = fetchedUsers.filter(u => {
        const createdAt = new Date(u.createdAt);
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      }).length;
      
      setStats({ total, active, inactive, managers, employees, newThisMonth });
      setLoading(false);
    });
    
    const unsubscribeDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const fetchedDepts: Department[] = [];
      snapshot.forEach((doc) => {
        fetchedDepts.push({ id: doc.id, ...doc.data() } as Department);
      });
      setDepartments(fetchedDepts);
    });
    
    return () => {
      unsubscribe();
      unsubscribeDepts();
    };
  }, [canAccessAdminPanel]);
  
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
    // فلترة حسب الدور
    if (selectedRole !== 'all' && user.primaryRole !== selectedRole) {
      return false;
    }
    // فلترة حسب الحالة
    if (selectedStatus === 'active' && !user.isActive) return false;
    if (selectedStatus === 'inactive' && user.isActive) return false;
    
    // المدير العادي يرى فقط مستخدمي إدارته
    if (!isTopManagement && isManager) {
      return user.department === userProfile?.department;
    }
    return true;
  });
  
  // ==========================================
  // عمليات المستخدمين
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
  
  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    
    try {
      await deleteDoc(doc(db, 'users', deletingUserId));
      toast.success('تم حذف المستخدم');
      setShowDeleteConfirm(false);
      setDeletingUserId(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('حدث خطأ في حذف المستخدم');
    }
  };
  
  const handleResetPassword = async () => {
    if (!resetPasswordEmail) return;
    
    try {
      await sendPasswordResetEmail(auth, resetPasswordEmail);
      toast.success(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${resetPasswordEmail}`);
      setShowResetPasswordConfirm(false);
      setResetPasswordEmail('');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('حدث خطأ في إرسال رابط إعادة التعيين');
    }
  };
  
  const handleToggleManagerRole = async (userId: string, currentRole: string, department: string) => {
    const newRole = currentRole === 'manager' ? 'employee' : 'manager';
    const action = newRole === 'manager' ? 'ترقية إلى مدير' : 'إزالة صلاحية المدير';
    
    if (!window.confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), { primaryRole: newRole });
      
      // تحديث مدير الإدارة
      const dept = departments.find(d => d.name === department);
      if (dept) {
        if (newRole === 'manager') {
          await updateDoc(doc(db, 'departments', dept.id), { managerUid: userId });
        } else if (dept.managerUid === userId) {
          await updateDoc(doc(db, 'departments', dept.id), { managerUid: null });
        }
      }
      
      toast.success(`تم ${action} بنجاح`);
    } catch (error) {
      console.error('Error toggling manager role:', error);
      toast.error('حدث خطأ في تغيير الدور');
    }
  };
  
  const handleToggleCustomAdminAccess = async (userId: string, currentAccess: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { hasCustomAdminAccess: !currentAccess });
      toast.success(currentAccess ? 'تم إلغاء الصلاحية الاستثنائية' : 'تم منح الصلاحية الاستثنائية');
    } catch (error) {
      console.error('Error toggling custom admin access:', error);
      toast.error('حدث خطأ');
    }
  };
  
  // ==========================================
  // إضافة مستخدم جديد
  // ==========================================
  
  const handleAddUser = async () => {
    if (!formName || !formEmail || !formPassword || !formDepartment) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    if (formPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    if (users.some(u => u.email === formEmail)) {
      toast.error('البريد الإلكتروني مسجل مسبقاً');
      return;
    }
    
    try {
      const newUser: User = {
        uid: `user_${Date.now()}`,
        name: formName,
        email: formEmail,
        phone: formPhone,
        department: formDepartment,
        primaryRole: formRole,
        additionalTitles: [],
        isActive: true,
        createdAt: Date.now(),
        createdBy: currentUser?.uid
      };
      
      await addDoc(collection(db, 'users'), newUser);
      
      toast.success('تم إضافة المستخدم بنجاح');
      
      // تنظيف النموذج
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormPassword('');
      setFormDepartment('');
      setFormRole('employee');
      setShowUserModal(false);
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('حدث خطأ في إضافة المستخدم');
    }
  };
  
  const handleEditUser = async () => {
    if (!editingUser || !formName || !formDepartment) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        name: formName,
        phone: formPhone,
        department: formDepartment,
        primaryRole: formRole
      });
      
      toast.success('تم تحديث المستخدم');
      setShowUserModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error editing user:', error);
      toast.error('حدث خطأ في تحديث المستخدم');
    }
  };
  
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormDepartment(user.department);
    setFormRole(user.primaryRole === 'manager' ? 'manager' : 'employee');
    setFormPassword('');
    setShowUserModal(true);
  };
  
  const openAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormDepartment(departments[0]?.name || '');
    setFormRole('employee');
    setShowUserModal(true);
  };
  
  // ==========================================
  // تصدير البيانات
  // ==========================================
  
  const exportToCSV = () => {
    const data = filteredUsers.map(user => ({
      الاسم: user.name,
      البريد_الإلكتروني: user.email,
      الجوال: user.phone,
      الإدارة: user.department,
      الدور: user.primaryRole === 'chairman' ? 'رئيس مجلس الإدارة' : user.primaryRole === 'vp' ? 'نائب رئيس' : user.primaryRole === 'manager' ? 'مدير' : 'موظف',
      الحالة: user.isActive ? 'نشط' : 'غير نشط',
      تاريخ_الانضمام: format(user.createdAt, 'dd/MM/yyyy', { locale: arSA }),
      آخر_دخول: user.lastLoginAt ? format(user.lastLoginAt, 'dd/MM/yyyy', { locale: arSA }) : '-'
    }));
    
    const headers = Object.keys(data[0] || {});
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => JSON.stringify(row[header as keyof typeof row] || ''));
      csvRows.push(values.join(','));
    }
    
    const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير البيانات');
  };
  
  const printReport = () => {
    window.print();
  };
  
  // ==========================================
  // الحصول على الحروف الأولى
  // ==========================================
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };
  
  // ==========================================
  // التحقق من الصلاحيات
  // ==========================================
  
  if (!canAccessAdminPanel) {
    return (
      <div className="text-center py-12">
        <FaShieldAlt className="text-6xl mx-auto mb-4 text-gray-500" />
        <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p className="text-gray-500">ليس لديك الصلاحية الكافية للوصول إلى هذه الصفحة</p>
      </div>
    );
  }
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة حسابات الموظفين والصلاحيات</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <FaUserPlus className="ml-2" /> إضافة مستخدم جديد
        </button>
      </div>
      
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => { setSelectedStatus('all'); setSelectedRole('all'); }}>
          <p className="text-xs text-gray-500">إجمالي المستخدمين</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setSelectedStatus('active')}>
          <p className="text-xs text-gray-500">نشط</p>
          <p className="text-2xl font-bold text-green-500">{stats.active}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setSelectedStatus('inactive')}>
          <p className="text-xs text-gray-500">غير نشط</p>
          <p className="text-2xl font-bold text-red-500">{stats.inactive}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setSelectedRole('manager')}>
          <p className="text-xs text-gray-500">مديرين</p>
          <p className="text-2xl font-bold text-blue-500">{stats.managers}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setSelectedRole('employee')}>
          <p className="text-xs text-gray-500">موظفين</p>
          <p className="text-2xl font-bold text-purple-500">{stats.employees}</p>
        </div>
      </div>
      
      {/* شريط البحث والفلترة */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            className="input pr-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`icon-btn ${showFilters ? 'bg-brand text-white' : ''}`}>
            <FaFilter size={14} />
          </button>
          <button onClick={exportToCSV} className="icon-btn" title="تصدير">
            <FaDownload size={14} />
          </button>
          <button onClick={printReport} className="icon-btn" title="طباعة">
            <FaPrint size={14} />
          </button>
        </div>
      </div>
      
      {/* فلاتر إضافية */}
      {showFilters && (
        <div className="card p-4 animate-fadeIn">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1">الإدارة</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="input text-sm"
              >
                <option value="all">جميع الإدارات</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1">الدور</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="input text-sm"
              >
                <option value="all">جميع الأدوار</option>
                <option value="chairman">رئيس مجلس الإدارة</option>
                <option value="vp">نائب رئيس</option>
                <option value="manager">مدير</option>
                <option value="employee">موظف</option>
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1">الحالة</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input text-sm"
              >
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDepartment('all');
                  setSelectedRole('all');
                  setSelectedStatus('all');
                }}
                className="text-sm text-brand-light hover:text-brand transition-colors"
              >
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* جدول المستخدمين */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
                <th className="text-right p-3">المستخدم</th>
                <th className="text-right p-3">البريد الإلكتروني</th>
                <th className="text-right p-3">الجوال</th>
                <th className="text-right p-3">الإدارة</th>
                <th className="text-right p-3">الدور</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">تاريخ الانضمام</th>
                <th className="text-right p-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const isProtected = user.email === 'm.othman@uexperts.sa' || user.email === 'mohd@uexperts.sa' || user.email === 'ali@uexperts.sa';
                const canEdit = isTopManagement || (isManager && user.department === userProfile?.department);
                
                return (
                  <tr key={user.uid} className="border-b hover:bg-hv transition-colors" style={{ borderColor: 'var(--bd)' }}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--brand-primary)' }}>
                          {getInitials(user.name)}
                        </div>
                        <span className="font-medium">{user.name}</span>
                        {user.additionalTitles.length > 0 && (
                          <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--hv)' }}>
                            {user.additionalTitles[0]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-gray-500">{user.email}</td>
                    <td className="p-3">{user.phone || '-'}</td>
                    <td className="p-3">{user.department}</td>
                    <td className="p-3">
                      <span className={`badge ${
                        user.primaryRole === 'chairman' ? 'badge-primary' : 
                        user.primaryRole === 'vp' ? 'badge-secondary' : 
                        user.primaryRole === 'manager' ? 'badge-info' : 'badge'
                      }`}>
                        {user.primaryRole === 'chairman' ? 'رئيس مجلس الإدارة' : 
                         user.primaryRole === 'vp' ? 'نائب رئيس' : 
                         user.primaryRole === 'manager' ? 'مدير' : 'موظف'}
                      </span>
                      {user.hasCustomAdminAccess && (
                        <span className="mr-1 text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(139,26,26,0.2)', color: 'var(--brand-primary)' }}>
                          صلاحية استثنائية
                        </span>
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
                      {format(user.createdAt, 'dd/MM/yyyy', { locale: arSA })}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 rounded hover:bg-hv transition-colors"
                              title="تعديل"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleManagerRole(user.uid, user.primaryRole, user.department)}
                              className="p-1.5 rounded hover:bg-hv transition-colors"
                              title={user.primaryRole === 'manager' ? 'إزالة صلاحية المدير' : 'ترقية إلى مدير'}
                            >
                              <FaUserTie size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleCustomAdminAccess(user.uid, user.hasCustomAdminAccess || false)}
                              className="p-1.5 rounded hover:bg-hv transition-colors"
                              title={user.hasCustomAdminAccess ? 'إلغاء الصلاحية الاستثنائية' : 'منح صلاحية استثنائية'}
                            >
                              <FaUserCog size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setResetPasswordEmail(user.email);
                                setShowResetPasswordConfirm(true);
                              }}
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
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <FaUsers className="text-5xl mx-auto mb-4 text-gray-500" />
              <p className="text-gray-500">لا توجد نتائج مطابقة</p>
            </div>
          )}
        </div>
      )}
      
      {/* نافذة إضافة/تعديل مستخدم */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-bold">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
              <button onClick={() => setShowUserModal(false)} className="icon-btn">
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input"
                  placeholder="أدخل الاسم الكامل"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="input"
                  placeholder="example@uexperts.sa"
                  disabled={!!editingUser}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">رقم الجوال</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="input"
                  placeholder="05xxxxxxxx"
                />
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">كلمة المرور *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="input"
                      placeholder="6 أحرف على الأقل"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">الإدارة *</label>
                <select
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="input"
                >
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
                      checked={formRole === 'employee'}
                      onChange={() => setFormRole('employee')}
                      className="accent-brand"
                    />
                    <span>موظف</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="manager"
                      checked={formRole === 'manager'}
                      onChange={() => setFormRole('manager')}
                      className="accent-brand"
                    />
                    <span>مدير</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowUserModal(false)} className="btn-outline">
                إلغاء
              </button>
              <button onClick={editingUser ? handleEditUser : handleAddUser} className="btn-primary">
                {editingUser ? 'حفظ التغييرات' : 'إضافة المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* نافذة تأكيد الحذف */}
      {showDeleteConfirm && (
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
              <p className="text-sm text-gray-500 mt-4">لا يمكن التراجع عن هذا الإجراء</p>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline">
                إلغاء
              </button>
              <button onClick={handleDeleteUser} className="btn-danger">
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* نافذة تأكيد إعادة تعيين كلمة المرور */}
      {showResetPasswordConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetPasswordConfirm(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-bold">إعادة تعيين كلمة المرور</h3>
              <button onClick={() => setShowResetPasswordConfirm(false)} className="icon-btn">
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-brand/10">
                <FaKey className="text-brand text-2xl" />
              </div>
              <p className="mb-2">هل أنت متأكد من إعادة تعيين كلمة المرور؟</p>
              <p className="text-sm text-gray-500">سيتم إرسال رابط إعادة التعيين إلى</p>
              <p className="text-sm font-medium mt-1">{resetPasswordEmail}</p>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowResetPasswordConfirm(false)} className="btn-outline">
                إلغاء
              </button>
              <button onClick={handleResetPassword} className="btn-primary">
                تأكيد الإرسال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;