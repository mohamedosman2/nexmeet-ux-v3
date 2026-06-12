// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ==========================================
// الأنواع
// ==========================================

export interface Notification {
  id: string;
  targetUid: string;
  title: string;
  message: string;
  type: 'task' | 'meeting' | 'chat' | 'approval' | 'system' | 'mention';
  relatedId?: string;
  isRead: boolean;
  createdAt: number;
  image?: string;
  actionUrl?: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskReminders: boolean;
  meetingReminders: boolean;
  mentionNotifications: boolean;
  approvalNotifications: boolean;
  systemNotifications: boolean;
}

// ==========================================
// Hook رئيسي للإشعارات
// ==========================================

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    meetingReminders: true,
    mentionNotifications: true,
    approvalNotifications: true,
    systemNotifications: true
  });
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // جلب إعدادات الإشعارات
  useEffect(() => {
    if (!userId) return;
    
    const fetchPreferences = async () => {
      try {
        const prefsRef = doc(db, 'notificationPreferences', userId);
        const prefsDoc = await getDoc(prefsRef);
        if (prefsDoc.exists()) {
          setPreferences(prefsDoc.data() as NotificationPreferences);
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      }
    };
    
    fetchPreferences();
  }, [userId]);
  
  // الاستماع للإشعارات في الوقت الفعلي
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'notifications'),
      where('targetUid', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const fetchedNotifications: Notification[] = [];
      snapshot.forEach((doc) => {
        fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
      setLoading(false);
    }, (error) => {
      console.error('Error in notifications listener:', error);
      setLoading(false);
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);
  
  // تحديد إشعار كمقروء
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);
  
  // تحديد الكل كمقروء
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unreadNotifications.forEach(notification => {
        const ref = doc(db, 'notifications', notification.id);
        batch.update(ref, { isRead: true });
      });
      await batch.commit();
      setUnreadCount(0);
      toast.success('تم تحديد جميع الإشعارات كمقروءة');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('حدث خطأ');
    }
  }, [notifications]);
  
  // حذف إشعار
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { isDeleted: true });
      toast.success('تم حذف الإشعار');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('حدث خطأ في حذف الإشعار');
    }
  }, []);
  
  // حذف جميع الإشعارات
  const deleteAllNotifications = useCallback(async () => {
    if (!window.confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) return;
    
    try {
      const batch = writeBatch(db);
      notifications.forEach(notification => {
        const ref = doc(db, 'notifications', notification.id);
        batch.update(ref, { isDeleted: true });
      });
      await batch.commit();
      toast.success('تم حذف جميع الإشعارات');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      toast.error('حدث خطأ');
    }
  }, [notifications]);
  
  // إنشاء إشعار جديد
  const createNotification = useCallback(async (
    targetUid: string,
    title: string,
    message: string,
    type: Notification['type'],
    relatedId?: string,
    actionUrl?: string
  ) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        targetUid,
        title,
        message,
        type,
        relatedId,
        actionUrl,
        isRead: false,
        createdAt: Date.now()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, []);
  
  // إرسال إشعار لمجموعة من المستخدمين
  const notifyUsers = useCallback(async (
    userIds: string[],
    title: string,
    message: string,
    type: Notification['type'],
    relatedId?: string,
    actionUrl?: string
  ) => {
    try {
      const batch = writeBatch(db);
      
      userIds.forEach(uid => {
        const ref = doc(collection(db, 'notifications'));
        batch.set(ref, {
          targetUid: uid,
          title,
          message,
          type,
          relatedId,
          actionUrl,
          isRead: false,
          createdAt: Date.now()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error notifying users:', error);
    }
  }, []);
  
  // تحديث إعدادات الإشعارات
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!userId) return;
    
    try {
      const prefsRef = doc(db, 'notificationPreferences', userId);
      await updateDoc(prefsRef, newPreferences);
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      toast.success('تم تحديث إعدادات الإشعارات');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('حدث خطأ في تحديث الإعدادات');
    }
  }, [userId]);
  
  // إرسال إشعار بريد إلكتروني
  const sendEmailNotification = useCallback(async (
    email: string,
    name: string,
    title: string,
    message: string,
    actionUrl?: string
  ) => {
    if (!preferences.emailNotifications) return;
    
    // يمكن ربط هذا بخدمة البريد الإلكتروني
    console.log(`📧 Sending email to ${email}: ${title}`);
  }, [preferences.emailNotifications]);
  
  // إرسال إشعار فوري (Push Notification)
  const sendPushNotification = useCallback(async (
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ) => {
    if (!preferences.pushNotifications) return;
    
    // يمكن ربط هذا بـ Firebase Cloud Messaging
    console.log(`📱 Sending push notification to ${userId}: ${title}`);
  }, [preferences.pushNotifications]);
  
  // إشعار بمهمة جديدة
  const notifyTaskAssigned = useCallback(async (
    assigneeId: string,
    assigneeName: string,
    assigneeEmail: string,
    taskTitle: string,
    taskId: string
  ) => {
    if (preferences.taskReminders) {
      await createNotification(
        assigneeId,
        'مهمة جديدة',
        `تم تعيين مهمة "${taskTitle}" إليك`,
        'task',
        taskId,
        `/tasks?task=${taskId}`
      );
      
      await sendEmailNotification(
        assigneeEmail,
        assigneeName,
        'مهمة جديدة',
        `تم تعيين مهمة "${taskTitle}" إليك`,
        `/tasks?task=${taskId}`
      );
    }
  }, [createNotification, sendEmailNotification, preferences.taskReminders]);
  
  // إشعار بدعوة اجتماع
  const notifyMeetingInvite = useCallback(async (
    attendeeId: string,
    attendeeName: string,
    attendeeEmail: string,
    meetingTitle: string,
    meetingId: string
  ) => {
    if (preferences.meetingReminders) {
      await createNotification(
        attendeeId,
        'دعوة اجتماع',
        `تمت دعوتك لحضور اجتماع "${meetingTitle}"`,
        'meeting',
        meetingId,
        `/meetings?meeting=${meetingId}`
      );
      
      await sendEmailNotification(
        attendeeEmail,
        attendeeName,
        'دعوة اجتماع',
        `تمت دعوتك لحضور اجتماع "${meetingTitle}"`,
        `/meetings?meeting=${meetingId}`
      );
    }
  }, [createNotification, sendEmailNotification, preferences.meetingReminders]);
  
  // إشعار بإشارة (Mention)
  const notifyMention = useCallback(async (
    mentionedId: string,
    mentionedName: string,
    mentionedEmail: string,
    mentionerName: string,
    context: string,
    contextId: string,
    contextType: 'task' | 'meeting'
  ) => {
    if (preferences.mentionNotifications) {
      await createNotification(
        mentionedId,
        `إشارة من ${mentionerName}`,
        `أشار إليك ${mentionerName} في ${context}`,
        'mention',
        contextId,
        `/${contextType}s?${contextType}=${contextId}`
      );
      
      await sendEmailNotification(
        mentionedEmail,
        mentionedName,
        `إشارة من ${mentionerName}`,
        `أشار إليك ${mentionerName} في ${context}`,
        `/${contextType}s?${contextType}=${contextId}`
      );
    }
  }, [createNotification, sendEmailNotification, preferences.mentionNotifications]);
  
  // إشعار بطلب موافقة
  const notifyApprovalRequest = useCallback(async (
    approverId: string,
    approverName: string,
    approverEmail: string,
    requesterName: string,
    department: string,
    requestId: string
  ) => {
    if (preferences.approvalNotifications) {
      await createNotification(
        approverId,
        'طلب انضمام جديد',
        `${requesterName} يطلب الانضمام إلى ${department}`,
        'approval',
        requestId,
        `/admin?tab=approvals`
      );
      
      await sendEmailNotification(
        approverEmail,
        approverName,
        'طلب انضمام جديد',
        `${requesterName} يطلب الانضمام إلى ${department}`,
        `/admin?tab=approvals`
      );
    }
  }, [createNotification, sendEmailNotification, preferences.approvalNotifications]);
  
  // إشعار بنتيجة الموافقة
  const notifyApprovalResult = useCallback(async (
    applicantId: string,
    applicantName: string,
    applicantEmail: string,
    status: 'approved' | 'rejected',
    department: string
  ) => {
    const title = status === 'approved' ? 'تم قبول طلبك' : 'تم رفض طلبك';
    const message = status === 'approved' 
      ? `تم قبول طلب انضمامك إلى ${department}. يمكنك الآن تسجيل الدخول`
      : `نأسف لإبلاغك بأن طلب انضمامك إلى ${department} لم يتم الموافقة عليه`;
    
    await createNotification(
      applicantId,
      title,
      message,
      'approval',
      undefined,
      status === 'approved' ? '/login' : undefined
    );
    
    await sendEmailNotification(
      applicantEmail,
      applicantName,
      title,
      message,
      status === 'approved' ? '/login' : undefined
    );
  }, [createNotification, sendEmailNotification]);
  
  // إشعار نظام
  const notifySystem = useCallback(async (
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ) => {
    if (preferences.systemNotifications) {
      await createNotification(
        userId,
        title,
        message,
        'system',
        undefined,
        actionUrl
      );
    }
  }, [createNotification, preferences.systemNotifications]);
  
  // الحصول على إحصائيات الإشعارات
  const getStats = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayNotifications = notifications.filter(n => n.createdAt >= today.getTime());
    const weekNotifications = notifications.filter(n => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return n.createdAt >= weekAgo;
    });
    
    return {
      total: notifications.length,
      unread: unreadCount,
      read: notifications.length - unreadCount,
      today: todayNotifications.length,
      thisWeek: weekNotifications.length,
      byType: {
        task: notifications.filter(n => n.type === 'task').length,
        meeting: notifications.filter(n => n.type === 'meeting').length,
        chat: notifications.filter(n => n.type === 'chat').length,
        approval: notifications.filter(n => n.type === 'approval').length,
        mention: notifications.filter(n => n.type === 'mention').length,
        system: notifications.filter(n => n.type === 'system').length
      }
    };
  }, [notifications, unreadCount]);
  
  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    createNotification,
    notifyUsers,
    updatePreferences,
    sendEmailNotification,
    sendPushNotification,
    notifyTaskAssigned,
    notifyMeetingInvite,
    notifyMention,
    notifyApprovalRequest,
    notifyApprovalResult,
    notifySystem,
    getStats
  };
}

// ==========================================
// Hook لعرض الإشعارات المنبثقة (Toast)
// ==========================================

export function useToastNotifications() {
  const showSuccess = useCallback((message: string, duration = 3000) => {
    toast.success(message, { duration });
  }, []);
  
  const showError = useCallback((message: string, duration = 4000) => {
    toast.error(message, { duration });
  }, []);
  
  const showInfo = useCallback((message: string, duration = 3000) => {
    toast(message, { duration });
  }, []);
  
  const showLoading = useCallback((message: string) => {
    return toast.loading(message);
  }, []);
  
  const dismissToast = useCallback((toastId: string) => {
    toast.dismiss(toastId);
  }, []);
  
  return {
    showSuccess,
    showError,
    showInfo,
    showLoading,
    dismissToast
  };
}