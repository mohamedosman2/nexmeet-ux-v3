// src/hooks/useAuthRedirect.ts

import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ==========================================
// الأنواع
// ==========================================

export interface RedirectOptions {
  redirectTo?: string;
  redirectIfAuthenticated?: string;
  redirectIfNotAuthenticated?: string;
  redirectIfPending?: string;
  redirectIfNotPending?: string;
  checkRole?: 'chairman' | 'vp' | 'manager' | 'employee';
  checkPermission?: 'admin' | 'manager' | 'topManagement';
  loadingComponent?: React.ReactNode;
}

// ==========================================
// Hook رئيسي لتوجيه المصادقة
// ==========================================

export function useAuthRedirect(options: RedirectOptions = {}) {
  const {
    redirectTo,
    redirectIfAuthenticated,
    redirectIfNotAuthenticated = '/login',
    redirectIfPending,
    redirectIfNotPending,
    checkRole,
    checkPermission
  } = options;
  
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, loading, isPending, isTopManagement, canAccessAdminPanel } = useAuth();
  
  const checkRolePermission = useCallback(() => {
    if (!userProfile) return false;
    
    // التحقق من الدور
    if (checkRole && userProfile.primaryRole !== checkRole) {
      return false;
    }
    
    // التحقق من الصلاحية
    if (checkPermission === 'admin' && !canAccessAdminPanel) {
      return false;
    }
    
    if (checkPermission === 'manager' && userProfile.primaryRole !== 'manager') {
      return false;
    }
    
    if (checkPermission === 'topManagement' && !isTopManagement) {
      return false;
    }
    
    return true;
  }, [userProfile, checkRole, checkPermission, canAccessAdminPanel, isTopManagement]);
  
  useEffect(() => {
    if (loading) return;
    
    // توجيه مخصص
    if (redirectTo) {
      navigate(redirectTo);
      return;
    }
    
    // توجيه إذا كان المستخدم مسجل الدخول
    if (currentUser && redirectIfAuthenticated) {
      // التحقق من الصلاحيات إذا كانت مطلوبة
      if (checkRolePermission()) {
        navigate(redirectIfAuthenticated);
        return;
      } else if (checkRole || checkPermission) {
        // إذا لم تكن الصلاحيات متوفرة، توجيه إلى الصفحة الرئيسية
        navigate('/dashboard');
        return;
      }
      navigate(redirectIfAuthenticated);
      return;
    }
    
    // توجيه إذا لم يكن المستخدم مسجل الدخول
    if (!currentUser && redirectIfNotAuthenticated) {
      navigate(redirectIfNotAuthenticated, { state: { from: location.pathname } });
      return;
    }
    
    // توجيه إذا كان الحساب قيد المراجعة
    if (isPending && redirectIfPending) {
      navigate(redirectIfPending);
      return;
    }
    
    // توجيه إذا لم يكن الحساب قيد المراجعة
    if (!isPending && redirectIfNotPending && !currentUser) {
      navigate(redirectIfNotPending);
      return;
    }
  }, [currentUser, loading, isPending, navigate, redirectTo, redirectIfAuthenticated, redirectIfNotAuthenticated, redirectIfPending, redirectIfNotPending, location.pathname, checkRolePermission]);
  
  return {
    isAllowed: checkRolePermission(),
    redirectToLogin: () => navigate('/login', { state: { from: location.pathname } }),
    redirectToDashboard: () => navigate('/dashboard'),
    redirectToHome: () => navigate('/'),
    goBack: () => navigate(-1)
  };
}

// ==========================================
// Hook لحماية المسارات (Protected Route)
// ==========================================

export function useProtectedRoute(requiredRole?: 'chairman' | 'vp' | 'manager' | 'employee', requiredPermission?: 'admin' | 'manager' | 'topManagement') {
  const { currentUser, userProfile, loading, isPending, isTopManagement, canAccessAdminPanel } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAuthorized = useCallback(() => {
    if (!currentUser) return false;
    if (isPending) return false;
    if (!userProfile) return false;
    
    if (requiredRole && userProfile.primaryRole !== requiredRole) {
      // الإدارة العليا يمكنها الوصول إلى كل شيء
      if (!isTopManagement) return false;
    }
    
    if (requiredPermission === 'admin' && !canAccessAdminPanel) return false;
    if (requiredPermission === 'manager' && userProfile.primaryRole !== 'manager') return false;
    if (requiredPermission === 'topManagement' && !isTopManagement) return false;
    
    return true;
  }, [currentUser, userProfile, isPending, isTopManagement, canAccessAdminPanel, requiredRole, requiredPermission]);
  
  useEffect(() => {
    if (loading) return;
    
    if (!currentUser) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }
    
    if (isPending) {
      navigate('/pending', { replace: true });
      return;
    }
    
    if (!isAuthorized()) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, loading, isPending, isAuthorized, navigate, location.pathname]);
  
  return { isAuthorized: isAuthorized(), loading };
}

// ==========================================
// Hook للتحقق من الصلاحيات
// ==========================================

export function usePermissionsCheck() {
  const { userProfile, isTopManagement, canAccessAdminPanel } = useAuth();
  
  const hasRole = useCallback((role: 'chairman' | 'vp' | 'manager' | 'employee') => {
    if (!userProfile) return false;
    if (isTopManagement && role !== 'employee') return true;
    return userProfile.primaryRole === role;
  }, [userProfile, isTopManagement]);
  
  const hasAnyRole = useCallback((roles: ('chairman' | 'vp' | 'manager' | 'employee')[]) => {
    if (!userProfile) return false;
    if (isTopManagement && !roles.includes('employee')) return true;
    return roles.includes(userProfile.primaryRole);
  }, [userProfile, isTopManagement]);
  
  const hasPermission = useCallback((permission: 'admin' | 'manager' | 'topManagement') => {
    if (!userProfile) return false;
    
    switch (permission) {
      case 'admin':
        return canAccessAdminPanel;
      case 'manager':
        return userProfile.primaryRole === 'manager' || isTopManagement;
      case 'topManagement':
        return isTopManagement;
      default:
        return false;
    }
  }, [userProfile, canAccessAdminPanel, isTopManagement]);
  
  const canManageDepartment = useCallback((departmentName: string) => {
    if (!userProfile) return false;
    if (isTopManagement) return true;
    if (userProfile.primaryRole === 'manager' && userProfile.department === departmentName) return true;
    return userProfile.accessibleDepartments?.includes(departmentName) || false;
  }, [userProfile, isTopManagement]);
  
  return {
    hasRole,
    hasAnyRole,
    hasPermission,
    canManageDepartment,
    isChairman: userProfile?.primaryRole === 'chairman',
    isVP: userProfile?.primaryRole === 'vp',
    isManager: userProfile?.primaryRole === 'manager',
    isEmployee: userProfile?.primaryRole === 'employee',
    isTopManagement,
    canAccessAdminPanel
  };
}

// ==========================================
// Hook لحفظ آخر مسار زاره المستخدم
// ==========================================

export function useLastVisitedPath() {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  const saveLastPath = useCallback(() => {
    if (!currentUser) return;
    const path = location.pathname;
    if (path !== '/login' && path !== '/pending') {
      localStorage.setItem(`lastPath_${currentUser.uid}`, path);
    }
  }, [currentUser, location.pathname]);
  
  const getLastPath = useCallback(() => {
    if (!currentUser) return '/dashboard';
    return localStorage.getItem(`lastPath_${currentUser.uid}`) || '/dashboard';
  }, [currentUser]);
  
  const redirectToLastPath = useCallback(() => {
    const lastPath = getLastPath();
    window.location.href = lastPath;
  }, [getLastPath]);
  
  useEffect(() => {
    saveLastPath();
  }, [saveLastPath]);
  
  return {
    saveLastPath,
    getLastPath,
    redirectToLastPath
  };
}

// ==========================================
// Hook لإدارة معلمات URL
// ==========================================

export function useQueryParams() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const getParam = useCallback((key: string): string | null => {
    const params = new URLSearchParams(location.search);
    return params.get(key);
  }, [location.search]);