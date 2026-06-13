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
    name: 'سلطان العنزي',
    email: 's.anazi@uexperts.sa',
    phone: '+966502222224',
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
    name: 'ريم المالكي',
    email: 'r.malki@uexperts.sa',
    phone: '+966503333335',
    department: 'المالية والتدقيق',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'عبدالرحمن القرني',
    email: 'a.qarni@uexperts.sa',
    phone: '+966503333336',
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
    name: 'سارة القحطاني',
    email: 's.qahtani@uexperts.sa',
    phone: '+966504444446',
    department: 'الموارد البشرية',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'منيرة الشهري',
    email: 'm.shahri@uexperts.sa',
    phone: '+966504444447',
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
    name: 'لمياء الزهراني',
    email: 'l.zahrani@uexperts.sa',
    phone: '+966505555557',
    department: 'العلاقات العامة',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'بدر الرشيدي',
    email: 'b.rashidi@uexperts.sa',
    phone: '+966505555558',
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
  },
  {
    name: 'هند السبيعي',
    email: 'h.subaie@uexperts.sa',
    phone: '+966506666668',
    department: 'التكنولوجيا',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'ياسر الغامدي',
    email: 'y.ghamdi@uexperts.sa',
    phone: '+966506666669',
    department: 'التكنولوجيا',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  },
  {
    name: 'تركي المالكي',
    email: 't.malki2@uexperts.sa',
    phone: '+966506666670',
    department: 'التكنولوجيا',
    primaryRole: 'employee',
    additionalTitles: [],
    isActive: true,
    password: 'Pass@123'
  }
];

// ==========================================
// دوال تهيئة البيانات
// ==========================================

/**
 * التحقق من وجود مستخدم في Firebase Auth
 */
const userExistsInAuth = async (email: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(usersQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

/**
 * إنشاء مستخدم في Firebase Auth
 */
const createAuthUser = async (email: string, password: string, name: string): Promise<string | null> => {
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
        return querySnapshot.docs[0].id;
      }
    }
    console.error(`❌ فشل إنشاء المستخدم ${email}:`, error);
    return null;
  }
};

/**
 * إنشاء مستخدم في Firestore
 */
const createFirestoreUser = async (user: SeedUser, uid: string): Promise<boolean> => {
  try {
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
    return true;
  } catch (error) {
    console.error(`❌ فشل إنشاء المستخدم في Firestore ${user.email}:`, error);
    return false;
  }
};

/**
 * تهيئة الإدارات الافتراضية
 */
const seedDepartments = async (): Promise<void> => {
  console.log('🚀 بدء تهيئة الإدارات...');
  
  const departments = [
    { name: 'التسويق', managerUid: null },
    { name: 'المالية والتدقيق', managerUid: null },
    { name: 'الموارد البشرية', managerUid: null },
    { name: 'التكنولوجيا', managerUid: null },
    { name: 'العلاقات العامة', managerUid: null },
    { name: 'الإدارة العليا', managerUid: null }
  ];
  
  const batch = writeBatch(db);
  
  for (let i = 0; i < departments.length; i++) {
    const dept = departments[i];
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

/**
 * تهيئة الفروع والمناطق الافتراضية
 */
const seedBranches = async (): Promise<void> => {
  console.log('🚀 بدء تهيئة الفروع والمناطق...');
  
  const regions = [
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
  
  const batch = writeBatch(db);
  
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
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
    } else {
      console.log(`⏭️ المنطقة موجودة بالفعل: ${region.name}`);
    }
  }
  
  await batch.commit();
  console.log('✅ اكتملت تهيئة الفروع والمناطق');
};

/**
 * تهيئة المهام الافتراضية
 */
const seedTasks = async (): Promise<void> => {
  console.log('🚀 بدء تهيئة المهام...');
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const tasks = [
    {
      title: 'اجتماع التسويق الأسبوعي',
      date: today,
      time: '10:00',
      description: 'مراجعة الحملات التسويقية ومناقشة الخطة الأسبوعية',
      priority: 'medium',
      status: 'progress',
      department: 'التسويق',
      isPublic: true
    },
    {
      title: 'مراجعة الميزانية الربع سنوية',
      date: today,
      time: '14:00',
      description: 'مراجعة الميزانية المالية للربع الثالث',
      priority: 'high',
      status: 'todo',
      department: 'المالية والتدقيق',
      isPublic: true
    },
    {
      title: 'مقابلات توظيف للمشاريع الجديدة',
      date: tomorrow,
      time: '09:00',
      description: 'مقابلة المرشحين للوظائف الجديدة',
      priority: 'medium',
      status: 'todo',
      department: 'الموارد البشرية',
      isPublic: true
    },
    {
      title: 'تحديث نظام الموقع',
      date: tomorrow,
      time: '11:00',
      description: 'تحديث واجهة المستخدم وإصلاح المشاكل التقنية',
      priority: 'high',
      status: 'progress',
      department: 'التكنولوجيا',
      isPublic: true
    },
    {
      title: 'تقرير العلاقات العامة الشهري',
      date: tomorrow,
      time: '15:00',
      description: 'إعداد التقرير الشهري لأنشطة العلاقات العامة',
      priority: 'low',
      status: 'todo',
      department: 'العلاقات العامة',
      isPublic: true
    },
    {
      title: 'اجتماع مجلس الإدارة',
      date: tomorrow,
      time: '16:00',
      description: 'مناقشة الأداء العام للشركة',
      priority: 'high',
      status: 'todo',
      department: 'الإدارة العليا',
      isPublic: true
    }
  ];
  
  const batch = writeBatch(db);
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
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

/**
 * تهيئة البيانات بالكامل
 */
export const seedDatabase = async (): Promise<void> => {
  console.log('🚀🚀🚀 بدء تهيئة قاعدة البيانات بالكامل...');
  console.log('=========================================');
  
  try {
    // 1. تهيئة الإدارات
    await seedDepartments();
    console.log('-----------------------------------------');
    
    // 2. تهيئة الفروع
    await seedBranches();
    console.log('-----------------------------------------');
    
    // 3. تهيئة المستخدمين
    console.log('🚀 بدء تهيئة المستخدمين...');
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < SEED_USERS.length; i++) {
      const user = SEED_USERS[i];
      console.log(`📝 [${i + 1}/${SEED_USERS.length}] معالجة المستخدم: ${user.email}`);
      
      const exists = await userExistsInAuth(user.email);
      
      if (!exists) {
        const uid = await createAuthUser(user.email, user.password, user.name);
        if (uid) {
          const firestoreSuccess = await createFirestoreUser(user, uid);
          if (firestoreSuccess) {
            successCount++;
            console.log(`✅ تم إنشاء المستخدم بنجاح: ${user.email}`);
          } else {
            failCount++;
            console.error(`❌ فشل إنشاء المستخدم في Firestore: ${user.email}`);
          }
        } else {
          failCount++;
          console.error(`❌ فشل إنشاء المستخدم في Auth: ${user.email}`);
        }
      } else {
        console.log(`⏭️ المستخدم موجود بالفعل: ${user.email}`);
        successCount++;
      }
    }
    
    console.log(`📊 إحصائيات المستخدمين: نجاح ${successCount}, فشل ${failCount}`);
    console.log('-----------------------------------------');
    
    // 4. تهيئة المهام
    await seedTasks();
    console.log('-----------------------------------------');
    
    console.log('=========================================');
    console.log(`✅✅✅ اكتملت تهيئة قاعدة البيانات بنجاح!`);
    console.log(`📊 المستخدمين: ${successCount} نجاح, ${failCount} فشل`);
    console.log(`📊 الإدارات: 6`);
    console.log(`📊 الفروع: 5 مناطق`);
    console.log(`📊 المهام: 6`);
    
    if (typeof toast !== 'undefined') {
      toast.success(`تم تهيئة ${successCount} مستخدم بنجاح`);
    }
  } catch (error) {
    console.error('❌❌❌ خطأ في تهيئة قاعدة البيانات:', error);
    if (typeof toast !== 'undefined') {
      toast.error('حدث خطأ في تهيئة قاعدة البيانات');
    }
  }
};

/**
 * التحقق من حالة التهيئة
 */
export const isDatabaseSeeded = async (): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const hasUsers = querySnapshot.size > 0;
    console.log(`📊 قاعدة البيانات ${hasUsers ? 'تحتوي على بيانات' : 'فارغة'}`);
    return hasUsers;
  } catch (error) {
    console.error('Error checking database seed status:', error);
    return false;
  }
};

/**
 * عرض إحصائيات قاعدة البيانات
 */
export const getDatabaseStats = async (): Promise<{
  users: number;
  tasks: number;
  meetings: number;
  departments: number;
  regions: number;
} | null> => {
  try {
    const usersRef = collection(db, 'users');
    const tasksRef = collection(db, 'tasks');
    const meetingsRef = collection(db, 'meetings');
    const departmentsRef = collection(db, 'departments');
    const regionsRef = collection(db, 'regions');
    
    const [usersSnapshot, tasksSnapshot, meetingsSnapshot, departmentsSnapshot, regionsSnapshot] = await Promise.all([
      getDocs(usersRef),
      getDocs(tasksRef),
      getDocs(meetingsRef),
      getDocs(departmentsRef),
      getDocs(regionsRef)
    ]);
    
    const stats = {
      users: usersSnapshot.size,
      tasks: tasksSnapshot.size,
      meetings: meetingsSnapshot.size,
      departments: departmentsSnapshot.size,
      regions: regionsSnapshot.size
    };
    
    console.log('📊 إحصائيات قاعدة البيانات:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
};

/**
 * حذف جميع البيانات من قاعدة البيانات (بحذر)
 */
export const clearDatabase = async (): Promise<boolean> => {
  console.warn('⚠️ تحذير: جاري حذف جميع البيانات من قاعدة البيانات!');
  
  const confirmClear = window.confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!');
  if (!confirmClear) {
    console.log('تم إلغاء عملية الحذف');
    return false;
  }
  
  try {
    const collections = ['users', 'tasks', 'meetings', 'departments', 'regions', 'notifications', 'messages'];
    
    for (let i = 0; i < collections.length; i++) {
      const collectionName = collections[i];
      const snapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✅ تم حذف مجموعة ${collectionName} (${snapshot.size} مستند)`);
    }
    
    console.log('✅ تم حذف جميع البيانات بنجاح');
    toast.success('تم حذف جميع البيانات');
    return true;
  } catch (error) {
    console.error('❌ خطأ في حذف البيانات:', error);
    toast.error('حدث خطأ في حذف البيانات');
    return false;
  }
};