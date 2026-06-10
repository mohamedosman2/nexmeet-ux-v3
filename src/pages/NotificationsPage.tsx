// ==========================================
// صفحة الإشعارات (Notifications Page)
// ==========================================
import React, { useState, useEffect } from 'react';
import { FaBell, FaBellSlash } from 'react-icons/fa';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../types';

export const NotificationsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;
    
    // جلب الإشعارات الخاصة بهذا المستخدم
    const q = query(collection(db, 'notifications'), where('targetUid', '==', userProfile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNots: Notification[] = [];
      snapshot.forEach(docSnap => {
        fetchedNots.push({ id: docSnap.id, ...docSnap.data() } as Notification);
      });
      // ترتيب زمني
      fetchedNots.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(fetchedNots);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  // جعل إشعار واحد مقروء
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error(error);
    }
  };

  // جعل الكل مقروء
  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.isRead) {
          const ref = doc(db, 'notifications', n.id);
          batch.update(ref, { isRead: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error(error);
    }
  };

  // تنسيق الوقت
  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
    return `${Math.floor(diff / 86400)} يوم`;
  };

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FaBell className="text-[#8B1A1A]" /> الإشعارات والتنبيهات
        </h2>
        {notifications.some(n => !n.isRead) && (
          <button onClick={markAllAsRead} className="text-sm cursor-pointer text-[#A52A2A] hover:underline font-bold">
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div className="cd" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">جاري جلب الإشعارات...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FaBellSlash className="text-4xl mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد إشعارات جديدة حالياً.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => markAsRead(n.id)}
                className={`p-4 flex items-start gap-4 cursor-pointer transition-colors border-b border-[#1f1f1f] last:border-0 hover:bg-[#111] ${!n.isRead ? 'border-r-4 border-r-[#8B1A1A] bg-[#151515]' : 'bg-transparent'}`}
              >
                <div className="w-10 h-10 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center flex-shrink-0">
                  <FaBell className="text-[#A52A2A] text-sm" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${!n.isRead ? 'font-bold text-white' : 'text-gray-300'}`}>{n.text}</p>
                  <span className="text-[10px] text-gray-500 mt-1 block">{formatTime(n.timestamp)}</span>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#8B1A1A] mt-1.5"></span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};