// src/pages/NotificationsPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  FaBell, 
  FaCheckDouble, 
  FaTrash, 
  FaTasks, 
  FaVideo, 
  FaComments, 
  FaUserPlus,
  FaShieldAlt,
  FaCalendarAlt,
  FaClock,
  FaCheck,
  FaTimes,
  FaSpinner
} from 'react-icons/fa';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ==========================================
// الأنواع
// ==========================================

interface Notification {
  id: string;
  targetUid: string;
  title: string;
  message: string;
  type: 'task' | 'meeting' | 'chat' | 'approval' | 'system' | 'mention';
  relatedId?: string;
  isRead: boolean;
  createdAt: number;
}

// ==========================================
// صفحة الإشعارات
// ==========================================

export const NotificationsPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // ==========================================
  // جلب الإشعارات
  // ==========================================
  
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'notifications'),
      where('targetUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications: Notification[] = [];
      snapshot.forEach((doc) => {
        fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });
    
    return unsubscribe;
  }, [currentUser]);
  
  // ==========================================
  // تحديد الإشعار كمقروء
  // ==========================================
  
  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // ==========================================
  // تحديد الكل كمقروء
  // ==========================================
  
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length === 0) {
      toast('لا توجد إشعارات غير مقروءة');
      return;
    }
    
    try {
      const promises = unreadNotifications.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { isRead: true })
      );
      await Promise.all(promises);
      toast.success(`تم تحديد ${unreadNotifications.length} إشعار كمقروء`);
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('حدث خطأ');
    }
  };
  
  // ==========================================
  // حذف جميع الإشعارات
  // ==========================================
  
  const deleteAllNotifications = async () => {
    if (!window.confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) return;
    
    try {
      const promises = notifications.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { isDeleted: true })
      );
      await Promise.all(promises);
      toast.success('تم حذف جميع الإشعارات');
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('حدث خطأ');
    }
  };
  
  // ==========================================
  // الحصول على أيقونة الإشعار
  // ==========================================
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <FaTasks className="text-blue-500" />;
      case 'meeting':
        return <FaVideo className="text-purple-500" />;
      case 'chat':
        return <FaComments className="text-green-500" />;
      case 'approval':
        return <FaUserPlus className="text-yellow-500" />;
      case 'mention':
        return <FaShieldAlt className="text-orange-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };
  
  // ==========================================
  // تنسيق الوقت
  // ==========================================
  
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ساعة`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} يوم`;
    
    return format(timestamp, 'dd MMM yyyy', { locale: arSA });
  };
  
  // ==========================================
  // فلترة الإشعارات
  // ==========================================
  
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'read' && !notification.isRead) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });
  
  // ==========================================
  // إحصائيات
  // ==========================================
  
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    read: notifications.filter(n => n.isRead).length,
    task: notifications.filter(n => n.type === 'task').length,
    meeting: notifications.filter(n => n.type === 'meeting').length,
    chat: notifications.filter(n => n.type === 'chat').length,
    approval: notifications.filter(n => n.type === 'approval').length
  };
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* الرأس والإحصائيات */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          <p className="text-gray-500 text-sm mt-1">آخر التحديثات والتنبيهات</p>
        </div>
        <div className="flex gap-2">
          {stats.unread > 0 && (
            <button onClick={markAllAsRead} className="btn-secondary">
              <FaCheckDouble className="ml-2" /> تحديد الكل كمقروء
            </button>
          )}
          <button onClick={deleteAllNotifications} className="btn-danger">
            <FaTrash className="ml-2" /> حذف الكل
          </button>
        </div>
      </div>
      
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilter('all')}>
          <p className="text-xs text-gray-500">الإجمالي</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilter('unread')}>
          <p className="text-xs text-gray-500">غير مقروءة</p>
          <p className="text-2xl font-bold text-brand">{stats.unread}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilter('read')}>
          <p className="text-xs text-gray-500">مقروءة</p>
          <p className="text-2xl font-bold text-green-500">{stats.read}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setTypeFilter('task')}>
          <p className="text-xs text-gray-500">مهام</p>
          <p className="text-2xl font-bold text-blue-500">{stats.task}</p>
        </div>
      </div>
      
      {/* فلاتر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === 'all' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === 'unread' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
          >
            غير مقروءة
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === 'read' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
          >
            مقروءة
          </button>
        </div>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input text-sm py-1.5 w-40"
        >
          <option value="all">جميع الأنواع</option>
          <option value="task">المهام</option>
          <option value="meeting">الاجتماعات</option>
          <option value="chat">المحادثات</option>
          <option value="approval">الطلبات</option>
          <option value="mention">الإشارات</option>
          <option value="system">النظام</option>
        </select>
      </div>
      
      {/* قائمة الإشعارات */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="card text-center py-12">
          <FaBell className="text-5xl mx-auto mb-4 text-gray-500" />
          <p className="text-gray-500">لا توجد إشعارات</p>
          <p className="text-xs text-gray-500 mt-1">ستظهر هنا جميع التنبيهات والتحديثات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={`card p-4 cursor-pointer transition-all hover:translate-y-0 ${!notification.isRead ? 'border-r-4 border-brand' : 'opacity-70'}`}
            >
              <div className="flex items-start gap-4">
                {/* الأيقونة */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--hv)' }}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                {/* المحتوى */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{notification.title}</h4>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{notification.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FaClock size={10} />
                      {formatTime(notification.createdAt)}
                    </span>
                    <span className="badge">{notification.type === 'task' ? 'مهمة' : notification.type === 'meeting' ? 'اجتماع' : notification.type === 'chat' ? 'محادثة' : notification.type === 'approval' ? 'طلب' : 'نظام'}</span>
                  </div>
                </div>
                
                {/* زر الإجراء */}
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    className="p-2 rounded hover:bg-green-500/10 text-green-500 transition-colors"
                    title="تحديد كمقروء"
                  >
                    <FaCheck size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;