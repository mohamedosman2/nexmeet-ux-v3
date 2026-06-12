// src/pages/DashboardPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { 
  FaTasks, 
  FaCalendarCheck, 
  FaUsers, 
  FaBell,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaBuilding
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

// ==========================================
// أنواع البيانات
// ==========================================

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalMeetings: number;
  upcomingMeetings: number;
  unreadNotifications: number;
  totalUsers: number;
  completionRate: number;
}

interface UpcomingTask {
  id: string;
  title: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
}

interface UpcomingMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'online' | 'offline';
}

// ==========================================
// بطاقة الإحصاءات
// ==========================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, link }) => {
  const CardContent = () => (
    <div className="card hover:translate-y-0 cursor-pointer transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{value.toLocaleString()}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
              <span>{Math.abs(trend)}% عن الشهر الماضي</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${color}20`, color: color }}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link}>
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
};

// ==========================================
// عنصر المهمة القادمة
// ==========================================

const UpcomingTaskItem: React.FC<{ task: UpcomingTask }> = ({ task }) => {
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high': return 'var(--priority-high)';
      case 'medium': return 'var(--priority-medium)';
      default: return 'var(--priority-low)';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg transition-all hover:bg-hv">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full" style={{ background: getPriorityColor() }} />
        <div>
          <p className="text-sm font-medium">{task.title}</p>
          <p className="text-xs text-gray-500">{task.date}</p>
        </div>
      </div>
      <Link 
        to={`/tasks?task=${task.id}`}
        className="text-xs text-brand-light hover:text-brand transition-colors"
      >
        عرض
      </Link>
    </div>
  );
};

// ==========================================
// عنصر الاجتماع القادم
// ==========================================

const UpcomingMeetingItem: React.FC<{ meeting: UpcomingMeeting }> = ({ meeting }) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg transition-all hover:bg-hv">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${meeting.type === 'online' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
          {meeting.type === 'online' ? '🌐' : '📍'}
        </div>
        <div>
          <p className="text-sm font-medium">{meeting.title}</p>
          <p className="text-xs text-gray-500">{meeting.date} - {meeting.time}</p>
        </div>
      </div>
      <Link 
        to={`/meetings?meeting=${meeting.id}`}
        className="text-xs text-brand-light hover:text-brand transition-colors"
      >
        عرض
      </Link>
    </div>
  );
};

// ==========================================
// الصفحة الرئيسية
// ==========================================

export const DashboardPage: React.FC = () => {
  const { userProfile, unreadNotificationsCount } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    totalMeetings: 0,
    upcomingMeetings: 0,
    unreadNotifications: 0,
    totalUsers: 0,
    completionRate: 0
  });
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  // تحديد التحية حسب الوقت
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('صباح الخير');
    else if (hour < 18) setGreeting('مساء الخير');
    else setGreeting('مساء الخير');
  }, []);

  // جلب الإحصائيات
  useEffect(() => {
    if (!userProfile) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      
      try {
        // جلب المهام
        const tasksQuery = query(collection(db, 'tasks'));
        const tasksSnapshot = await getDocs(tasksQuery);
        const allTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const today = new Date().toISOString().split('T')[0];
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter((t: any) => t.status === 'done').length;
        const pendingTasks = allTasks.filter((t: any) => t.status !== 'done').length;
        const overdueTasks = allTasks.filter((t: any) => t.date < today && t.status !== 'done').length;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        // جلب الاجتماعات القادمة
        const meetingsQuery = query(collection(db, 'meetings'));
        const meetingsSnapshot = await getDocs(meetingsQuery);
        const allMeetings = meetingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalMeetings = allMeetings.length;
        const upcomingMeetings = allMeetings.filter((m: any) => m.date >= today).length;
        
        // جلب المستخدمين
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnapshot.size;
        
        setStats({
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
          totalMeetings,
          upcomingMeetings,
          unreadNotifications: unreadNotificationsCount,
          totalUsers,
          completionRate
        });
        
        // جلب المهام القادمة (أقرب 5 مهام)
        const upcomingTasksList = allTasks
          .filter((t: any) => t.date >= today && t.status !== 'done')
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
          .slice(0, 5)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            date: t.date,
            priority: t.priority,
            status: t.status
          }));
        setUpcomingTasks(upcomingTasksList);
        
        // جلب الاجتماعات القادمة (أقرب 5 اجتماعات)
        const upcomingMeetingsList = allMeetings
          .filter((m: any) => m.date >= today)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
          .slice(0, 5)
          .map((m: any) => ({
            id: m.id,
            title: m.title,
            date: m.date,
            time: m.time,
            type: m.type
          }));
        setUpcomingMeetings(upcomingMeetingsList);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [userProfile, unreadNotificationsCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* الترحيب */}
      <div className="card-gradient">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}، {userProfile?.name || 'مستخدم'}!
            </h1>
            <p className="text-gray-500 mt-1">
              مرحباً بعودتك. إليك ملخص نشاطك اليوم
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--hv)' }}>
              <FaCalendarCheck className="text-brand" />
              <span className="text-sm">
                {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المهام"
          value={stats.totalTasks}
          icon={<FaTasks size={24} />}
          color="#3B82F6"
          trend={12}
          link="/tasks"
        />
        <StatCard
          title="المهام المكتملة"
          value={stats.completedTasks}
          icon={<FaCheckCircle size={24} />}
          color="#22C55E"
          trend={8}
          link="/tasks"
        />
        <StatCard
          title="المهام المتأخرة"
          value={stats.overdueTasks}
          icon={<FaExclamationTriangle size={24} />}
          color="#EF4444"
          trend={-5}
          link="/tasks"
        />
        <StatCard
          title="نسبة الإنجاز"
          value={Math.round(stats.completionRate)}
          icon={<FaChartLine size={24} />}
          color="#F59E0B"
          link="/tasks"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المهام القادمة */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FaClock className="text-brand" />
              المهام القادمة
            </h3>
            <Link to="/tasks" className="text-sm text-brand-light hover:text-brand transition-colors">
              عرض الكل
            </Link>
          </div>
          
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>لا توجد مهام قادمة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <UpcomingTaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
        
        {/* الاجتماعات القادمة */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FaCalendarCheck className="text-brand" />
              الاجتماعات القادمة
            </h3>
            <Link to="/meetings" className="text-sm text-brand-light hover:text-brand transition-colors">
              عرض الكل
            </Link>
          </div>
          
          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>لا توجد اجتماعات قادمة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <UpcomingMeetingItem key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* إحصائيات إضافية */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">إجمالي المستخدمين</p>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#8B1A1A20', color: '#8B1A1A' }}>
            <FaUsers size={20} />
          </div>
        </div>
        
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">إجمالي الاجتماعات</p>
            <p className="text-2xl font-bold">{stats.totalMeetings}</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#3B82F620', color: '#3B82F6' }}>
            <FaCalendarCheck size={20} />
          </div>
        </div>
        
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">الإشعارات غير المقروءة</p>
            <p className="text-2xl font-bold">{stats.unreadNotifications}</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F59E0B20', color: '#F59E0B' }}>
            <FaBell size={20} />
          </div>
        </div>
      </div>
      
      {/* شريط التقدم لإنجاز المهام */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">نسبة إنجاز المهام</h3>
          <span className="text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
            {Math.round(stats.completionRate)}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${stats.completionRate}%`, background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-primary-light))' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{stats.completedTasks} مكتملة</span>
          <span>{stats.pendingTasks} متبقية</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;