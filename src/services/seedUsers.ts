// src/services/seedUsers.ts

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
    // محاولة البحث عن المستخدم في Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
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
    return userCredential.user.uid;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log(`User ${email} already exists in Auth`);
      // البحث عن UID المستخدم
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }
    }
    console.error(`Error creating user ${email}:`, error);
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
    return true;
  } catch (error) {
    console.error(`Error creating Firestore user ${user.email}:`, error);
    return false;
  }
};

/**
 * تهيئة الإدارات الافتراضية
 */
const seedDepartments = async () => {
  const departments = [
    { name: 'التسويق', managerUid: null },
    { name: 'المالية والتدقيق', managerUid: null },
    { name: 'الموارد البشرية', managerUid: null },
    { name: 'التكنولوجيا', managerUid: null },
    { name: 'العلاقات العامة', managerUid: null },
    { name: 'الإدارة العليا', managerUid: null }
  ];
  
  const batch = writeBatch(db);
  
  for (const dept of departments) {
    const deptRef = doc(db, 'departments', dept.name);
    const deptDoc = await getDoc(deptRef);
    if (!deptDoc.exists()) {
      batch.set(deptRef, {
        name: dept.name,
        managerUid: dept.managerUid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  }
  
  await batch.commit();
  console.log('✅ Departments seeded successfully');
};

/**
 * تهيئة الفروع والمناطق الافتراضية
 */
const seedBranches = async () => {
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
  
  for (const region of regions) {
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
    }
  }
  
  await batch.commit();
  console.log('✅ Branches seeded successfully');
};

/**
 * تهيئة المهام الافتراضية
 */
const seedTasks = async () => {
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
    }
  ];
  
  const batch = writeBatch(db);
  
  for (const task of tasks) {
    const taskRef = doc(db, 'tasks', `${task.title}_${Date.now()}`);
    batch.set(taskRef, {
      ...task,
      createdByUid: 'system',
      assigneesUids: [],
      mentionsUids: [],
      attachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  await batch.commit();
  console.log('✅ Tasks seeded successfully');
};

/**
 * تهيئة البيانات بالكامل
 */
export const seedDatabase = async () => {
  console.log('🚀 Starting database seeding...');
  
  try {
    // تهيئة الإدارات
    await seedDepartments();
    
    // تهيئة الفروع
    await seedBranches();
    
    // تهيئة المستخدمين
    let successCount = 0;
    let failCount = 0;
    
    for (const user of SEED_USERS) {
      console.log(`📝 Processing user: ${user.email}`);
      
      // التحقق من وجود المستخدم
      const exists = await userExistsInAuth(user.email);
      
      if (!exists) {
        // إنشاء مستخدم جديد
        const uid = await createAuthUser(user.email, user.password, user.name);
        if (uid) {
          const firestoreSuccess = await createFirestoreUser(user, uid);
          if (firestoreSuccess) {
            successCount++;
            console.log(`✅ User ${user.email} created successfully`);
          } else {
            failCount++;
            console.error(`❌ Failed to create Firestore user: ${user.email}`);
          }
        } else {
          failCount++;
          console.error(`❌ Failed to create Auth user: ${user.email}`);
        }
      } else {
        console.log(`⏭️ User ${user.email} already exists, skipping...`);
        successCount++;
      }
    }
    
    // تهيئة المهام
    await seedTasks();
    
    console.log(`✅ Database seeding completed! Success: ${successCount}, Failed: ${failCount}`);
    toast.success(`تم تهيئة ${successCount} مستخدم بنجاح`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    toast.error('حدث خطأ في تهيئة قاعدة البيانات');
  }
};

/**
 * التحقق من حالة التهيئة
 */
export const isDatabaseSeeded = async (): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.size > 0;
  } catch (error) {
    console.error('Error checking database seed status:', error);
    return false;
  }
};

/**
 * عرض إحصائيات قاعدة البيانات
 */
export const getDatabaseStats = async () => {
  try {
    const usersRef = collection(db, 'users');
    const tasksRef = collection(db, 'tasks');
    const meetingsRef = collection(db, 'meetings');
    const departmentsRef = collection(db, 'departments');
    
    const [usersSnapshot, tasksSnapshot, meetingsSnapshot, departmentsSnapshot] = await Promise.all([
      getDocs(usersRef),
      getDocs(tasksRef),
      getDocs(meetingsRef),
      getDocs(departmentsRef)
    ]);
    
    return {
      users: usersSnapshot.size,
      tasks: tasksSnapshot.size,
      meetings: meetingsSnapshot.size,
      departments: departmentsSnapshot.size
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
};