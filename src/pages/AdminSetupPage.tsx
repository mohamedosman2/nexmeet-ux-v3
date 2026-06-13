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
import { FaDatabase, FaUsers, FaBuilding, FaTasks, FaCheckCircle, FaSpinner, FaTrash, FaUpload } from 'react-icons/fa';

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
// صفحة تهيئة قاعدة البيانات
// ==========================================

export const AdminSetupPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    users: number;
    departments: number;
    tasks: number;
  } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);

  // جلب الإحصائيات
  const fetchStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const departmentsSnapshot = await getDocs(collection(db, 'departments'));
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      
      setStats({
        users: usersSnapshot.size,
        departments: departmentsSnapshot.size,
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
    console.log('✅ تم تهيئة الإدارات');
  };

  // إنشاء مستخدم في Firestore
  const createFirestoreUser = async (user: SeedUser, uid: string) => {
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
      return userCredential.user.uid;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ المستخدم ${email} موجود بالفعل في Auth`);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return snapshot.docs[0].id;
        }
      }
      console.error(`❌ فشل إنشاء المستخدم ${email}:`, error);
      return null;
    }
  };

  // تهيئة جميع البيانات
  const handleSeedDatabase = async () => {
    setSeeding(true);
    setLoading(true);
    
    try {
      // 1. تهيئة الإدارات
      toast.loading('جاري تهيئة الإدارات...', { id: 'seed' });
      await seedDepartments();
      
      // 2. تهيئة المستخدمين
      toast.loading('جاري تهيئة المستخدمين...', { id: 'seed' });
      let successCount = 0;
      let failCount = 0;
      
      for (const user of SEED_USERS) {
        const uid = await createAuthUser(user.email, user.password);
        if (uid) {
          await createFirestoreUser(user, uid);
          successCount++;
        } else {
          failCount++;
        }
      }
      
      // 3. تحديث الإحصائيات
      await fetchStats();
      
      toast.success(`تم تهيئة ${successCount} مستخدم و 6 إدارات بنجاح`, { id: 'seed' });
      console.log(`✅ اكتملت التهيئة: ${successCount} نجاح, ${failCount} فشل`);
    } catch (error) {
      console.error('Error seeding database:', error);
      toast.error('حدث خطأ في تهيئة قاعدة البيانات', { id: 'seed' });
    } finally {
      setSeeding(false);
      setLoading(false);
    }
  };

  // حذف جميع البيانات
  const handleClearDatabase = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
      return;
    }
    
    setClearing(true);
    setLoading(true);
    
    try {
      toast.loading('جاري حذف البيانات...', { id: 'clear' });
      
      const collections = ['users', 'tasks', 'meetings', 'departments', 'regions', 'notifications', 'messages'];
      
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ تم حذف مجموعة ${collectionName} (${snapshot.size} مستند)`);
      }
      
      await fetchStats();
      toast.success('تم حذف جميع البيانات بنجاح', { id: 'clear' });
    } catch (error) {
      console.error('Error clearing database:', error);
      toast.error('حدث خطأ في حذف البيانات', { id: 'clear' });
    } finally {
      setClearing(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto">
        
        {/* العنوان */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-brand/10">
            <FaDatabase className="text-brand text-3xl" />
          </div>
          <h1 className="text-2xl font-bold">تهيئة قاعدة البيانات</h1>
          <p className="text-gray-500 mt-2">إدارة بيانات المستخدمين والإدارات والمهام</p>
        </div>
        
        {/* الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <FaUsers className="mx-auto mb-2 text-blue-500" size={24} />
            <p className="text-2xl font-bold">{stats?.users || 0}</p>
            <p className="text-sm text-gray-500">المستخدمين</p>
          </div>
          <div className="card text-center">
            <FaBuilding className="mx-auto mb-2 text-green-500" size={24} />
            <p className="text-2xl font-bold">{stats?.departments || 0}</p>
            <p className="text-sm text-gray-500">الإدارات</p>
          </div>
          <div className="card text-center">
            <FaTasks className="mx-auto mb-2 text-purple-500" size={24} />
            <p className="text-2xl font-bold">{stats?.tasks || 0}</p>
            <p className="text-sm text-gray-500">المهام</p>
          </div>
        </div>
        
        {/* المستخدمين المتوقع إنشاؤهم */}
        <div className="card mb-8">
          <h2 className="font-bold mb-4">المستخدمين المتوقع إنشاؤهم</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
                  <th className="text-right p-2">الاسم</th>
                  <th className="text-right p-2">البريد الإلكتروني</th>
                  <th className="text-right p-2">الدور</th>
                  <th className="text-right p-2">الإدارة</th>
                </tr>
              </thead>
              <tbody>
                {SEED_USERS.map((user, idx) => (
                  <tr key={idx} className="border-b" style={{ borderColor: 'var(--bd)' }}>
                    <td className="p-2">{user.name}</td>
                    <td className="p-2 text-gray-500">{user.email}</td>
                    <td className="p-2">
                      <span className={`badge ${
                        user.primaryRole === 'chairman' ? 'badge-primary' :
                        user.primaryRole === 'vp' ? 'badge-secondary' :
                        user.primaryRole === 'manager' ? 'badge-info' : 'badge'
                      }`}>
                        {user.primaryRole === 'chairman' ? 'رئيس' :
                         user.primaryRole === 'vp' ? 'نائب رئيس' :
                         user.primaryRole === 'manager' ? 'مدير' : 'موظف'}
                      </span>
                    </td>
                    <td className="p-2">{user.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* أزرار التحكم */}
        <div className="flex gap-4">
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
            {clearing ? <FaSpinner className="animate-spin ml-2" /> : <FaTrash className="ml-2" />}
            {clearing ? 'جاري الحذف...' : 'حذف جميع البيانات'}
          </button>
        </div>
        
        {/* معلومات حسابات الدخول */}
        <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--hv)' }}>
          <h3 className="font-bold mb-3">حسابات الدخول المتاحة بعد التهيئة:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-4">
              <div><span className="text-brand">mohd@uexperts.sa</span> / Pass@123 - <span className="text-yellow-500">رئيس مجلس الإدارة</span></div>
              <div><span className="text-brand">ali@uexperts.sa</span> / Pass@123 - <span className="text-blue-500">نائب رئيس</span></div>
              <div><span className="text-brand">muharib@uexperts.sa</span> / Pass@123 - <span className="text-green-500">مدير العلاقات العامة + مستشار</span></div>
              <div><span className="text-brand">m.othman@uexperts.sa</span> / Pass@123 - <span className="text-purple-500">مستشار رئيس مجلس الإدارة</span></div>
            </div>
          </div>
        </div>
        
        {/* حالة التحميل */}
        {(seeding || clearing) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg3 rounded-lg p-6 text-center">
              <div className="spinner-lg mx-auto mb-4"></div>
              <p className="text-white">{seeding ? 'جاري تهيئة قاعدة البيانات...' : 'جاري حذف البيانات...'}</p>
              <p className="text-gray-500 text-sm mt-2">يرجى الانتظار</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSetupPage;