import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

// ==========================================
// تحميل كسول (Lazy Loading) للصفحات لتحسين الأداء
// ==========================================

const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const Layout = lazy(() => import('./components/Layout').then(module => ({ default: module.Layout })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(module => ({ default: module.CalendarPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(module => ({ default: module.TasksPage })));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage').then(module => ({ default: module.MeetingsPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then(module => ({ default: module.ChatPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage').then(module => ({ default: module.DepartmentsPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then(module => ({ default: module.UsersPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(module => ({ default: module.ReportsPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then(module => ({ default: module.HelpPage })));
const SuggestionsPage = lazy(() => import('./pages/SuggestionsPage').then(module => ({ default: module.SuggestionsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));

// ==========================================
// شاشة التحميل (Loading Screen)
// ==========================================

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-brand/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-brand border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 rounded-full border-4 border-secondary border-b-transparent animate-spin-slow"></div>
        </div>
        <p className="text-white text-sm font-medium animate-pulse">جاري التحميل...</p>
        <p className="text-gray-500 text-xs mt-2">نظام إدارة المهام والتقويم المتكامل</p>
      </div>
    </div>
  );
};

// ==========================================
// شاشة "قيد المراجعة" للحسابات غير المفعلة
// ==========================================

const PendingApprovalScreen: React.FC = () => {
  const { logout, userProfile } = useAuth();
  
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--lg)' }}>
      {/* الخلفيات المتحركة */}
      <div className="floating-shape" style={{ width: '300px', height: '300px', background: '#8B1A1A', top: '10%', right: '10%' }}></div>
      <div className="floating-shape" style={{ width: '200px', height: '200px', background: '#1E3A6E', bottom: '15%', left: '15%' }}></div>
      <div className="floating-shape" style={{ width: '250px', height: '250px', background: '#A52A2A', top: '40%', left: '40%', opacity: '0.05' }}></div>
      
      <div className="text-center max-w-md mx-4 animate-fadeIn">
        {/* أيقونة الساعة */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 26, 26, 0.15)' }}>
          <svg className="w-12 h-12 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        {/* النص الترحيبي */}
        <h2 className="text-2xl font-bold mb-3 text-white">مرحباً بك في شركة UX</h2>
        <p className="text-gray-400 mb-2">طلب انضمامك قيد المراجعة من قبل الإدارة</p>
        
        <div className="bg-brand/10 rounded-lg p-4 mb-6 border border-brand/20">
          <p className="text-sm text-gray-300">
            سيتم مراجعة طلبك من <span className="text-brand-light font-semibold">مدير الإدارة</span> ثم 
            <span className="text-brand-light font-semibold"> رئيس مجلس الإدارة</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">سيتم إشعارك عبر البريد الإلكتروني عند الموافقة</p>
        </div>
        
        {/* معلومات المستخدم */}
        {userProfile && (
          <div className="bg-dark-bg2 rounded-lg p-3 mb-6 text-right">
            <p className="text-sm text-white"><span className="text-gray-500">الاسم:</span> {userProfile.name}</p>
            <p className="text-sm text-white"><span className="text-gray-500">البريد:</span> {userProfile.email}</p>
            <p className="text-sm text-white"><span className="text-gray-500">الإدارة:</span> {userProfile.department}</p>
          </div>
        )}
        
        {/* زر تسجيل الخروج */}
        <button 
          onClick={logout}
          className="px-6 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-brand/20 border border-brand/30 text-brand-light hover:text-white"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

// ==========================================
// شاشة "غير مصرح بالدخول" (403 Forbidden)
// ==========================================

const ForbiddenScreen: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center animate-fadeIn">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-red-500/10">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-white">غير مصرح بالدخول</h2>
        <p className="text-gray-400 mb-6">ليس لديك الصلاحية الكافية للوصول إلى هذه الصفحة</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
        >
          العودة إلى لوحة التحكم
        </button>
      </div>
    </div>
  );
};

// ==========================================
// شاشة الصيانة (Maintenance Mode)
// ==========================================

const MaintenanceScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center animate-fadeIn">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-yellow-500/10">
          <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-white">الصيانة الدورية</h2>
        <p className="text-gray-400">النظام قيد الصيانة حالياً، يرجى المحاولة لاحقاً</p>
        <p className="text-xs text-gray-500 mt-4">نعتذر عن أي إزعاج</p>
      </div>
    </div>
  );
};

// ==========================================
// مكون حماية المسارات (Protected Route)
// ==========================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('chairman' | 'vp' | 'manager' | 'employee')[];
  requiredPermissions?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [], 
  requiredPermissions = [] 
}) => {
  const { currentUser, userProfile, loading, isPending, canAccessAdminPanel, isTopManagement } = useAuth();
  const location = useLocation();

  // أثناء التحميل
  if (loading) {
    return <LoadingScreen />;
  }

  // إذا لم يكن هناك مستخدم مسجل الدخول
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // إذا كان الحساب قيد المراجعة
  if (isPending) {
    return <PendingApprovalScreen />;
  }

  // التحقق من الأدوار المطلوبة
  if (requiredRoles.length > 0 && userProfile) {
    const hasRequiredRole = requiredRoles.includes(userProfile.primaryRole);
    if (!hasRequiredRole && !isTopManagement) {
      return <ForbiddenScreen />;
    }
  }

  // التحقق من الصلاحيات المطلوبة
  if (requiredPermissions.includes('admin') && !canAccessAdminPanel) {
    return <ForbiddenScreen />;
  }

  return <>{children}</>;
};

// ==========================================
// المكون الرئيسي للتطبيق (App)
// ==========================================

export const App: React.FC = () => {
  const { currentUser, loading, refreshUserProfile } = useAuth();

  // تحديث بيانات المستخدم بشكل دوري (كل 5 دقائق)
  useEffect(() => {
    if (!currentUser) return;
    
    const interval = setInterval(() => {
      refreshUserProfile();
    }, 5 * 60 * 1000); // 5 دقائق
    
    return () => clearInterval(interval);
  }, [currentUser, refreshUserProfile]);

  // التحقق من وضع الصيانة (يمكن تفعيله من متغيرات البيئة)
  const isMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  
  if (isMaintenance) {
    return <MaintenanceScreen />;
  }

  return (
    <Router>
      {/* إعدادات الإشعارات المنبثقة (Toast) */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg3)',
            color: 'var(--tx)',
            border: '1px solid var(--bd)',
            borderRadius: '12px',
            fontFamily: 'Cairo, sans-serif',
          },
          success: {
            iconTheme: {
              primary: '#22C55E',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: 'white',
            },
          },
        }}
      />
      
      {/* تأخير تحميل الصفحات حتى يتم تجهيزها */}
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          
          {/* ==========================================
               صفحة المصادقة (تسجيل الدخول والتسجيل)
          ========================================== */}
          
          <Route 
            path="/login" 
            element={currentUser && !loading ? <Navigate to="/dashboard" replace /> : <AuthPage />} 
          />
          
          {/* ==========================================
               المسارات المحمية (Protected Routes)
          ========================================== */}
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* التوجيه الافتراضي - الذهاب إلى لوحة التحكم */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* ==========================================
                 الصفحات الأساسية لجميع المستخدمين
            ========================================== */}
            
            {/* صفحة التقويم / لوحة التحكم الرئيسية */}
            <Route path="dashboard" element={<CalendarPage />} />
            <Route path="calendar" element={<Navigate to="/dashboard" replace />} />
            
            {/* صفحة المهام */}
            <Route path="tasks" element={<TasksPage />} />
            
            {/* صفحة الاجتماعات */}
            <Route path="meetings" element={<MeetingsPage />} />
            
            {/* صفحة المحادثات */}
            <Route path="chat" element={<ChatPage />} />
            
            {/* صفحة الإشعارات */}
            <Route path="notifications" element={<NotificationsPage />} />
            
            {/* صفحة الملف الشخصي */}
            <Route path="profile" element={<ProfilePage />} />
            
            {/* ==========================================
                 صفحات المساعدة والدعم الفني
            ========================================== */}
            
            {/* صفحة مركز المساعدة */}
            <Route path="help" element={<HelpPage />} />
            
            {/* صفحة الاقتراحات والشكاوى */}
            <Route path="suggestions" element={<SuggestionsPage />} />
            
            {/* صفحة الإعدادات */}
            <Route path="settings" element={<SettingsPage />} />
            
            {/* ==========================================
                 صفحات الإدارة (للمديرين والإدارة العليا فقط)
            ========================================== */}
            
            {/* لوحة التحكم الإدارية */}
            <Route 
              path="admin" 
              element={
                <ProtectedRoute requiredPermissions={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* صفحة إدارة المستخدمين */}
            <Route 
              path="users" 
              element={
                <ProtectedRoute requiredPermissions={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              } 
            />
            
            {/* صفحة إدارة الإدارات */}
            <Route 
              path="departments" 
              element={
                <ProtectedRoute requiredPermissions={['admin']}>
                  <DepartmentsPage />
                </ProtectedRoute>
              } 
            />
            
            {/* صفحة التقارير والإحصائيات */}
            <Route 
              path="reports" 
              element={
                <ProtectedRoute requiredPermissions={['admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              } 
            />
            
          </Route>
          
          {/* ==========================================
               صفحة 404 - الصفحة غير موجودة
          ========================================== */}
          
          <Route 
            path="*" 
            element={
              <div className="fixed inset-0 flex items-center justifyContent" style={{ background: 'var(--bg)' }}>
                <div className="text-center animate-fadeIn">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-brand/10">
                    <span className="text-4xl font-bold text-brand">404</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-white">الصفحة غير موجودة</h2>
                  <p className="text-gray-400 mb-6">عذراً، الصفحة التي تبحث عنها غير متاحة</p>
                  <button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="btn-primary"
                  >
                    العودة إلى لوحة التحكم
                  </button>
                </div>
              </div>
            } 
          />
          
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;