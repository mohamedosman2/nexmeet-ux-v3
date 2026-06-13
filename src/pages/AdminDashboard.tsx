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
  FaSpinner,
  FaCheckDouble,
  FaClock,
  FaStar,
  FaArrowUp as FaTrendUp,
  FaArrowDown as FaTrendDown,
  FaEyeSlash,
  FaCheckCircle
} from 'react-icons/fa';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ==========================================
// تعريف الأنواع (TypeScript Interfaces)
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

interface Notification {
  id: string;
  targetUid: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: number;
}

interface Activity {
  id: string;
  action: string;
  user: string;
  userUid: string;
  details: string;
  timestamp: number;
}

// ==========================================
// مكون بطاقة الإحصائيات (Stat Card)
// ==========================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, onClick }) => {
  return (
    <div 
      className={`card p-4 ${onClick ? 'cursor-pointer hover:translate-y-0 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{value.toLocaleString()}</p>
          {trend !== undefined && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <FaTrendUp size={10} /> : <FaTrendDown size={10} />}
              {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${color}20`, color: color }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// مكون لوحة التحكم الرئيسية (AdminDashboard)
// ==========================================

export const AdminDashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isTopManagement, isManager, canAccessAdminPanel } = usePermissions();
  
  // ==========================================
  // حالة التبويب النشط (Active Tab)
  // ==========================================
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'requests' | 'departments' | 'activity' | 'notifications'>('overview');
  
  // ==========================================
  // حالات البيانات (Data States)
  // ==========================================
  
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  
  // ==========================================
  // حالات النوافذ المنبثقة (Modal States)
  // ==========================================
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<User | null>(null);
  const [customAdminAccess, setCustomAdminAccess] = useState(false);
  const [accessibleDepts, setAccessibleDepts] = useState<string[]>([]);
  const [additionalTitles, setAdditionalTitles] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  
  // ==========================================
  // حالات نموذج إضافة مستخدم (Add User Form)
  // ==========================================
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserRole, setNewUserRole] = useState<'employee' | 'manager'>('employee');
  const [showPassword, setShowPassword] = useState(false);
  
  // ==========================================
  // إحصائيات عامة (General Statistics)
  // ==========================================
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalDepartments: 0,
    managers: 0,
    employees: 0,
    requestsPending: 0,
    newUsersThisMonth: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalMeetings: 0,
    upcomingMeetings: 0,
    unreadNotifications: 0
  });
  
  // ==========================================
  // جلب المستخدمين من Firebase (Fetch Users)
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
      
      const totalUsers = fetchedUsers.length;
      const activeUsers = fetchedUsers.filter(u => u.isActive).length;
      const pendingUsers = fetchedUsers.filter(u => !u.isActive).length;
      const managers = fetchedUsers.filter(u => u.primaryRole === 'manager' || u.primaryRole === 'chairman' || u.primaryRole === 'vp').length;
      const employees = fetchedUsers.filter(u => u.primaryRole === 'employee').length;
      const now = new Date();
      const newUsersThisMonth = fetchedUsers.filter(u => {
        const createdAt = new Date(u.createdAt);
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
    
    return () => unsubscribeUsers();
  }, [canAccessAdminPanel]);
  
  // ==========================================
  // جلب الإدارات من Firebase (Fetch Departments)
  // ==========================================
  
  useEffect(() => {
    if (!canAccessAdminPanel) return;
    
    const unsubscribeDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const fetchedDepts: Department[] = [];
      snapshot.forEach((doc) => {
        fetchedDepts.push({ id: doc.id, ...doc.data() } as Department);
      });
      setDepartments(fetchedDepts);
      setStats(prev => ({ ...prev, totalDepartments: fetchedDepts.length }));
    });
    
    return () => unsubscribeDepts();
  }, [canAccessAdminPanel]);
  
  // ==========================================
  // جلب طلبات الانضمام من Firebase (Fetch Join Requests)
  // ==========================================
  
  useEffect(() => {
    if (!canAccessAdminPanel) return;
    
    const q = query(
      collection(db, 'joinRequests'),
      where('status', 'in', ['pending_manager', 'pending_chairman'])
    );
    
    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      const fetchedRequests: JoinRequest[] = [];
      snapshot.forEach((doc) => {
        fetchedRequests.push({ id: doc.id, ...doc.data() } as JoinRequest);
      });
      setJoinRequests(fetchedRequests);
      setStats(prev => ({ ...prev, requestsPending: fetchedRequests.length }));
    });
    
    return () => unsubscribeRequests();
  }, [canAccessAdminPanel]);
  
  // ==========================================
  // جلب الإشعارات من Firebase (Fetch Notifications)
  // ==========================================
  
  useEffect(() => {
    if (!canAccessAdminPanel) return;
    
    const unsubscribeNotifications = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
      (snapshot) => {
        const fetchedNotifications: Notification[] = [];
        snapshot.forEach((doc) => {
          fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification);
        });
        setNotifications(fetchedNotifications);
        const unreadCount = fetchedNotifications.filter(n => !n.isRead).length;
        setStats(prev => ({ ...prev, unreadNotifications: unreadCount }));
      }
    );
    
    return () => unsubscribeNotifications();
  }, [canAccessAdminPanel]);
  
  // ==========================================
  // جلب المهام والاجتماعات للإحصائيات (Fetch Tasks & Meetings for Stats)
  // ==========================================
  
  useEffect(() => {
    if (!canAccessAdminPanel) return;
    
    const fetchTasksAndMeetings = async () => {
      try {
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        const allTasks = tasksSnapshot.docs.map(doc => doc.data());
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter((t: any) => t.status === 'done').length;
        
        const meetingsSnapshot = await getDocs(collection(db, 'meetings'));
        const allMeetings = meetingsSnapshot.docs.map(doc => doc.data());
        const totalMeetings = allMeetings.length;
        const today = new Date().toISOString().split('T')[0];
        const upcomingMeetings = allMeetings.filter((m: any) => m.date >= today).length;
        
        setStats(prev => ({
          ...prev,
          totalTasks,
          completedTasks,
          totalMeetings,
          upcomingMeetings
        }));
      } catch (error) {
        console.error('Error fetching tasks and meetings:', error);
      }
    };
    
    fetchTasksAndMeetings();
  }, [canAccessAdminPanel]);
  
  // ==========================================
  // فلترة المستخدمين (Filter Users)
  // ==========================================
  
  const filteredUsers = users.filter(user => {
    if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase()) && !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedDepartment !== 'all' && user.department !== selectedDepartment) {
      return false;
    }
    if (!isTopManagement && isManager) {
      return user.department === userProfile?.department;
    }
    return true;
  });
  
  // ==========================================
  // الحصول على الحروف الأولى للاسم (Get Initials)
  // ==========================================
  
  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };
  
  // ==========================================
  // الحصول على اسم المستخدم من UID (Get User Name)
  // ==========================================
  
  const getUserName = (uid: string): string => {
    const user = users.find(u => u.uid === uid);
    return user?.name || 'مستخدم غير معروف';
  };
  
  // ==========================================
  // الحصول على إدارة المستخدم (Get User Department)
  // ==========================================
  
  const getUserDepartment = (uid: string): string => {
    const user = users.find(u => u.uid === uid);
    return user?.department || '-';
  };
  
  // ==========================================
  // تفعيل مستخدم (Activate User)
  // ==========================================
  
  const handleActivateUser = async (userId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: true });
      toast.success('تم تفعيل المستخدم بنجاح');
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('حدث خطأ في تفعيل المستخدم');
    }
  };
  
  // ==========================================
  // تعطيل مستخدم (Deactivate User)
  // ==========================================
  
  const handleDeactivateUser = async (userId: string): Promise<void> => {
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
  // حذف مستخدم (Delete User)
  // ==========================================
  
  const handleDeleteUser = async (): Promise<void> => {
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
  // إعادة تعيين كلمة المرور (Reset Password)
  // ==========================================
  
  const handleResetPassword = async (email: string): Promise<void> => {
    if (!window.confirm(`هل أنت متأكد من إرسال رابط إعادة تعيين كلمة المرور إلى ${email}؟`)) return;
    
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('حدث خطأ في إرسال الرابط');
    }
  };
  
  // ==========================================
  // تبديل دور المدير (Toggle Manager Role)
  // ==========================================
  
  const handleToggleManagerRole = async (userId: string, currentRole: string, department: string): Promise<void> => {
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
  // تبديل الصلاحية الاستثنائية (Toggle Custom Admin Access)
  // ==========================================
  
  const handleToggleCustomAdminAccess = async (userId: string, currentAccess: boolean): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', userId), { hasCustomAdminAccess: !currentAccess });
      toast.success(currentAccess ? 'تم إلغاء الصلاحية الاستثنائية' : 'تم منح الصلاحية الاستثنائية');
    } catch (error) {
      console.error('Error toggling custom admin access:', error);
      toast.error('حدث خطأ');
    }
  };
  
  // ==========================================
  // فتح نافذة الصلاحيات المتقدمة (Open Roles Modal)
  // ==========================================
  
  const openRolesModal = (user: User): void => {
    setSelectedUserForRoles(user);
    setCustomAdminAccess(user.hasCustomAdminAccess || false);
    setAccessibleDepts(user.accessibleDepartments || []);
    setAdditionalTitles(user.additionalTitles || []);
    setShowRolesModal(true);
  };
  
  // ==========================================
  // حفظ الصلاحيات المتقدمة (Save Advanced Roles)
  // ==========================================
  
  const handleSaveRoles = async (): Promise<void> => {
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
      setSelectedUserForRoles(null);
    } catch (error) {
      console.error('Error saving roles:', error);
      toast.error('حدث خطأ في تحديث الصلاحيات');
    }
  };
  
  // ==========================================
  // إضافة إدارة يمكن للمستخدم الوصول إليها (Add Accessible Department)
  // ==========================================
  
  const handleAddAccessibleDept = (dept: string): void => {
    if (!accessibleDepts.includes(dept)) {
      setAccessibleDepts([...accessibleDepts, dept]);
    }
  };
  
  // ==========================================
  // إزالة إدارة من قائمة الإدارات المسموحة (Remove Accessible Department)
  // ==========================================
  
  const handleRemoveAccessibleDept = (dept: string): void => {
    setAccessibleDepts(accessibleDepts.filter(d => d !== dept));
  };
  
  // ==========================================
  // إضافة لقب إضافي للمستخدم (Add Additional Title)
  // ==========================================
  
  const handleAddTitle = (): void => {
    if (newTitle.trim() && !additionalTitles.includes(newTitle.trim())) {
      setAdditionalTitles([...additionalTitles, newTitle.trim()]);
      setNewTitle('');
    }
  };
  
  // ==========================================
  // إزالة لقب إضافي من المستخدم (Remove Additional Title)
  // ==========================================
  
  const handleRemoveTitle = (title: string): void => {
    setAdditionalTitles(additionalTitles.filter(t => t !== title));
  };
  
  // ==========================================
  // إضافة مستخدم جديد (Add New User)
  // ==========================================
  
  const handleAddUser = async (): Promise<void> => {
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserDepartment) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    if (newUserPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    if (users.some(u => u.email === newUserEmail)) {
      toast.error('البريد الإلكتروني مسجل مسبقاً');
      return;
    }
    
    try {
      const newUser: User = {
        uid: `user_${Date.now()}`,
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        department: newUserDepartment,
        primaryRole: newUserRole,
        additionalTitles: [],
        isActive: true,
        createdAt: Date.now(),
        lastLoginAt: undefined
      };
      
      await addDoc(collection(db, 'users'), newUser);
      
      toast.success('تم إضافة المستخدم بنجاح');
      
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
  // الموافقة على طلب انضمام (Approve Join Request)
  // ==========================================
  
  const handleApproveRequest = async (request: JoinRequest): Promise<void> => {
    try {
      if (request.status === 'pending_manager') {
        await updateDoc(doc(db, 'joinRequests', request.id), { status: 'pending_chairman' });
        toast.success('تمت الموافقة المبدئية، في انتظار موافقة الرئيس');
      } else if (request.status === 'pending_chairman') {
        await updateDoc(doc(db, 'joinRequests', request.id), { status: 'approved' });
        await updateDoc(doc(db, 'users', request.uid), { isActive: true });
        toast.success('تمت الموافقة على طلب الانضمام');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('حدث خطأ في الموافقة على الطلب');
    }
  };
  
  // ==========================================
  // رفض طلب انضمام (Reject Join Request)
  // ==========================================
  
  const handleRejectRequest = async (requestId: string, userId: string): Promise<void> => {
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
  // إضافة إدارة جديدة (Add New Department)
  // ==========================================
  
  const handleAddDepartment = async (): Promise<void> => {
    const name = prompt('أدخل اسم الإدارة الجديدة:');
    if (!name) return;
    
    try {
      await addDoc(collection(db, 'departments'), {
        name,
        managerUid: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      toast.success('تم إضافة الإدارة');
    } catch (error) {
      console.error('Error adding department:', error);
      toast.error('حدث خطأ في إضافة الإدارة');
    }
  };
  
  // ==========================================
  // حذف إدارة (Delete Department)
  // ==========================================
  
  const handleDeleteDepartment = async (deptId: string, deptName: string): Promise<void> => {
    if (deptName === 'الإدارة العليا') {
      toast.error('لا يمكن حذف الإدارة العليا');
      return;
    }
    
    const employeesInDept = users.filter(u => u.department === deptName && u.isActive);
    if (employeesInDept.length > 0) {
      toast.error(`لا يمكن حذف الإدارة لأن بها ${employeesInDept.length} موظف. قم بنقلهم أولاً.`);
      return;
    }
    
    if (!window.confirm(`هل أنت متأكد من حذف إدارة ${deptName}؟`)) return;
    
    try {
      await deleteDoc(doc(db, 'departments', deptId));
      toast.success('تم حذف الإدارة');
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('حدث خطأ في حذف الإدارة');
    }
  };
  
  // ==========================================
  // تصدير بيانات المستخدمين (Export Users Data)
  // ==========================================
  
  const exportUsersData = (): void => {
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
    link.setAttribute('download', `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير بيانات المستخدمين');
  };
  
  // ==========================================
  // طباعة التقرير (Print Report)
  // ==========================================
  
  const printReport = (): void => {
    window.print();
  };
  
  // ==========================================
  // تحديد كل الإشعارات كمقروءة (Mark All Notifications as Read)
  // ==========================================
  
  const markAllNotificationsAsRead = async (): Promise<void> => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) {
      toast('لا توجد إشعارات غير مقروءة');
      return;
    }
    
    try {
      const batch = writeBatch(db);
      unreadNotifications.forEach(notification => {
        const ref = doc(db, 'notifications', notification.id);
        batch.update(ref, { isRead: true });
      });
      await batch.commit();
      toast.success(`تم تحديد ${unreadNotifications.length} إشعار كمقروء`);
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('حدث خطأ');
    }
  };
  
  // ==========================================
  // حذف إشعار (Delete Notification)
  // ==========================================
  
  const deleteNotification = async (notificationId: string): Promise<void> => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;
    
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      toast.success('تم حذف الإشعار');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('حدث خطأ في حذف الإشعار');
    }
  };
  
  // ==========================================
  // تنسيق التاريخ (Format Date)
  // ==========================================
  
  const formatDate = (timestamp: number): string => {
    return format(timestamp, 'dd MMM yyyy, hh:mm a', { locale: arSA });
  };
  
  // ==========================================
  // حساب الوقت المنقضي (Time Ago)
  // ==========================================
  
  const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} يوم`;
    return formatDate(timestamp);
  };
  
  // ==========================================
  // نافذة الصلاحيات المتقدمة (Roles Modal Component)
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
  // نافذة إضافة مستخدم جديد (Add User Modal)
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
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
            <label className="block text-sm font-medium mb-1">الدور الأساسي</label>
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
  // نافذة تأكيد الحذف (Delete Confirmation Modal)
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
  // تبويب نظرة عامة (Overview Tab)
  // ==========================================
  
  const OverviewTab: React.FC = () => (
    <div className="space-y-6">
      
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المهام"
          value={stats.totalTasks}
          icon={<FaTasks size={24} />}
          color="#3B82F6"
          onClick={() => setActiveTab('overview')}
        />
        <StatCard
          title="المهام المكتملة"
          value={stats.completedTasks}
          icon={<FaCheckCircle size={24} />}
          color="#22C55E"
          onClick={() => setActiveTab('overview')}
        />
        <StatCard
          title="إجمالي الاجتماعات"
          value={stats.totalMeetings}
          icon={<FaVideo size={24} />}
          color="#8B1A1A"
          onClick={() => setActiveTab('overview')}
        />
        <StatCard
          title="الاجتماعات القادمة"
          value={stats.upcomingMeetings}
          icon={<FaCalendarAlt size={24} />}
          color="#F59E0B"
          onClick={() => setActiveTab('overview')}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FaBuilding className="text-brand" />
            توزيع المستخدمين حسب الإدارة
          </h3>
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
                    <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-all duration-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FaUserTie className="text-brand" />
            توزيع المستخدمين حسب الدور
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>الإدارة العليا (رئيس/نائب)</span>
                <span>{users.filter(u => u.primaryRole === 'chairman' || u.primaryRole === 'vp').length}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500" style={{ width: `${(users.filter(u => u.primaryRole === 'chairman' || u.primaryRole === 'vp').length / stats.totalUsers) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>المديرين</span>
                <span>{stats.managers}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${(stats.managers / stats.totalUsers) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>الموظفين</span>
                <span>{stats.employees}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
                <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500" style={{ width: `${(stats.employees / stats.totalUsers) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <FaBell className="text-brand" />
            آخر الإشعارات
          </h3>
          {stats.unreadNotifications > 0 && (
            <button onClick={markAllNotificationsAsRead} className="text-xs text-brand-light hover:text-brand transition-colors">
              تحديد الكل كمقروء
            </button>
          )}
        </div>
        
        {notifications.slice(0, 5).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaBell className="text-3xl mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map(notification => (
              <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-hv transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--hv)' }}>
                  <FaBell className="text-brand" size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-gray-500">{notification.message}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{getTimeAgo(notification.createdAt)}</p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
  
  // ==========================================
  // تبويب المستخدمين (Users Tab)
  // ==========================================
  
  const UsersTab: React.FC = () => (
    <div className="space-y-4">
      
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
            className="input text-sm py-1.5 w-40"
          >
            <option value="all">جميع الإدارات</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
          <button onClick={exportUsersData} className="icon-btn" title="تصدير">
            <FaDownload size={14} />
          </button>
          <button onClick={printReport} className="icon-btn" title="طباعة">
            <FaPrint size={14} />
          </button>
          <button onClick={() => setShowAddUserModal(true)} className="btn-primary">
            <FaUserPlus className="ml-2" /> إضافة مستخدم
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
              <th className="text-right p-3">المستخدم</th>
              <th className="text-right p-3">البريد الإلكتروني</th>
              <th className="text-right p-3">الإدارة</th>
              <th className="text-right p-3">الدور</th>
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
                            onClick={() => openRolesModal(user)}
                            className="p-1.5 rounded hover:bg-hv transition-colors"
                            title="الصلاحيات المتقدمة"
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
                            onClick={() => handleToggleCustomAdminAccess(user.uid, user.hasCustomAdminAccess || false)}
                            className="p-1.5 rounded hover:bg-hv transition-colors"
                            title={user.hasCustomAdminAccess ? 'إلغاء الصلاحية الاستثنائية' : 'منح صلاحية استثنائية'}
                          >
                            <FaShieldAlt size={14} />
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
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <FaUsers className="text-5xl mx-auto mb-4 text-gray-500" />
            <p className="text-gray-500">لا توجد نتائج مطابقة</p>
          </div>
        )}
      </div>
      
    </div>
  );
  
  // ==========================================
  // تبويب طلبات الانضمام (Requests Tab)
  // ==========================================
  
  const RequestsTab: React.FC = () => (
    <div className="space-y-3">
      {joinRequests.length === 0 ? (
        <div className="card text-center py-12">
          <FaUserCheck className="text-5xl mx-auto mb-4 text-gray-500" />
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
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ background: 'var(--brand-primary)' }}>
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
                    تاريخ التقديم: {format(request.createdAt, 'dd MMM yyyy', { locale: arSA })}
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
  // تبويب الإدارات (Departments Tab)
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
                    onClick={() => handleDeleteDepartment(dept.id, dept.name)}
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
  // تبويب النشاطات (Activity Tab)
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
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaClock className="text-3xl mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد نشاطات مسجلة</p>
          </div>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-hv transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--hv)' }}>
                <FaUserCheck className="text-brand" size={14} />
              </div>
              <div className="flex-1">
                <p className="text-sm">{activity.action}</p>
                <p className="text-xs text-gray-500">بواسطة {activity.user} • {getTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
  
  // ==========================================
  // التحقق من الصلاحيات للوصول إلى الصفحة
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
  // الواجهة الرئيسية للصفحة
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم الإدارية</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة المستخدمين والصلاحيات والإدارات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportUsersData} className="icon-btn" title="تصدير التقرير">
            <FaDownload size={16} />
          </button>
          <button onClick={printReport} className="icon-btn" title="طباعة">
            <FaPrint size={16} />
          </button>
        </div>
      </div>
      
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
      
      {showAddUserModal && <AddUserModal />}
      {showRolesModal && <RolesModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
      
    </div>
  );
};

export default AdminDashboard;