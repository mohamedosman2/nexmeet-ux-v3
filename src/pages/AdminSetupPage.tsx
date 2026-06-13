import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  writeBatch 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import toast from 'react-hot-toast';
import { 
  FaDatabase, 
  FaUsers, 
  FaBuilding, 
  FaTasks, 
  FaCheckCircle, 
  FaSpinner, 
  FaTrash, 
  FaUpload,
  FaMapMarkerAlt,
  FaVideo,
  FaComments,
  FaCalendarAlt,
  FaUserPlus,
  FaUserCheck,
  FaUserTimes,
  FaShieldAlt,
  FaChartLine,
  FaClock,
  FaStar,
  FaEye,
  FaEdit,
  FaTrash as FaDeleteIcon,
  FaPlus,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPrint,
  FaEnvelope,
  FaPhone
} from 'react-icons/fa';

// ==========================================
// بيانات المستخدمين الافتراضيين
// ==========================================

interface SeedUser {
  name: string;
  email: string;
  phone: string;
  department: string;
  primaryRole: 'chairman' | 'vp' | 'manager' | 'employee';
  additionalTitles: string[];
  isActive: boolean;
  hasCustomAdminAccess?: boolean;
  accessibleDepartments?: string[];
  password: string;
}

const SEED_USERS: SeedUser[] = [
  {
    name: 'محمد آل نصار (أبو نواف)',
    email: 'mohd@uexperts.sa',
    phone: '+966568652222',
    department: 'الإدارة العليا',
    primaryRole: 'chairman',
    additionalTitles: ['رئيس مجلس الإدارة'],
    isActive: true,
    hasCustomAdminAccess: true,
    accessibleDepartments: ['التسويق', 'المالية والتدقيق', 'الموارد البشرية', 'التكنولوجيا', 'العلاقات العامة', 'الإدارة العليا'],
    password: 'Pass@123'
  },
  {
    name: 'علي آل رابعة القحطاني',
    email: 'ali@uexperts.sa',
    phone: '+966556333301',
    department: 'التسويق',
    primaryRole: 'vp',
    additionalTitles: ['نائب رئيس مجلس الإدارة', 'مدير التسويق'],
    isActive: true,
    hasCustomAdminAccess: true,
    accessibleDepartments: ['التسويق', 'المالية والتدقيق', 'الموارد البشرية', 'التكنولوجيا', 'العلاقات العامة', 'الإدارة العليا'],
    password: 'Pass@123'
  },
  {
    name: 'محمد عثمان',
    email: 'm.othman@uexperts.sa',
    phone: '+966539303952',
    department: 'المالية والتدقيق',
    primaryRole: 'manager',
    additionalTitles: ['مستشار رئيس مجلس الإدارة', 'مطور النظام'],
    isActive: true,
    hasCustomAdminAccess: true,
    accessibleDepartments: ['المالية والتدقيق', 'التكنولوجيا'],
    password: 'Pass@123'
  },
  {
    name: 'خالد المحارب',
    email: 'muharib@uexperts.sa',
    phone: '+966542222207',
    department: 'العلاقات العامة',
    primaryRole: 'manager',
    additionalTitles: ['مستشار رئيس مجلس الإدارة'],
    isActive: true,
    hasCustomAdminAccess: true,
    accessibleDepartments: ['العلاقات العامة'],
    password: 'Pass@123'
  },
  {
    name: 'عبدالله السعدون',
    email: 'a.alsaadoun@uexperts.sa',
    phone: '+966555555555',
    department: 'الموارد البشرية',
    primaryRole: 'manager',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'أحمد التميمي',
    email: 'a.tamimi@uexperts.sa',
    phone: '+966566666666',
    department: 'التكنولوجيا',
    primaryRole: 'manager',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'فهد الشمري',
    email: 'f.shamri@uexperts.sa',
    phone: '+966502111111',
    department: 'التسويق',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'نورة العتيبي',
    email: 'n.otaibi@uexperts.sa',
    phone: '+966502222223',
    department: 'التسويق',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'سلطان الحربي',
    email: 's.harbi@uexperts.sa',
    phone: '+966503333334',
    department: 'المالية والتدقيق',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'خالد الدوسري',
    email: 'k.dosari@uexperts.sa',
    phone: '+966504444445',
    department: 'الموارد البشرية',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'ماجد المطيري',
    email: 'm.mutairi@uexperts.sa',
    phone: '+966505555556',
    department: 'العلاقات العامة',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'عمر البلوي',
    email: 'o.balawi@uexperts.sa',
    phone: '+966506666667',
    department: 'التكنولوجيا',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  }
];

// ==========================================
// بيانات الإدارات
// ==========================================

const DEPARTMENTS_DATA = [
  { name: 'التسويق', managerUid: null },
  { name: 'المالية والتدقيق', managerUid: null },
  { name: 'الموارد البشرية', managerUid: null },
  { name: 'التكنولوجيا', managerUid: null },
  { name: 'العلاقات العامة', managerUid: null },
  { name: 'الإدارة العليا', managerUid: null }
];

// ==========================================
// بيانات الفروع والمناطق
// ==========================================

const REGIONS_DATA = [
  {
    id: 'central',
    name: 'المنطقة الوسطى',
    branches: [
      { id: 'riyadh_1', name: 'فرع الحمرا (اليرموك)', rooms: ['القاعة الرئيسية', 'قاعة التدريب 1', 'قاعة التدريب 2'] },
      { id: 'riyadh_2', name: 'فرع الملك عبدالعزيز (الملك فهد)', rooms: ['قاعة المديرين', 'قاعة المؤتمرات', 'قاعة العروض'] }
    ]
  },
  {
    id: 'eastern',
    name: 'المنطقة الشرقية',
    branches: [
      { id: 'dammam', name: 'فرع الدمام', rooms: ['قاعة الشرق', 'قاعة الخليج'] }
    ]
  },
  {
    id: 'western',
    name: 'المنطقة الغربية',
    branches: [
      { id: 'jeddah', name: 'فرع جدة', rooms: ['قاعة البحر الأحمر', 'قاعة المؤتمرات'] }
    ]
  },
  {
    id: 'northern',
    name: 'المنطقة الشمالية',
    branches: [
      { id: 'jauf', name: 'فرع الجوف', rooms: ['قاعة الجوف', 'قاعة الحدود'] }
    ]
  },
  {
    id: 'southern',
    name: 'المنطقة الجنوبية',
    branches: [
      { id: 'abha', name: 'فرع أبها', rooms: ['قاعة السودة', 'قاعة أبيها'] }
    ]
  }
];

// ==========================================
// بيانات المهام الافتراضية
// ==========================================

const TASKS_DATA = [
  {
    title: 'اجتماع التسويق الأسبوعي',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    description: 'مراجعة الحملات التسويقية ومناقشة الخطة الأسبوعية',
    priority: 'medium',
    status: 'progress',
    department: 'التسويق',
    isPublic: true
  },
  {
    title: 'مراجعة الميزانية الربع سنوية',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    description: 'مراجعة الميزانية المالية للربع الثالث',
    priority: 'high',
    status: 'todo',
    department: 'المالية والتدقيق',
    isPublic: true
  },
  {
    title: 'مقابلات توظيف للمشاريع الجديدة',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '09:00',
    description: 'مقابلة المرشحين للوظائف الجديدة',
    priority: 'medium',
    status: 'todo',
    department: 'الموارد البشرية',
    isPublic: true
  },
  {
    title: 'تحديث نظام الموقع',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '11:00',
    description: 'تحديث واجهة المستخدم وإصلاح المشاكل التقنية',
    priority: 'high',
    status: 'progress',
    department: 'التكنولوجيا',
    isPublic: true
  },
  {
    title: 'تقرير العلاقات العامة الشهري',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '15:00',
    description: 'إعداد التقرير الشهري لأنشطة العلاقات العامة',
    priority: 'low',
    status: 'todo',
    department: 'العلاقات العامة',
    isPublic: true
  },
  {
    title: 'اجتماع مجلس الإدارة',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '16:00',
    description: 'مناقشة الأداء العام للشركة',
    priority: 'high',
    status: 'todo',
    department: 'الإدارة العليا',
    isPublic: true
  }
];

// ==========================================
// صفحة تهيئة قاعدة البيانات
// ==========================================

export const AdminSetupPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    users: number;
    departments: number;
    regions: number;
    tasks: number;
  } | null>(null);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);

  // جلب الإحصائيات
  const fetchStats = async (): Promise<void> => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const departmentsSnapshot = await getDocs(collection(db, 'departments'));
      const regionsSnapshot = await getDocs(collection(db, 'regions'));
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      
      setStats({
        users: usersSnapshot.size,
        departments: departmentsSnapshot.size,
        regions: regionsSnapshot.size,
        tasks: tasksSnapshot.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // تهيئة الإدارات
  const seedDepartments = async (): Promise<void> => {
    console.log('🚀 بدء تهيئة الإدارات...');
    const batch = writeBatch(db);
    
    for (let i = 0; i < DEPARTMENTS_DATA.length; i++) {
      const dept = DEPARTMENTS_DATA[i];
      const deptRef = doc(db, 'departments', dept.name);
      const deptDoc = await getDoc(deptRef);
      if (!deptDoc.exists()) {
        batch.set(deptRef, {
          name: dept.name,
          managerUid: dept.managerUid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        console.log(`✅ تم إنشاء الإدارة: ${dept.name}`);
      } else {
        console.log(`⏭️ الإدارة موجودة بالفعل: ${dept.name}`);
      }
    }
    
    await batch.commit();
    console.log('✅ اكتملت تهيئة الإدارات');
  };

  // تهيئة الفروع والمناطق
  const seedRegions = async (): Promise<void> => {
    console.log('🚀 بدء تهيئة الفروع والمناطق...');
    const batch = writeBatch(db);
    
    for (let i = 0; i < REGIONS_DATA.length; i++) {
      const region = REGIONS_DATA[i];
      const regionRef = doc(db, 'regions', region.id);
      const regionDoc = await getDoc(regionRef);
      if (!regionDoc.exists()) {
        batch.set(regionRef, {
          id: region.id,
          region: region.name,
          branches: region.branches,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        console.log(`✅ تم إنشاء المنطقة: ${region.name}`);
        
        for (let j = 0; j < region.branches.length; j++) {
          const branch = region.branches[j];
          console.log(`   ✅ تم إنشاء الفرع: ${branch.name} (${branch.rooms.length} قاعة)`);
        }
      } else {
        console.log(`⏭️ المنطقة موجودة بالفعل: ${region.name}`);
      }
    }
    
    await batch.commit();
    console.log('✅ اكتملت تهيئة الفروع والمناطق');
  };

  // تهيئة المهام
  const seedTasks = async (): Promise<void> => {
    console.log('🚀 بدء تهيئة المهام...');
    const batch = writeBatch(db);
    
    for (let i = 0; i < TASKS_DATA.length; i++) {
      const task = TASKS_DATA[i];
      const taskId = `${task.title.replace(/\s/g, '_')}_${Date.now()}_${i}`;
      const taskRef = doc(db, 'tasks', taskId);
      batch.set(taskRef, {
        title: task.title,
        date: task.date,
        time: task.time,
        description: task.description,
        priority: task.priority,
        status: task.status,
        department: task.department,
        isPublic: task.isPublic,
        createdByUid: 'system',
        assigneesUids: [],
        mentionsUids: [],
        attachments: [],
        comments: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      console.log(`✅ تم إنشاء المهمة: ${task.title}`);
    }
    
    await batch.commit();
    console.log('✅ اكتملت تهيئة المهام');
  };

  // إنشاء مستخدم في Firestore
  const createFirestoreUser = async (user: SeedUser, uid: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      uid: uid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      primaryRole: user.primaryRole,
      additionalTitles: user.additionalTitles,
      isActive: user.isActive,
      hasCustomAdminAccess: user.hasCustomAdminAccess || false,
      accessibleDepartments: user.accessibleDepartments || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log(`✅ تم إنشاء المستخدم في Firestore: ${user.email}`);
  };

  // إنشاء مستخدم في Auth
  const createAuthUser = async (email: string, password: string): Promise<string | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log(`✅ تم إنشاء المستخدم في Auth: ${email}`);
      return userCredential.user.uid;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ المستخدم ${email} موجود بالفعل في Auth`);
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(usersQuery);
        if (!querySnapshot.empty) {
          console.log(`✅ تم العثور على UID للمستخدم ${email}`);
          return querySnapshot.docs[0].id;
        }
      }
      console.error(`❌ فشل إنشاء المستخدم ${email}:`, error);
      return null;
    }
  };

  // تهيئة المستخدمين
  const seedUsers = async (): Promise<{ successCount: number; failCount: number }> => {
    console.log('🚀 بدء تهيئة المستخدمين...');
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < SEED_USERS.length; i++) {
      const user = SEED_USERS[i];
      console.log(`📝 [${i + 1}/${SEED_USERS.length}] معالجة المستخدم: ${user.email}`);
      
      const uid = await createAuthUser(user.email, user.password);
      if (uid) {
        await createFirestoreUser(user, uid);
        successCount++;
        console.log(`✅ تم إنشاء المستخدم بنجاح: ${user.email}`);
      } else {
        failCount++;
        console.error(`❌ فشل إنشاء المستخدم: ${user.email}`);
      }
    }
    
    console.log(`📊 إحصائيات المستخدمين: نجاح ${successCount}, فشل ${failCount}`);
    return { successCount, failCount };
  };

  // تهيئة جميع البيانات
  const handleSeedDatabase = async (): Promise<void> => {
    setSeeding(true);
    setLoading(true);
    
    try {
      toast.loading('جاري تهيئة الإدارات...', { id: 'seed' });
      await seedDepartments();
      
      toast.loading('جاري تهيئة الفروع والمناطق...', { id: 'seed' });
      await seedRegions();
      
      toast.loading('جاري تهيئة المهام...', { id: 'seed' });
      await seedTasks();
      
      toast.loading('جاري تهيئة المستخدمين...', { id: 'seed' });
      const { successCount, failCount } = await seedUsers();
      
      await fetchStats();
      
      toast.success(
        `تم التهيئة بنجاح! ${successCount} مستخدم، ${DEPARTMENTS_DATA.length} إدارة، ${REGIONS_DATA.length} منطقة، ${TASKS_DATA.length} مهمة`, 
        { id: 'seed', duration: 5000 }
      );
      
      console.log('=========================================');
      console.log(`✅ اكتملت التهيئة بنجاح!`);
      console.log(`📊 المستخدمين: ${successCount} نجاح, ${failCount} فشل`);
      console.log(`📊 الإدارات: ${DEPARTMENTS_DATA.length}`);
      console.log(`📊 المناطق: ${REGIONS_DATA.length}`);
      console.log(`📊 المهام: ${TASKS_DATA.length}`);
      console.log('=========================================');
      
    } catch (error) {
      console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
      toast.error('حدث خطأ في تهيئة قاعدة البيانات', { id: 'seed' });
    } finally {
      setSeeding(false);
      setLoading(false);
    }
  };

  // حذف جميع البيانات
  const handleClearDatabase = async (): Promise<void> => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
      return;
    }
    
    setClearing(true);
    setLoading(true);
    
    try {
      toast.loading('جاري حذف البيانات...', { id: 'clear' });
      
      const collections = [
        'users', 
        'tasks', 
        'meetings', 
        'departments', 
        'regions', 
        'notifications', 
        'messages', 
        'calls', 
        'suggestions', 
        'chatGroups',
        'joinRequests',
        'userSettings'
      ];
      
      for (let i = 0; i < collections.length; i++) {
        const collectionName = collections[i];
        const snapshot = await getDocs(collection(db, collectionName));
        
        if (snapshot.empty) {
          console.log(`⏭️ مجموعة ${collectionName} فارغة، تخطي`);
          continue;
        }
        
        const batch = writeBatch(db);
        snapshot.forEach((document) => {
          batch.delete(document.ref);
        });
        await batch.commit();
        console.log(`✅ تم حذف مجموعة ${collectionName} (${snapshot.size} مستند)`);
      }
      
      await fetchStats();
      toast.success('تم حذف جميع البيانات بنجاح', { id: 'clear', duration: 3000 });
      console.log('✅ اكتمل حذف جميع البيانات');
      
    } catch (error) {
      console.error('❌ خطأ في حذف البيانات:', error);
      toast.error('حدث خطأ في حذف البيانات', { id: 'clear' });
    } finally {
      setClearing(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        
        {/* ========================================== */}
        {/* العنوان */}
        {/* ========================================== */}
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-brand/10">
            <FaDatabase className="text-brand text-3xl" />
          </div>
          <h1 className="text-2xl font-bold">تهيئة قاعدة البيانات</h1>
          <p className="text-gray-500 mt-2">إدارة بيانات المستخدمين والإدارات والفروع والمهام</p>
        </div>
        
        {/* ========================================== */}
        {/* الإحصائيات */}
        {/* ========================================== */}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <FaUsers className="mx-auto mb-2 text-blue-500" size={24} />
            <p className="text-2xl font-bold">{stats?.users ?? 0}</p>
            <p className="text-sm text-gray-500">المستخدمين</p>
          </div>
          <div className="card text-center">
            <FaBuilding className="mx-auto mb-2 text-green-500" size={24} />
            <p className="text-2xl font-bold">{stats?.departments ?? 0}</p>
            <p className="text-sm text-gray-500">الإدارات</p>
          </div>
          <div className="card text-center">
            <FaMapMarkerAlt className="mx-auto mb-2 text-purple-500" size={24} />
            <p className="text-2xl font-bold">{stats?.regions ?? 0}</p>
            <p className="text-sm text-gray-500">المناطق والفروع</p>
          </div>
          <div className="card text-center">
            <FaTasks className="mx-auto mb-2 text-orange-500" size={24} />
            <p className="text-2xl font-bold">{stats?.tasks ?? 0}</p>
            <p className="text-sm text-gray-500">المهام</p>
          </div>
        </div>
        
        {/* ========================================== */}
        {/* أزرار التحكم */}
        {/* ========================================== */}
        
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleSeedDatabase}
            disabled={seeding || clearing}
            className="btn-primary flex-1"
          >
            {seeding ? <FaSpinner className="animate-spin ml-2" /> : <FaUpload className="ml-2" />}
            {seeding ? 'جاري التهيئة...' : 'تهيئة قاعدة البيانات'}
          </button>
          
          <button
            onClick={handleClearDatabase}
            disabled={seeding || clearing}
            className="btn-danger flex-1"
          >
            {clearing ? <FaSpinner className="animate-spin ml-2" /> : <FaDeleteIcon className="ml-2" />}
            {clearing ? 'جاري الحذف...' : 'حذف جميع البيانات'}
          </button>
        </div>
        
        {/* ========================================== */}
        {/* تفاصيل ما سيتم تهيئته - المستخدمين */}
        {/* ========================================== */}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          <div className="card">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <FaUsers className="text-blue-500" />
              المستخدمين المتوقع إنشاؤهم ({SEED_USERS.length})
            </h2>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b sticky top-0" style={{ background: 'var(--bg3)', borderColor: 'var(--bd)' }}>
                    <th className="text-right p-2">#</th>
                    <th className="text-right p-2">الاسم</th>
                    <th className="text-right p-2">البريد</th>
                    <th className="text-right p-2">الدور</th>
                    <th className="text-right p-2">الإدارة</th>
                  </tr>
                </thead>
                <tbody>
                  {SEED_USERS.map((user, idx) => (
                    <tr key={idx} className="border-b" style={{ borderColor: 'var(--bd)' }}>
                      <td className="p-2 text-center text-gray-500">{idx + 1}</td>
                      <td className="p-2 text-sm">{user.name}</td>
                      <td className="p-2 text-xs text-gray-500">{user.email}</td>
                      <td className="p-2">
                        <span className={`badge text-xs ${
                          user.primaryRole === 'chairman' ? 'badge-primary' :
                          user.primaryRole === 'vp' ? 'badge-secondary' :
                          user.primaryRole === 'manager' ? 'badge-info' : 'badge'
                        }`}>
                          {user.primaryRole === 'chairman' ? 'رئيس' :
                           user.primaryRole === 'vp' ? 'نائب رئيس' :
                           user.primaryRole === 'manager' ? 'مدير' : 'موظف'}
                        </span>
                      </td>
                      <td className="p-2 text-sm">{user.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* ========================================== */}
          {/* الإدارات والفروع */}
          {/* ========================================== */}
          
          <div className="card">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <FaBuilding className="text-green-500" />
              الإدارات والفروع
            </h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-2">الإدارات ({DEPARTMENTS_DATA.length})</p>
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS_DATA.map((dept, idx) => (
                    <span key={idx} className="badge bg-hv px-3 py-1">{dept.name}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">المناطق والفروع ({REGIONS_DATA.length} مناطق)</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {REGIONS_DATA.map((region, idx) => (
                    <div key={idx} className="p-3 rounded-lg" style={{ background: 'var(--hv)' }}>
                      <p className="font-medium text-sm flex items-center gap-2">
                        <FaMapMarkerAlt className="text-brand" size={12} />
                        {region.name}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 mr-6">
                        {region.branches.map((branch, bidx) => (
                          <div key={bidx} className="text-xs p-2 rounded" style={{ background: 'var(--bg3)' }}>
                            <p className="font-medium">{branch.name}</p>
                            <p className="text-gray-500 text-[10px] mt-1">القاعات: {branch.rooms.join(', ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ========================================== */}
        {/* المهام */}
        {/* ========================================== */}
        
        <div className="card mb-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <FaTasks className="text-orange-500" />
            المهام المتوقع إنشاؤها ({TASKS_DATA.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
                  <th className="text-right p-2">#</th>
                  <th className="text-right p-2">العنوان</th>
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">الوقت</th>
                  <th className="text-right p-2">الأولوية</th>
                  <th className="text-right p-2">الحالة</th>
                  <th className="text-right p-2">الإدارة</th>
                </tr>
              </thead>
              <tbody>
                {TASKS_DATA.map((task, idx) => (
                  <tr key={idx} className="border-b" style={{ borderColor: 'var(--bd)' }}>
                    <td className="p-2 text-center text-gray-500">{idx + 1}</td>
                    <td className="p-2">{task.title}</td>
                    <td className="p-2 text-gray-500">{task.date}</td>
                    <td className="p-2 text-gray-500">{task.time}</td>
                    <td className="p-2">
                      <span className={`badge text-xs ${
                        task.priority === 'high' ? 'badge-danger' :
                        task.priority === 'medium' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`badge text-xs ${
                        task.status === 'done' ? 'badge-success' :
                        task.status === 'progress' ? 'badge-info' : 'badge'
                      }`}>
                        {task.status === 'done' ? 'مكتملة' : task.status === 'progress' ? 'جارية' : 'لم تبدأ'}
                      </span>
                    </td>
                    <td className="p-2">{task.department}</td>
                  </table>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* ========================================== */}
        {/* معلومات حسابات الدخول */}
        {/* ========================================== */}
        
        <div className="p-4 rounded-lg mb-6" style={{ background: 'var(--hv)' }}>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <FaCheckCircle className="text-green-500" />
            حسابات الدخول المتاحة بعد التهيئة:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-brand font-medium">mohd@uexperts.sa</span>
              <span>/</span>
              <span>Pass@123</span>
              <span className="text-yellow-500 text-xs mr-2">- رئيس مجلس الإدارة</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand font-medium">ali@uexperts.sa</span>
              <span>/</span>
              <span>Pass@123</span>
              <span className="text-blue-500 text-xs mr-2">- نائب رئيس</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand font-medium">muharib@uexperts.sa</span>
              <span>/</span>
              <span>Pass@123</span>
              <span className="text-green-500 text-xs mr-2">- مدير العلاقات العامة + مستشار</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand font-medium">m.othman@uexperts.sa</span>
              <span>/</span>
              <span>Pass@123</span>
              <span className="text-purple-500 text-xs mr-2">- مستشار رئيس مجلس الإدارة</span>
            </div>
          </div>
        </div>
        
        {/* ========================================== */}
        {/* حالة التحميل */}
        {/* ========================================== */}
        
        {(seeding || clearing) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg3 rounded-lg p-6 text-center min-w-[280px]">
              <div className="spinner-lg mx-auto mb-4"></div>
              <p className="text-white font-medium">{seeding ? 'جاري تهيئة قاعدة البيانات...' : 'جاري حذف البيانات...'}</p>
              <p className="text-gray-500 text-sm mt-2">يرجى الانتظار، قد يستغرق هذا دقيقة</p>
              <div className="mt-4 w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
                <div className="h-full bg-brand rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default AdminSetupPage;