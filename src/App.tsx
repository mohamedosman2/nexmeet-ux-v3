// ==========================================
// ملف الموجه الرئيسي للتطبيق (App Router)
// ==========================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Layout } from './components/Layout';
// سيتم إنشاء هذه الصفحات لاحقاً
import { CalendarPage } from './pages/CalendarPage';
import { TasksPage } from './pages/TasksPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { ChatPage } from './pages/ChatPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { auth } from './config/firebase';

// مكون إضافي لعرض شاشة "قيد المراجعة" بناءً على طلبك
const PendingScreen: React.FC = () => {
  return (
    <div style={{ background: 'var(--lg)' }} className="fixed inset-0 z-50 flex items-center justify-center font-cairo" dir="rtl">
      <div className="text-center fi">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,26,26,.15)' }}>
          <i className="fas fa-clock text-3xl" style={{ color: '#A52A2A' }}></i>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white">طلبك قيد المراجعة</h2>
        <p style={{ color: 'var(--tx2)' }} className="max-w-md">سيتم مراجعة طلبك من المدير ثم رئيس مجلس الإدارة</p>
        <button 
          onClick={() => auth.signOut()}
          className="mt-6 px-6 py-2 rounded-lg cursor-pointer text-white hover:bg-[#A52A2A] transition-colors"
          style={{ background: 'var(--hv)', border: '1px solid var(--bd)' }}
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { currentUser, userProfile, loading, isPending } = useAuth();

  // شاشة التحميل أثناء التحقق من بيانات الفايربيز
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-cairo text-white" style={{ background: 'var(--bg)' }}>
        <i className="fas fa-spinner fa-spin text-3xl mb-4" style={{ color: '#8B1A1A' }}></i>
        <span className="mr-3">جاري التحميل...</span>
      </div>
    );
  }

  // إذا كان المستخدم مسجلاً ولكن حسابه قيد المراجعة (مع استثناء بريد المطور)
  if (currentUser && isPending && currentUser.email !== 'm.othman@uexperts.sa') {
    return <PendingScreen />;
  }

  // السماح بالدخول إذا كان الحساب مفعلاً أو كان حساب المطور المصلح
  const isAllowed = currentUser && (userProfile?.isActive || currentUser.email === 'm.othman@uexperts.sa');
  
  // صلاحيات دخول لوحة الإدارة العليا
  const isAdmin = userProfile && (userProfile.primaryRole === 'chairman' || userProfile.primaryRole === 'vp' || currentUser?.email === 'm.othman@uexperts.sa');

  return (
    <Router>
      <Routes>
        {/* صفحة الدخول والتسجيل */}
        <Route path="/login" element={isAllowed ? <Navigate to="/dashboard" /> : <AuthPage />} />
        
        {/* مسارات النظام المحمية */}
        <Route path="/" element={isAllowed ? <Layout /> : <Navigate to="/login" />}>
          {/* توجيه المسار الرئيسي إلى التقويم */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="dashboard" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          
          {/* صفحة الإشعارات */}
          <Route path="notifications" element={<div className="p-6 text-center text-gray-500">جاري بناء صفحة الإشعارات...</div>} />
          
          {/* لوحة التحكم المحمية - فقط للرئيس والنائب والمطور */}
          <Route 
            path="admin" 
            element={isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />} 
          />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;