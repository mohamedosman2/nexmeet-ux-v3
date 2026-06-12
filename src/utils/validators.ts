// src/utils/validators.ts

// ==========================================
// دوال التحقق من صحة البيانات
// ==========================================

/**
 * التحقق من أن القيمة مطلوبة
 */
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * التحقق من الحد الأدنى للطول
 */
export const minLength = (value: string, length: number): boolean => {
  return value.length >= length;
};

/**
 * التحقق من الحد الأقصى للطول
 */
export const maxLength = (value: string, length: number): boolean => {
  return value.length <= length;
};

/**
 * التحقق من النطاق
 */
export const isBetween = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * التحقق من صحة البريد الإلكتروني
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * التحقق من صحة رقم الجوال السعودي
 */
export const isValidSaudiPhone = (phone: string): boolean => {
  const phoneRegex = /^(05|5)(0|1|2|3|4|5|6|7|8|9)\d{7}$/;
  return phoneRegex.test(phone);
};

/**
 * التحقق من صحة الرقم الدولي
 */
export const isValidInternationalPhone = (phone: string): boolean => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

/**
 * التحقق من صحة الرقم
 */
export const isNumber = (value: any): boolean => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * التحقق من صحة التاريخ
 */
export const isValidDate = (date: string): boolean => {
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
};

/**
 * التحقق من أن التاريخ في المستقبل
 */
export const isFutureDate = (date: string): boolean => {
  const parsedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsedDate > today;
};

/**
 * التحقق من أن التاريخ في الماضي
 */
export const isPastDate = (date: string): boolean => {
  const parsedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsedDate < today;
};

/**
 * التحقق من تطابق القيم
 */
export const isMatch = (value1: any, value2: any): boolean => {
  return value1 === value2;
};

/**
 * التحقق من أن القيمة ضمن القائمة
 */
export const isInList = (value: any, list: any[]): boolean => {
  return list.includes(value);
};

/**
 * التحقق من صحة رابط URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * التحقق من صحة UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * التحقق من قوة كلمة المرور
 */
export const isStrongPassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ==========================================
// دوال التحقق من صحة النماذج
// ==========================================

export interface ValidationRule {
  validator: (value: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [field: string]: ValidationRule[];
}

export interface ValidationErrors {
  [field: string]: string[];
}

/**
 * التحقق من صحة النموذج
 */
export const validateForm = (
  data: Record<string, any>,
  rules: ValidationRules
): { isValid: boolean; errors: ValidationErrors } => {
  const errors: ValidationErrors = {};
  
  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const value = data[field];
    const fieldErrors: string[] = [];
    
    fieldRules.forEach(rule => {
      if (!rule.validator(value)) {
        fieldErrors.push(rule.message);
      }
    });
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ==========================================
// قواعد التحقق المدمجة
// ==========================================

export const validationRules = {
  required: (fieldName: string): ValidationRule => ({
    validator: (value) => isRequired(value),
    message: `${fieldName} مطلوب`
  }),
  
  email: (): ValidationRule => ({
    validator: (value) => !value || isValidEmail(value),
    message: 'البريد الإلكتروني غير صحيح'
  }),
  
  phone: (): ValidationRule => ({
    validator: (value) => !value || isValidSaudiPhone(value),
    message: 'رقم الجوال غير صحيح'
  }),
  
  minLength: (fieldName: string, length: number): ValidationRule => ({
    validator: (value) => !value || minLength(value, length),
    message: `${fieldName} يجب أن يكون ${length} أحرف على الأقل`
  }),
  
  maxLength: (fieldName: string, length: number): ValidationRule => ({
    validator: (value) => !value || maxLength(value, length),
    message: `${fieldName} يجب أن يكون ${length} أحرف كحد أقصى`
  }),
  
  match: (fieldName: string, matchField: string, matchFieldName: string): ValidationRule => ({
    validator: (value, formData) => !value || value === formData[matchField],
    message: `${fieldName} لا يتطابق مع ${matchFieldName}`
  }),
  
  futureDate: (): ValidationRule => ({
    validator: (value) => !value || isFutureDate(value),
    message: 'يجب أن يكون التاريخ في المستقبل'
  }),
  
  pastDate: (): ValidationRule => ({
    validator: (value) => !value || isPastDate(value),
    message: 'يجب أن يكون التاريخ في الماضي'
  }),
  
  strongPassword: (): ValidationRule => ({
    validator: (value) => !value || isStrongPassword(value).isValid,
    message: 'كلمة المرور ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، رمز خاص'
  })
};