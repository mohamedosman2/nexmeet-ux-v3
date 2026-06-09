import { db } from '../config/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Task } from '../types';

// 1. إنشاء مهمة جديدة ورفعها للسحابة
export const createCloudTask = async (taskData: Omit<Task, 'id'>) => {
  return await addDoc(collection(db, 'tasks'), taskData);
};

// 2. جلب المهام التابعة لإدارة معينة في الوقت الفعلي (Realtime Live Sync)
export const subscribeToDepartmentTasks = (department: string, onUpdate: (tasks: Task[]) => void) => {
  const q = query(collection(db, 'tasks'), where('department', '==', department));
  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });
    onUpdate(tasks);
  });
};

// 3. تحديث حالة أي مهمة سحابياً (مثال: من "لم تبدأ" إلى "مكتملة")
export const updateCloudTaskStatus = async (taskId: string, newStatus: 'todo' | 'progress' | 'done') => {
  const taskRef = doc(db, 'tasks', taskId);
  return await updateDoc(taskRef, { status: newStatus });
};

// 4. إرسال رسالة في نظام المحادثات الفوري لكل الإدارات
export const sendCloudMessage = async (chatRoomId: string, senderId: string, senderName: string, text: string) => {
  return await addDoc(collection(db, `chats/${chatRoomId}/messages`), {
    senderId,
    senderName,
    text,
    timestamp: Date.now()
  });
};