import React, { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  addDoc,
  query,
  where,
  getDocs
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
  FaChartLine,
  FaPlus
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
// صفحة إدارة المستخدمين الرئيسية
// ==========================================

export const UsersPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isTopManagement, isManager, canAccessAdminPanel } = usePermissions();
  
  // ==========================================
  // حالات البيانات
  // ==========================================
  
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // ==========================================
  // حالات النوافذ المنبثقة
  // ==========================================
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<User | null>(null);
  const [customAdminAccess, setCustomAdminAccess] = useState(false);
  const [accessibleDepts, setAccessibleDepts] = useState<string[]>([]);
  const [additionalTitles, setAdditionalTitles] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  
  // ==========================================
  // حالات النموذج
  // ==========================================
  
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formRole, setFormRole] = useState<'employee' | 'manager'>('employee');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // ==========================================
  // إحصائيات
  // ==========================================
  
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
    
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as User);
      });
      
      fetchedUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(fetchedUsers);
      
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
        fetchedDepts.push({ id: doc.id, name: doc.data().name, managerUid: doc.data().managerUid, createdAt: doc.data().createdAt });
      });
      setDepartments(fetchedDepts);
    });
    
    return () => {
      unsubscribeUsers();
      unsubscribeDepts();
    };
  }, [canAccessAdminPanel]);
  
  // ==========================================
  // فلترة المستخدمين
  // ==========================================
  
  const filteredUsers = users.filter(user => {
    if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase()) && !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedDepartment !== 'all' && user.department !== selectedDepartment) {
      return false;
    }
    if (selectedRole !== 'all' && user.primaryRole !== selectedRole) {
      return false;
    }
    if (selectedStatus === 'active' && !user.isActive) return false;
    if (selectedStatus === 'inactive' && user.isActive) return false;
    
    if (!isTopManagement && isManager) {
      return user.department === userProfile?.department;
    }
    return true;
  });
  
  // ==========================================
  // الحصول على الحروف الأولى للاسم
  // ==========================================
  
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };
  
  // ==========================================
  // تفعيل مستخدم
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
  
  // ==========================================
  // تعطيل مستخدم
  // ==========================================
  
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
  
  // ==========================================
  // حذف مستخدم
  // ==========================================
  
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
  
  // ==========================================
  // إعادة تعيين كلمة المرور
  // ==========================================
  
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
  
  // ==========================================
  // تبديل دور المدير
  // ==========================================
  
  const handleToggleManagerRole = async (userId: string, currentRole: string, department: string) => {
    const newRole = currentRole === 'manager' ? 'employee' : 'manager';
    const action = newRole === 'manager' ? 'ترقية إلى مدير' : 'إزالة صلاحية المدير';
    
    if (!window.confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), { primaryRole: newRole });
      
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
  
  // ==========================================
  // تبديل الصلاحية الاستثنائية
  // ==========================================
  
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
  // فتح نافذة تعديل صلاحيات المستخدم
  // ==========================================
  
  const openRolesModal = (user: User) => {
    setSelectedUserForRoles(user);
    setCustomAdminAccess(user.hasCustomAdminAccess || false);
    setAccessibleDepts(user.accessibleDepartments || []);
    setAdditionalTitles(user.additionalTitles || []);
    setShowRolesModal(true);
  };
  
  // ==========================================
  // حفظ الصلاحيات المتقدمة
  // ==========================================
  
  const handleSaveRoles = async () => {
    if (!selectedUserForRoles) return;
    
    try {
      await updateDoc(doc(db, 'users', selectedUserForRoles.uid), {
        hasCustomAdminAccess: customAdminAccess,
        accessibleDepartments: accessibleDepts,
        additionalTitles: additionalTitles,
        updatedAt: Date.now()
      });
      toast.success('تم تحديث الصلاحيات بنجاح');
      setShowRolesModal(false);
    } catch (error) {
      console.error('Error saving roles:', error);
      toast.error('حدث خطأ في تحديث الصلاحيات');
    }
  };
  
  // ==========================================
  // إضافة إدارة يمكن للمستخدم الوصول إليها
  // ==========================================
  
  const handleAddAccessibleDept = (dept: string) => {
    if (!accessibleDepts.includes(dept)) {
      setAccessibleDepts([...accessibleDepts, dept]);
    }
  };
  
  // ==========================================
  // إزالة إدارة من قائمة الإدارات المسموحة
  // ==========================================
  
  const handleRemoveAccessibleDept = (dept: string) => {
    setAccessibleDepts(accessibleDepts.filter(d => d !== dept));
  };
  
  // ==========================================
  // إضافة لقب إضافي للمستخدم
  // ==========================================
  
  const handleAddTitle = () => {
    if (newTitle.trim() && !additionalTitles.includes(newTitle.trim())) {
      setAdditionalTitles([...additionalTitles, newTitle.trim()]);
      setNewTitle('');
    }
  };
  
  // ==========================================
  // إزالة لقب إضافي من المستخدم
  // ==========================================
  
  const handleRemoveTitle = (title: string) => {
    setAdditionalTitles(additionalTitles.filter(t => t !== title));
  };
  
  // ==========================================
  // فتح نافذة تعديل مستخدم
  // ==========================================
  
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
  
  // ==========================================
  // فتح نافذة إضافة مستخدم
  // ==========================================
  
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
  
  // ==========================================
  // تحديث مستخدم
  // ==========================================
  
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
  
  // ==========================================
  // تصدير البيانات إلى CSV
  // ==========================================
  
  const exportToCSV = () => {
    const data = filteredUsers.map(user => ({
      الاسم: user.name,
      البريد_الإلكتروني: user.email,
      الجوال: user.phone,
      الإدارة: user.department,
      الدور: user.primaryRole === 'chairman' ? 'رئيس مجلس الإدارة' : user.primaryRole === 'vp' ? 'نائب رئيس' : user.primaryRole === 'manager' ? 'مدير' : 'موظف',
      الألقاب_الإضافية: user.additionalTitles.join(', '),
      الصلاحية_الاستثنائية: user.hasCustomAdminAccess ? 'نعم' : 'لا',
      الحالة: user.isActive ? 'نشط' : 'غير نشط',
      تاريخ_الانضمام: format(user.createdAt, 'dd/MM/yyyy', { locale: arSA }),
      آخر_دخول: user.lastLoginAt ? format(user.lastLoginAt, 'dd/MM/yyyy', { locale: arSA }) : '-'
    }));
    
    const headers = Object.keys(data[0] || {});
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header as keyof typeof row];
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير البيانات');
  };
  
  // ==========================================
  // طباعة التقرير
  // ==========================================
  
  const printReport = () => {
    window.print();
  };
  
  // ==========================================
  // نافذة تعديل الصلاحيات المتقدمة
  // ==========================================
  
  const RolesModal: React.FC = () => {
    if (!selectedUserForRoles) return null;
    
    const availableDepts = departments.map(d => d.name).filter(d => !accessibleDepts.includes(d) && d !== selectedUserForRoles.department);
    
    return (
      <div className="modal-overlay" onClick={() => setShowRolesModal(false)}>
        <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold">الصلاحيات المتقدمة: {selectedUserForRoles.name}</h3>
            <button onClick={() => setShowRolesModal(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body space-y-4">
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
            
            <div>
              <label className="block text-sm font-medium mb-2">إدارات إضافية للمستخدم</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {accessibleDepts.map(dept => (
                  <div key={dept} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'var(--hv)' }}>
                    {dept}
                    <button onClick={() => handleRemoveAccessibleDept(dept)} className="text-red-500 hover:text-red-600">
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
              <p className="text-xs text-gray-500 mt-1">يمكن للمستخدم الوصول إلى بيانات هذه الإدارات</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">الألقاب والمناصب الإضافية</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {additionalTitles.map(title => (
                  <div key={title} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'var(--hv)' }}>
                    {title}
                    <button onClick={() => handleRemoveTitle(title)} className="text-red-500 hover:text-red-600">
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
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
              <p className="text-xs text-gray-500 mt-1">تظهر الألقاب بجانب اسم المستخدم في النظام</p>
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
  // نافذة إضافة/تعديل مستخدم
  // ==========================================
  
  const UserModal: React.FC = () => {
    return (
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
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-brand"
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
              <label className="block text-sm font-medium mb-1">الدور الأساسي</label>
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
    );
  };
  
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
            <p className="text-xs text-gray-500 mt-4">جميع بيانات المستخدم ستختفي نهائياً</p>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={handleDeleteUser} className="btn-danger">
              <FaTrash className="ml-2" /> حذف نهائي
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // نافذة تأكيد إعادة تعيين كلمة المرور
  // ==========================================
  
  const ResetPasswordConfirmModal: React.FC = () => {
    return (
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
    );
  };
  
  // ==========================================
  // التحقق من الصلاحيات للوصول إلى الصفحة
  // ==========================================
  
  if (!canAccessAdminPanel) {
    return (
      <div className="text-center py-12">
        <FaShieldAlt className="text-6xl mx-auto mb-4 text-gray-500" />
        <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p className="text-gray-500">هذه الصفحة متاحة للإدارة العليا والمديرين فقط</p>
      </div>
    );
  }
  
  // ==========================================
  // الواجهة الرئيسية للصفحة
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة حسابات الموظفين والصلاحيات المتقدمة</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <FaUserPlus className="ml-2" /> إضافة مستخدم جديد
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div 
          className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" 
          onClick={() => { setSelectedStatus('all'); setSelectedRole('all'); }}
        >
          <p className="text-xs text-gray-500">إجمالي المستخدمين</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div 
          className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" 
          onClick={() => setSelectedStatus('active')}
        >
          <p className="text-xs text-gray-500">نشط</p>
          <p className="text-2xl font-bold text-green-500">{stats.active}</p>
        </div>
        <div 
          className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" 
          onClick={() => setSelectedStatus('inactive')}
        >
          <p className="text-xs text-gray-500">غير نشط</p>
          <p className="text-2xl font-bold text-red-500">{stats.inactive}</p>
        </div>
        <div 
          className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" 
          onClick={() => setSelectedRole('manager')}
        >
          <p className="text-xs text-gray-500">مديرين</p>
          <p className="text-2xl font-bold text-blue-500">{stats.managers}</p>
        </div>
        <div 
          className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" 
          onClick={() => setSelectedRole('employee')}
        >
          <p className="text-xs text-gray-500">موظفين</p>
          <p className="text-2xl font-bold text-purple-500">{stats.employees}</p>
        </div>
      </div>
      
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
              <label className="block text-xs text-gray-500 mb-1">الدور الأساسي</label>
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
                <th className="text-right p-3">الدور الأساسي</th>
                <th className="text-right p-3">الألقاب</th>
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
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
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
                    </td>
                    <td className="p-3">
                      {user.isActive ? (
                        <span className="badge badge-success">نشط</span>
                      ) : (
                        <span className="badge badge-warning">غير نشط</span>
                      )}
                      {user.hasCustomAdminAccess && (
                        <span className="block mt-1 text-[9px] px-1 py-0.5 rounded text-center" style={{ background: 'rgba(139,26,26,0.2)', color: 'var(--brand-primary)' }}>
                          صلاحية استثنائية
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {format(user.createdAt, 'dd/MM/yyyy', { locale: arSA })}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 rounded hover:bg-hv transition-colors"
                              title="تعديل البيانات الأساسية"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              onClick={() => openRolesModal(user)}
                              className="p-1.5 rounded hover:bg-hv transition-colors"
                              title="الصلاحيات المتقدمة (الألقاب - الإدارات الإضافية)"
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
                                title="حذف نهائي"
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
      
      {showUserModal && <UserModal />}
      {showRolesModal && <RolesModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
      {showResetPasswordConfirm && <ResetPasswordConfirmModal />}
      
    </div>
  );
};

export default UsersPage;