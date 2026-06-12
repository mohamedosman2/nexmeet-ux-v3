// src/hooks/useFirestore.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  db,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  subscribeToCollection,
  executeBatch
} from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  DocumentReference,
  CollectionReference,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ==========================================
// الأنواع
// ==========================================

export interface FirestoreState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: any;
}

export interface FirestoreDocumentState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export type FirestoreOperation = 'create' | 'update' | 'delete' | 'get';

// ==========================================
// Hook لجمع البيانات مع دعم الترحيل (Pagination)
// ==========================================

export function useFirestoreCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options?: {
    realtime?: boolean;
    pageSize?: number;
    enabled?: boolean;
  }
) {
  const [state, setState] = useState<FirestoreState<T>>({
    data: [],
    loading: true,
    error: null,
    hasMore: true,
    lastDoc: null
  });
  
  const { realtime = true, pageSize = 20, enabled = true } = options || {};
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // دالة لجلب البيانات
  const fetchData = useCallback(async (loadMore = false) => {
    if (!enabled) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      let q;
      if (loadMore && state.lastDoc) {
        q = query(
          collection(db, collectionName),
          ...constraints,
          startAfter(state.lastDoc),
          limit(pageSize)
        );
      } else {
        q = query(
          collection(db, collectionName),
          ...constraints,
          limit(pageSize)
        );
      }
      
      const snapshot = await getDocs(q);
      const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      const hasMore = snapshot.docs.length === pageSize;
      
      setState(prev => ({
        data: loadMore ? [...prev.data, ...newData] : newData,
        loading: false,
        error: null,
        hasMore,
        lastDoc: lastVisible
      }));
    } catch (error: any) {
      console.error('Error fetching collection:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'حدث خطأ في جلب البيانات'
      }));
      toast.error('حدث خطأ في جلب البيانات');
    }
  }, [collectionName, constraints, pageSize, enabled, state.lastDoc]);
  
  // دالة لتحميل المزيد من البيانات
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      fetchData(true);
    }
  }, [fetchData, state.loading, state.hasMore]);
  
  // دالة لإعادة تعيين البيانات
  const reset = useCallback(() => {
    setState({
      data: [],
      loading: true,
      error: null,
      hasMore: true,
      lastDoc: null
    });
    fetchData(false);
  }, [fetchData]);
  
  // دالة للإضافة
  const add = useCallback(async (data: Omit<T, 'id'>): Promise<string | null> => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      toast.success('تمت الإضافة بنجاح');
      reset();
      return docRef.id;
    } catch (error: any) {
      console.error('Error adding document:', error);
      toast.error(error.message || 'حدث خطأ في الإضافة');
      return null;
    }
  }, [collectionName, reset]);
  
  // دالة للتحديث
  const update = useCallback(async (id: string, data: Partial<T>): Promise<boolean> => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now()
      });
      toast.success('تم التحديث بنجاح');
      reset();
      return true;
    } catch (error: any) {
      console.error('Error updating document:', error);
      toast.error(error.message || 'حدث خطأ في التحديث');
      return false;
    }
  }, [collectionName, reset]);
  
  // دالة للحذف
  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      toast.success('تم الحذف بنجاح');
      reset();
      return true;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'حدث خطأ في الحذف');
      return false;
    }
  }, [collectionName, reset]);
  
  // الاستماع في الوقت الفعلي
  useEffect(() => {
    if (!enabled || !realtime) {
      fetchData(false);
      return;
    }
    
    const q = query(collection(db, collectionName), ...constraints);
    
    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      setState(prev => ({
        ...prev,
        data: newData,
        loading: false,
        error: null
      }));
    }, (error) => {
      console.error('Error in realtime listener:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'حدث خطأ في الاتصال'
      }));
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, JSON.stringify(constraints), enabled, realtime]);
  
  return {
    ...state,
    loadMore,
    reset,
    add,
    update,
    remove,
    refetch: () => fetchData(false)
  };
}

// ==========================================
// Hook لمستند واحد
// ==========================================

export function useFirestoreDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string | null,
  options?: {
    realtime?: boolean;
    enabled?: boolean;
  }
) {
  const [state, setState] = useState<FirestoreDocumentState<T>>({
    data: null,
    loading: true,
    error: null
  });
  
  const { realtime = true, enabled = true } = options || {};
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  const fetchDocument = useCallback(async () => {
    if (!enabled || !documentId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setState({
          data: { id: docSnap.id, ...docSnap.data() } as T,
          loading: false,
          error: null
        });
      } else {
        setState({
          data: null,
          loading: false,
          error: 'المستند غير موجود'
        });
      }
    } catch (error: any) {
      console.error('Error fetching document:', error);
      setState({
        data: null,
        loading: false,
        error: error.message || 'حدث خطأ في جلب البيانات'
      });
    }
  }, [collectionName, documentId, enabled]);
  
  const update = useCallback(async (data: Partial<T>): Promise<boolean> => {
    if (!documentId) return false;
    
    try {
      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now()
      });
      toast.success('تم التحديث بنجاح');
      await fetchDocument();
      return true;
    } catch (error: any) {
      console.error('Error updating document:', error);
      toast.error(error.message || 'حدث خطأ في التحديث');
      return false;
    }
  }, [collectionName, documentId, fetchDocument]);
  
  const remove = useCallback(async (): Promise<boolean> => {
    if (!documentId) return false;
    
    try {
      const docRef = doc(db, collectionName, documentId);
      await deleteDoc(docRef);
      toast.success('تم الحذف بنجاح');
      setState({ data: null, loading: false, error: null });
      return true;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'حدث خطأ في الحذف');
      return false;
    }
  }, [collectionName, documentId]);
  
  // الاستماع في الوقت الفعلي
  useEffect(() => {
    if (!enabled || !documentId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    
    if (!realtime) {
      fetchDocument();
      return;
    }
    
    const docRef = doc(db, collectionName, documentId);
    
    unsubscribeRef.current = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setState({
          data: { id: docSnap.id, ...docSnap.data() } as T,
          loading: false,
          error: null
        });
      } else {
        setState({
          data: null,
          loading: false,
          error: 'المستند غير موجود'
        });
      }
    }, (error) => {
      console.error('Error in realtime listener:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'حدث خطأ في الاتصال'
      }));
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, documentId, enabled, realtime]);
  
  return {
    ...state,
    refetch: fetchDocument,
    update,
    remove
  };
}

// ==========================================
// Hook لعمليات الدفعة (Batch Operations)
// ==========================================

export function useFirestoreBatch() {
  const [processing, setProcessing] = useState(false);
  
  const executeBatchOperation = useCallback(async (
    operations: Array<{
      type: 'set' | 'update' | 'delete';
      collection: string;
      docId: string;
      data?: any;
    }>
  ): Promise<boolean> => {
    setProcessing(true);
    
    try {
      const batch = writeBatch(db);
      
      for (const op of operations) {
        const docRef = doc(db, op.collection, op.docId);
        
        switch (op.type) {
          case 'set':
            batch.set(docRef, {
              ...op.data,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...op.data,
              updatedAt: Date.now()
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }
      
      await batch.commit();
      toast.success('تم تنفيذ العمليات بنجاح');
      return true;
    } catch (error: any) {
      console.error('Error executing batch:', error);
      toast.error(error.message || 'حدث خطأ في تنفيذ العمليات');
      return false;
    } finally {
      setProcessing(false);
    }
  }, []);
  
  return { executeBatchOperation, processing };
}

// ==========================================
// Hook للمهام (Tasks) - مثال مخصص
// ==========================================

export function useTasks(department?: string, userId?: string) {
  const constraints: QueryConstraint[] = [];
  
  if (department) {
    constraints.push(where('department', '==', department));
  }
  
  if (userId) {
    constraints.push(where('assigneesUids', 'array-contains', userId));
  }
  
  constraints.push(orderBy('date', 'asc'));
  constraints.push(orderBy('time', 'asc'));
  
  return useFirestoreCollection<Task>('tasks', constraints, { realtime: true });
}

// ==========================================
// Hook للمستخدمين (Users)
// ==========================================

export function useUsers(department?: string, role?: string) {
  const constraints: QueryConstraint[] = [];
  
  if (department) {
    constraints.push(where('department', '==', department));
  }
  
  if (role) {
    constraints.push(where('primaryRole', '==', role));
  }
  
  constraints.push(orderBy('name', 'asc'));
  
  const result = useFirestoreCollection<User>('users', constraints, { realtime: true });
  
  // إضافة دوال مساعدة للمستخدمين
  const getActiveUsers = useCallback(() => {
    return result.data.filter(user => user.isActive);
  }, [result.data]);
  
  const getInactiveUsers = useCallback(() => {
    return result.data.filter(user => !user.isActive);
  }, [result.data]);
  
  const getManagers = useCallback(() => {
    return result.data.filter(user => 
      user.primaryRole === 'manager' || 
      user.primaryRole === 'chairman' || 
      user.primaryRole === 'vp'
    );
  }, [result.data]);
  
  return {
    ...result,
    getActiveUsers,
    getInactiveUsers,
    getManagers
  };
}

// ==========================================
// Hook للمحادثات (Chat)
// ==========================================

export function useChatMessages(groupId: string | null) {
  const constraints: QueryConstraint[] = [];
  
  if (groupId) {
    constraints.push(where('groupId', '==', groupId));
    constraints.push(orderBy('timestamp', 'asc'));
    constraints.push(limit(100));
  }
  
  const result = useFirestoreCollection<ChatMessage>('messages', constraints, { 
    realtime: true,
    enabled: !!groupId
  });
  
  const sendMessage = useCallback(async (text: string, fromUid: string) => {
    if (!groupId) return null;
    
    return await result.add({
      groupId,
      fromUid,
      text,
      timestamp: Date.now(),
      isEdited: false,
      isDeleted: false,
      readBy: [fromUid]
    } as any);
  }, [groupId, result]);
  
  const markAsRead = useCallback(async (messageId: string, userId: string) => {
    const message = result.data.find(m => m.id === messageId);
    if (message && !message.readBy.includes(userId)) {
      await result.update(messageId, {
        readBy: [...message.readBy, userId]
      });
    }
  }, [result.data, result.update]);
  
  return {
    ...result,
    sendMessage,
    markAsRead
  };
}

// ==========================================
// Hook للإشعارات (Notifications)
// ==========================================

export function useNotifications(userId: string | null) {
  const constraints: QueryConstraint[] = [];
  
  if (userId) {
    constraints.push(where('targetUid', '==', userId));
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(50));
  }
  
  const result = useFirestoreCollection<Notification>('notifications', constraints, { 
    realtime: true,
    enabled: !!userId
  });
  
  const markAsRead = useCallback(async (notificationId: string) => {
    await result.update(notificationId, { isRead: true });
  }, [result]);
  
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = result.data.filter(n => !n.isRead);
    for (const notification of unreadNotifications) {
      await result.update(notification.id, { isRead: true });
    }
  }, [result.data, result.update]);
  
  const getUnreadCount = useCallback(() => {
    return result.data.filter(n => !n.isRead).length;
  }, [result.data]);
  
  return {
    ...result,
    markAsRead,
    markAllAsRead,
    getUnreadCount
  };
}

// ==========================================
// أنواع إضافية
// ==========================================

interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'progress' | 'done';
  department: string;
  assigneesUids: string[];
}

interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  department: string;
  primaryRole: string;
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  groupId: string;
  fromUid: string;
  text: string;
  timestamp: number;
  isEdited: boolean;
  isDeleted: boolean;
  readBy: string[];
}

interface Notification {
  id: string;
  targetUid: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: number;
}