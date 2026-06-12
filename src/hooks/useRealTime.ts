// src/hooks/useRealTime.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  QueryConstraint,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ==========================================
// الأنواع
// ==========================================

export interface RealTimeOptions {
  enabled?: boolean;
  retryCount?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheDuration?: number; // بالمللي ثانية
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

export interface RealTimeState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: number | null;
}

// ==========================================
// ذاكرة مؤقتة بسيطة
// ==========================================

class SimpleCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  
  set(key: string, data: any, duration: number) {
    this.cache.set(key, { data, timestamp: Date.now() + duration });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }
  
  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

const cache = new SimpleCache();

// ==========================================
// Hook رئيسي للبيانات في الوقت الفعلي
// ==========================================

export function useRealTimeCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: RealTimeOptions = {}
) {
  const {
    enabled = true,
    retryCount = 3,
    retryDelay = 1000,
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 دقائق
    onError,
    onReconnect
  } = options;
  
  const [state, setState] = useState<RealTimeState<T>>({
    data: [],
    loading: true,
    error: null,
    isConnected: true,
    lastUpdated: null
  });
  
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const retryAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // محاولة إعادة الاتصال
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (retryAttemptRef.current < retryCount) {
      retryAttemptRef.current++;
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`🔄 محاولة إعادة الاتصال (${retryAttemptRef.current}/${retryCount})`);
        initializeListener();
      }, retryDelay * retryAttemptRef.current);
    } else {
      setState(prev => ({
        ...prev,
        error: 'فقد الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        isConnected: false
      }));
      toast.error('فقد الاتصال بالخادم. جاري محاولة إعادة الاتصال...');
    }
  }, [retryCount, retryDelay]);
  
  // تهيئة المستمع
  const initializeListener = useCallback(() => {
    if (!enabled) return;
    
    // محاولة استعادة البيانات من التخزين المؤقت
    if (cacheKey) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        setState(prev => ({
          ...prev,
          data: cachedData,
          loading: false,
          lastUpdated: Date.now()
        }));
      }
    }
    
    const q = query(collection(db, collectionName), ...constraints);
    
    unsubscribeRef.current = onSnapshot(q, 
      (snapshot) => {
        // إعادة تعيين محاولات إعادة الاتصال عند النجاح
        retryAttemptRef.current = 0;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        const newData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }) as T);
        
        setState(prev => ({
          ...prev,
          data: newData,
          loading: false,
          error: null,
          isConnected: true,
          lastUpdated: Date.now()
        }));
        
        // تخزين في الكاش
        if (cacheKey) {
          cache.set(cacheKey, newData, cacheDuration);
        }
        
        // استدعاء回调 عند إعادة الاتصال
        if (!state.isConnected && onReconnect) {
          onReconnect();
          toast.success('تم استعادة الاتصال بالخادم');
        }
      },
      (error) => {
        console.error('Error in realtime listener:', error);
        
        setState(prev => ({
          ...prev,
          error: error.message || 'حدث خطأ في الاتصال',
          isConnected: false
        }));
        
        if (onError) {
          onError(error);
        }
        
        // محاولة إعادة الاتصال
        attemptReconnect();
      }
    );
  }, [collectionName, JSON.stringify(constraints), enabled, cacheKey, cacheDuration, onReconnect, attemptReconnect, state.isConnected]);
  
  // إيقاف المستمع
  const stopListening = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);
  
  // إعادة تعيين والبدء من جديد
  const restart = useCallback(() => {
    stopListening();
    retryAttemptRef.current = 0;
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      isConnected: true
    }));
    initializeListener();
  }, [stopListening, initializeListener]);
  
  // تحديث البيانات يدوياً
  const refresh = useCallback(() => {
    if (cacheKey) {
      cache.clear(cacheKey);
    }
    restart();
  }, [cacheKey, restart]);
  
  // بدء المستمع
  useEffect(() => {
    if (enabled) {
      initializeListener();
    }
    
    return () => {
      stopListening();
    };
  }, [enabled, initializeListener, stopListening]);
  
  return {
    ...state,
    restart,
    refresh,
    stopListening
  };
}

// ==========================================
// Hook لمستند واحد في الوقت الفعلي
// ==========================================

export function useRealTimeDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string | null,
  options: RealTimeOptions = {}
) {
  const {
    enabled = true,
    retryCount = 3,
    retryDelay = 1000,
    cacheKey,
    cacheDuration = 5 * 60 * 1000,
    onError,
    onReconnect
  } = options;
  
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
    isConnected: boolean;
    lastUpdated: number | null;
  }>({
    data: null,
    loading: true,
    error: null,
    isConnected: true,
    lastUpdated: null
  });
  
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const retryAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (retryAttemptRef.current < retryCount) {
      retryAttemptRef.current++;
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`🔄 محاولة إعادة الاتصال (${retryAttemptRef.current}/${retryCount})`);
        initializeListener();
      }, retryDelay * retryAttemptRef.current);
    } else {
      setState(prev => ({
        ...prev,
        error: 'فقد الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        isConnected: false
      }));
    }
  }, [retryCount, retryDelay]);
  
  const initializeListener = useCallback(() => {
    if (!enabled || !documentId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }
    
    if (cacheKey) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        setState(prev => ({
          ...prev,
          data: cachedData,
          loading: false,
          lastUpdated: Date.now()
        }));
      }
    }
    
    const docRef = doc(db, collectionName, documentId);
    
    unsubscribeRef.current = onSnapshot(docRef,
      (snapshot) => {
        retryAttemptRef.current = 0;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        if (snapshot.exists()) {
          const data = { id: snapshot.id, ...snapshot.data() } as T;
          
          setState(prev => ({
            ...prev,
            data,
            loading: false,
            error: null,
            isConnected: true,
            lastUpdated: Date.now()
          }));
          
          if (cacheKey) {
            cache.set(cacheKey, data, cacheDuration);
          }
          
          if (!state.isConnected && onReconnect) {
            onReconnect();
          }
        } else {
          setState(prev => ({
            ...prev,
            data: null,
            loading: false,
            error: 'المستند غير موجود',
            isConnected: true,
            lastUpdated: Date.now()
          }));
        }
      },
      (error) => {
        console.error('Error in document listener:', error);
        
        setState(prev => ({
          ...prev,
          error: error.message || 'حدث خطأ في الاتصال',
          isConnected: false
        }));
        
        if (onError) onError(error);
        attemptReconnect();
      }
    );
  }, [collectionName, documentId, enabled, cacheKey, cacheDuration, onReconnect, attemptReconnect, state.isConnected]);
  
  const stopListening = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);
  
  const refresh = useCallback(() => {
    if (cacheKey) cache.clear(cacheKey);
    stopListening();
    retryAttemptRef.current = 0;
    setState(prev => ({ ...prev, loading: true, error: null, isConnected: true }));
    initializeListener();
  }, [cacheKey, stopListening, initializeListener]);
  
  useEffect(() => {
    if (enabled && documentId) {
      initializeListener();
    }
    
    return () => {
      stopListening();
    };
  }, [enabled, documentId, initializeListener, stopListening]);
  
  return {
    ...state,
    refresh,
    stopListening
  };
}

// ==========================================
// Hook لمراقبة حالة اتصال Firebase
// ==========================================

export function useFirebaseConnection() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastDisconnectTime, setLastDisconnectTime] = useState<number | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  useEffect(() => {
    let reconnectInterval: NodeJS.Timeout | null = null;
    
    const checkConnection = async () => {
      try {
        // محاولة قراءة مستند اختبار
        const testRef = doc(db, '_test_connection', 'status');
        const unsubscribe = onSnapshot(testRef, 
          () => {
            if (!isConnected) {
              setIsConnected(true);
              setReconnectAttempts(0);
              if (reconnectInterval) clearInterval(reconnectInterval);
              toast.success('تم استعادة الاتصال بالخادم');
            }
          },
          () => {
            if (isConnected) {
              setIsConnected(false);
              setLastDisconnectTime(Date.now());
              setReconnectAttempts(prev => prev + 1);
              
              // محاولة إعادة الاتصال كل 5 ثوانٍ
              reconnectInterval = setInterval(() => {
                checkConnection();
              }, 5000);
            }
          }
        );
        
        return unsubscribe;
      } catch (error) {
        console.error('Connection check error:', error);
        return () => {};
      }
    };
    
    const unsubscribe = checkConnection();
    
    return () => {
      if (unsubscribe) {
        unsubscribe.then(fn => fn());
      }
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
      }
    };
  }, [isConnected]);
  
  return {
    isConnected,
    lastDisconnectTime,
    reconnectAttempts
  };
}

// ==========================================
// Hook للاستعلامات المعقدة مع دعم البحث
// ==========================================

export function useSearchableCollection<T extends DocumentData>(
  collectionName: string,
  searchFields: string[],
  searchTerm: string,
  options: RealTimeOptions = {}
) {
  const [searchResults, setSearchResults] = useState<T[]>([]);
  
  const { data, loading, error, isConnected } = useRealTimeCollection<T>(
    collectionName,
    [],
    options
  );
  
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(data);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const results = data.filter(item => {
      return searchFields.some(field => {
        const value = item[field as keyof T];
        return value && String(value).toLowerCase().includes(term);
      });
    });
    
    setSearchResults(results);
  }, [data, searchTerm, searchFields]);
  
  return {
    data: searchResults,
    allData: data,
    loading,
    error,
    isConnected
  };
}

// ==========================================
// Hook للبيانات المجمعة (Aggregated Data)
// ==========================================

export function useAggregatedData<T extends DocumentData>(
  collectionName: string,
  groupBy: keyof T,
  options: RealTimeOptions = {}
) {
  const { data, loading, error, isConnected } = useRealTimeCollection<T>(
    collectionName,
    [],
    options
  );
  
  const [aggregated, setAggregated] = useState<Map<string, T[]>>(new Map());
  const [summary, setSummary] = useState<{ key: string; count: number }[]>([]);
  
  useEffect(() => {
    const grouped = new Map<string, T[]>();
    
    data.forEach(item => {
      const key = String(item[groupBy]);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });
    
    setAggregated(grouped);
    
    const summaryData = Array.from(grouped.entries()).map(([key, items]) => ({
      key,
      count: items.length
    }));
    
    summaryData.sort((a, b) => b.count - a.count);
    setSummary(summaryData);
  }, [data, groupBy]);
  
  return {
    aggregated,
    summary,
    loading,
    error,
    isConnected
  };
}

// ==========================================
// Hook للبيانات مع التحديد (Selection)
// ==========================================

export function useSelectableCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: RealTimeOptions = {}
) {
  const { data, ...rest } = useRealTimeCollection<T>(collectionName, constraints, options);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const selectAll = useCallback(() => {
    const allIds = new Set(data.map(item => item.id));
    setSelectedIds(allIds);
  }, [data]);
  
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);
  
  const selectRange = useCallback((startId: string, endId: string) => {
    const ids = data.map(item => item.id);
    const startIndex = ids.indexOf(startId);
    const endIndex = ids.indexOf(endId);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const min = Math.min(startIndex, endIndex);
      const max = Math.max(startIndex, endIndex);
      const newSet = new Set(selectedIds);
      
      for (let i = min; i <= max; i++) {
        newSet.add(ids[i]);
      }
      
      setSelectedIds(newSet);
    }
  }, [data, selectedIds]);
  
  const selectedData = data.filter(item => selectedIds.has(item.id));
  const selectedCount = selectedIds.size;
  
  return {
    data,
    selectedIds,
    selectedData,
    selectedCount,
    selectAll,
    deselectAll,
    toggleSelect,
    selectRange,
    ...rest
  };
}