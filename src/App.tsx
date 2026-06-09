import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Layout } from './components/Layout';
import { CalendarPage } from './pages/CalendarPage';
import { TasksPage } from './pages/TasksPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { ChatPage } from './pages/ChatPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { FaClock, FaSignOutAlt } from 'react-icons/fa';
import { auth } from './config/firebase';

export const App: React.FC = () => {
  const { currentUser, userProfile, loading, isPending } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white">جاري الفحص الأمني والتحميل...</div>;
  }

  // إذا كان الحساب معلقاً قيد مراجعة الإدارة العليا
  if (currentUser && isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a] text-white" dir="rtl">
        <div className="text-center p-6 bg-[#151515] border border-[#1f1f1f] rounded-xl max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-[#8B1A1A]/10 text-[#A52A2A]">
            <FaClock className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold mb-3">طلبك قيد المراجعة</h2>
          <p className="text-gray-400 text-sm">سيتم مراجعة طلبك من المدير ثم رئيس مجلس الإدارة</p>
          <button 
            onClick={() => auth.signOut()} 
            className="mt-6 px-6 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-gray-300 hover:bg-[#8B1A1A]/10 flex items-center gap-2 mx-auto"
          >
            <FaSignOutAlt /> تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <AuthPage />} />
        
        <Route path="/" element={currentUser ? <Layout /> : <Navigate to="/login" />}>
          <Route path="dashboard" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          
          {/* حماية لوحة التحكم: يراها فقط رئيس مجلس الإدارة والنائب */}
          <Route 
            path="admin" 
            element={userProfile && (userProfile.primaryRole === 'chairman' || userProfile.primaryRole === 'vp') ? <AdminDashboard /> : <Navigate to="/dashboard" />} 
          />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;