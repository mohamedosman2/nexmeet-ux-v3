// src/pages/DepartmentsPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  FaBuilding, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaUsers, 
  FaUserTie,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaChartLine,
  FaSpinner,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPrint
} from 'react-icons/fa';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ==========================================
// الأنواع
// ==========================================

interface Department {
  id: string;
  name: string;
  managerUid: string | null;
  description?: string;
  parentDepartment?: string;
  budget?: number;
  location?: string;
  phone?: string;
  email?: string;
  createdAt: number;
  updatedAt: number;
}

interface User {
  uid: string;
  name: string;
  email: string;
  department: string;
  primaryRole: string;
  isActive: boolean;
}

// ==========================================
// صفحة إدارة الإدارات
// ==========================================

export const DepartmentsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { isTopManagement } = usePermissions();
  
  // حالات البيانات
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالات النوافذ المنبثقة
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [selectedDeptForManager, setSelectedDeptForManager] = useState<Department | null>(null);
  
  // حالات النموذج
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formParentDept, setFormParentDept] = useState('');
  
  // إحصائيات
  const [stats, setStats] = useState({
    total: 0,
    withManagers: 0,
    withoutManagers: 0,
    totalEmployees: 0
  });
  
  // ==========================================
  // جلب البيانات
  // ==========================================
  
  useEffect(() => {
    const unsubscribeDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const fetchedDepts: Department[] = [];
      snapshot.forEach((doc) => {
        fetchedDepts.push({ id: doc.id, ...doc.data() } as Department);
      });
      fetchedDepts.sort((a, b) => a.name.localeCompare(b.name));
      setDepartments(fetchedDepts);
      
      // تحديث الإحصائيات
      const total = fetchedDepts.length;
      const withManagers = fetchedDepts.filter(d => d.managerUid).length;
      const withoutManagers = total - withManagers;
      setStats(prev => ({ ...prev, total, withManagers, withoutManagers }));
      setLoading(false);
    });
    
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(fetchedUsers);
      
      const totalEmployees = fetchedUsers.filter(u => u.isActive).length;
      setStats(prev => ({ ...prev, totalEmployees }));
    });
    
    return () => {
      unsubscribeDepts();
      unsubscribeUsers();
    };
  }, []);
  
  // ==========================================
  // فلترة الإدارات
  // ==========================================
  
  const filteredDepartments = departments.filter(dept => {
    if (searchQuery && !dept.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  // ==========================================
  // الحصول على مدير الإدارة
  // ==========================================
  
  const getDepartmentManager = (dept: Department) => {
    if (!dept.managerUid) return null;
    return users.find(u => u.uid === dept.managerUid);
  };
  
  const getEmployeeCount = (deptName: string) => {
    return users.filter(u => u.department === deptName && u.isActive).length;
  };
  
  // ==========================================
  // عمليات الإدارات
  // ==========================================
  
  const handleAddDepartment = async () => {
    if (!formName) {
      toast.error('يرجى إدخال اسم الإدارة');
      return;
    }
    
    try {
      const newDept: Department = {
        name: formName,
        managerUid: null,
        description: formDescription || null,
        location: formLocation || null,
        phone: formPhone || null,
        email: formEmail || null,
        budget: formBudget ? parseFloat(formBudget) : null,
        parentDepartment: formParentDept || null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await addDoc(collection(db, 'departments'), newDept);
      toast.success('تم إضافة الإدارة بنجاح');
      resetForm();
      setShowDeptModal(false);
    } catch (error) {
      console.error('Error adding department:', error);
      toast.error('حدث خطأ في إضافة الإدارة');
    }
  };
  
  const handleEditDepartment = async () => {
    if (!editingDept || !formName) {
      toast.error('يرجى إدخال اسم الإدارة');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'departments', editingDept.id), {
        name: formName,
        description: formDescription || null,
        location: formLocation || null,
        phone: formPhone || null,
        email: formEmail || null,
        budget: formBudget ? parseFloat(formBudget) : null,
        parentDepartment: formParentDept || null,
        updatedAt: Date.now()
      });
      
      toast.success('تم تحديث الإدارة بنجاح');
      resetForm();
      setShowDeptModal(false);
      setEditingDept(null);
    } catch (error) {
      console.error('Error editing department:', error);
      toast.error('حدث خطأ في تحديث الإدارة');
    }
  };
  
  const handleDeleteDepartment = async () => {
    if (!deletingDeptId) return;
    
    const dept = departments.find(d => d.id === deletingDeptId);
    if (dept?.name === 'الإدارة العليا') {
      toast.error('لا يمكن حذف الإدارة العليا');
      setShowDeleteConfirm(false);
      return;
    }
    
    const employeesInDept = users.filter(u => u.department === dept?.name && u.isActive);
    if (employeesInDept.length > 0) {
      toast.error(`لا يمكن حذف الإدارة لأن بها ${employeesInDept.length} موظف. قم بنقلهم أولاً.`);
      setShowDeleteConfirm(false);
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'departments', deletingDeptId));
      toast.success('تم حذف الإدارة');
      setShowDeleteConfirm(false);
      setDeletingDeptId(null);
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('حدث خطأ في حذف الإدارة');
    }
  };
  
  const handleSetManager = async () => {
    if (!selectedDeptForManager) return;
    
    try {
      await updateDoc(doc(db, 'departments', selectedDeptForManager.id), {
        managerUid: selectedDeptForManager.managerUid || null,
        updatedAt: Date.now()
      });
      
      toast.success(selectedDeptForManager.managerUid ? 'تم تعيين المدير بنجاح' : 'تم إزالة المدير');
      setShowManagerModal(false);
      setSelectedDeptForManager(null);
    } catch (error) {
      console.error('Error setting manager:', error);
      toast.error('حدث خطأ');
    }
  };
  
  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormDescription(dept.description || '');
    setFormLocation(dept.location || '');
    setFormPhone(dept.phone || '');
    setFormEmail(dept.email || '');
    setFormBudget(dept.budget?.toString() || '');
    setFormParentDept(dept.parentDepartment || '');
    setShowDeptModal(true);
  };
  
  const openAddModal = () => {
    setEditingDept(null);
    resetForm();
    setShowDeptModal(true);
  };
  
  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormLocation('');
    setFormPhone('');
    setFormEmail('');
    setFormBudget('');
    setFormParentDept('');
  };
  
  const openManagerModal = (dept: Department) => {
    setSelectedDeptForManager(dept);
    setShowManagerModal(true);
  };
  
  // ==========================================
  // الحصول على المستخدمين المتاحين للإدارة
  // ==========================================
  
  const getAvailableManagers = () => {
    return users.filter(u => 
      u.isActive && 
      (u.primaryRole === 'manager' || u.primaryRole === 'vp' || u.primaryRole === 'chairman') &&
      u.department === selectedDeptForManager?.name
    );
  };
  
  // ==========================================
  // تصدير البيانات
  // ==========================================
  
  const exportToCSV = () => {
    const data = filteredDepartments.map(dept => {
      const manager = getDepartmentManager(dept);
      const employeeCount = getEmployeeCount(dept.name);
      
      return {
        اسم_الإدارة: dept.name,
        المدير: manager?.name || 'غير محدد',
        عدد_الموظفين: employeeCount,
        الوصف: dept.description || '-',
        الموقع: dept.location || '-',
        الهاتف: dept.phone || '-',
        البريد_الإلكتروني: dept.email || '-',
        تاريخ_الإنشاء: format(dept.createdAt, 'dd/MM/yyyy', { locale: arSA })
      };
    });
    
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
    link.setAttribute('download', `departments_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير البيانات');
  };
  
  // ==========================================
  // التحقق من الصلاحيات
  // ==========================================
  
  if (!isTopManagement) {
    return (
      <div className="text-center py-12">
        <FaBuilding className="text-6xl mx-auto mb-4 text-gray-500" />
        <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p className="text-gray-500">هذه الصفحة مخصصة للإدارة العليا فقط</p>
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
          <h1 className="text-2xl font-bold">إدارة الإدارات</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة هيكل الشركة والأقسام</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <FaPlus className="ml-2" /> إدارة جديدة
        </button>
      </div>
      
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">إجمالي الإدارات</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <FaBuilding className="text-3xl text-brand" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">بها مدير</p>
              <p className="text-2xl font-bold text-green-500">{stats.withManagers}</p>
            </div>
            <FaUserTie className="text-3xl text-green-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">بدون مدير</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.withoutManagers}</p>
            </div>
            <FaUserTie className="text-3xl text-yellow-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">إجمالي الموظفين</p>
              <p className="text-2xl font-bold text-blue-500">{stats.totalEmployees}</p>
            </div>
            <FaUsers className="text-3xl text-blue-500" />
          </div>
        </div>
      </div>
      
      {/* شريط البحث */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن إدارة..."
            className="input pr-9"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={exportToCSV} className="icon-btn" title="تصدير">
            <FaDownload size={14} />
          </button>
          <button onClick={() => window.print()} className="icon-btn" title="طباعة">
            <FaPrint size={14} />
          </button>
        </div>
      </div>
      
      {/* قائمة الإدارات */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map(dept => {
            const manager = getDepartmentManager(dept);
            const employeeCount = getEmployeeCount(dept.name);
            
            return (
              <div key={dept.id} className="card hover:translate-y-0 transition-all">
                {/* رأس البطاقة */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FaBuilding className="text-brand" />
                    <h3 className="font-bold text-lg">{dept.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="p-1.5 rounded hover:bg-hv transition-colors"
                      title="تعديل"
                    >
                      <FaEdit size={14} />
                    </button>
                    {dept.name !== 'الإدارة العليا' && (
                      <button
                        onClick={() => {
                          setDeletingDeptId(dept.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-red-500"
                        title="حذف"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* معلومات المدير */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">المدير:</span>
                    {manager ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--brand-secondary)' }}>
                          {manager.name.charAt(0)}
                        </div>
                        <span>{manager.name}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => openManagerModal(dept)}
                        className="text-xs text-brand-light hover:text-brand transition-colors"
                      >
                        تعيين مدير
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">عدد الموظفين:</span>
                    <span className="font-medium">{employeeCount}</span>
                  </div>
                </div>
                
                {/* معلومات إضافية */}
                {(dept.description || dept.location || dept.phone || dept.email) && (
                  <div className="pt-3 border-t text-xs space-y-1" style={{ borderColor: 'var(--bd)' }}>
                    {dept.description && <p className="text-gray-500">{dept.description}</p>}
                    {dept.location && <p className="text-gray-500">📍 {dept.location}</p>}
                    {dept.phone && <p className="text-gray-500">📞 {dept.phone}</p>}
                    {dept.email && <p className="text-gray-500">✉️ {dept.email}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {filteredDepartments.length === 0 && !loading && (
        <div className="text-center py-12">
          <FaBuilding className="text-5xl mx-auto mb-4 text-gray-500" />
          <p className="text-gray-500">لا توجد إدارات</p>
          <button onClick={openAddModal} className="btn-primary mt-4">
            <FaPlus className="ml-2" /> إضافة إدارة جديدة
          </button>
        </div>
      )}
      
      {/* نافذة إضافة/تعديل إدارة */}
      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-bold">{editingDept ? 'تعديل إدارة' : 'إدارة جديدة'}</h3>
              <button onClick={() => setShowDeptModal(false)} className="icon-btn">
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم الإدارة *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input"
                  placeholder="مثال: التسويق"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="وصف مختصر للإدارة"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">الموقع</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="input"
                  placeholder="موقع الإدارة"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="input"
                    placeholder="رقم الهاتف"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="input"
                    placeholder="example@uexperts.sa"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">الإدارة العليا</label>
                <select
                  value={formParentDept}
                  onChange={(e) => setFormParentDept(e.target.value)}
                  className="input"
                >
                  <option value="">لا يوجد</option>
                  {departments
                    .filter(d => d.name !== formName && d.name !== 'الإدارة العليا')
                    .map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowDeptModal(false)} className="btn-outline">
                إلغاء
              </button>
              <button onClick={editingDept ? handleEditDepartment : handleAddDepartment} className="btn-primary">
                {editingDept ? 'حفظ التغييرات' : 'إضافة الإدارة'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* نافذة تعيين مدير */}
      {showManagerModal && selectedDeptForManager && (
        <div className="modal-overlay" onClick={() => setShowManagerModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-bold">تعيين مدير {selectedDeptForManager.name}</h3>
              <button onClick={() => setShowManagerModal(false)} className="icon-btn">
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اختر المدير</label>
                <select
                  value={selectedDeptForManager.managerUid || ''}
                  onChange={(e) => setSelectedDeptForManager({
                    ...selectedDeptForManager,
                    managerUid: e.target.value || null
                  })}
                  className="input"
                >
                  <option value="">-- غير محدد --</option>
                  {getAvailableManagers().map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.name} - {user.primaryRole === 'manager' ? 'مدير' : user.primaryRole === 'vp' ? 'نائب رئيس' : 'رئيس'}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedDeptForManager.managerUid && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--hv)' }}>
                  <p className="text-gray-500">سيتم منح المستخدم صلاحية إدارة هذه الإدارة</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowManagerModal(false)} className="btn-outline">
                إلغاء
              </button>
              <button onClick={handleSetManager} className="btn-primary">
                <FaCheck className="ml-2" /> تأكيد
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
              <p className="mb-2">هل أنت متأكد من حذف هذه الإدارة؟</p>
              <p className="text-sm text-gray-500 mt-4">لا يمكن التراجع عن هذا الإجراء</p>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline">
                إلغاء
              </button>
              <button onClick={handleDeleteDepartment} className="btn-danger">
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;