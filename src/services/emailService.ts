// src/services/emailService.ts

import { db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// ==========================================
// أنواع رسائل البريد الإلكتروني
// ==========================================

export type EmailType = 
  | 'welcome' 
  | 'password_reset' 
  | 'magic_link' 
  | 'task_assigned' 
  | 'meeting_invite' 
  | 'mention' 
  | 'approval_request' 
  | 'approval_response'
  | 'reminder'
  | 'report';

export interface EmailData {
  to: string;
  toName: string;
  subject: string;
  body: string;
  type: EmailType;
  relatedId?: string;
  metadata?: Record<string, any>;
}

export interface EmailTemplate {
  subject: string;
  getBody: (data: Record<string, any>) => string;
}

// ==========================================
// قوالب البريد الإلكتروني
// ==========================================

const emailTemplates: Record<EmailType, EmailTemplate> = {
  welcome: {
    subject: 'مرحباً بك في منصة United Experts',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">مرحباً ${data.name}،</h2>
        <p style="line-height: 1.6; color: #333;">تم إنشاء حسابك بنجاح في منصة United Experts.</p>
        <p style="line-height: 1.6; color: #333;">يمكنك الآن تسجيل الدخول إلى المنصة والبدء في إدارة مهامك واجتماعاتك.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl}" style="background: #8B1A1A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">تسجيل الدخول الآن</a>
        </div>
        <p style="line-height: 1.6; color: #333;">بيانات حسابك:</p>
        <ul style="line-height: 1.6; color: #333;">
          <li>البريد الإلكتروني: ${data.email}</li>
          <li>كلمة المرور: ${data.password}</li>
        </ul>
        <p style="line-height: 1.6; color: #333;">نوصي بتغيير كلمة المرور بعد أول تسجيل دخول.</p>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  password_reset: {
    subject: 'إعادة تعيين كلمة المرور',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">إعادة تعيين كلمة المرور</h2>
        <p style="line-height: 1.6; color: #333;">لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background: #8B1A1A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">إعادة تعيين كلمة المرور</a>
        </div>
        <p style="line-height: 1.6; color: #333;">إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
        <p style="line-height: 1.6; color: #333;">هذا الرابط صالح لمدة ساعة واحدة.</p>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  magic_link: {
    subject: 'رابط تسجيل الدخول السحري',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">رابط تسجيل الدخول السحري</h2>
        <p style="line-height: 1.6; color: #333;">مرحباً ${data.name}،</p>
        <p style="line-height: 1.6; color: #333;">انقر على الرابط أدناه لتسجيل الدخول إلى حسابك:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.magicLink}" style="background: #8B1A1A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">تسجيل الدخول السحري</a>
        </div>
        <p style="line-height: 1.6; color: #333;">هذا الرابط صالح لمدة 15 دقيقة فقط.</p>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  task_assigned: {
    subject: 'تم تعيين مهمة جديدة إليك',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">تم تعيين مهمة جديدة</h2>
        <p style="line-height: 1.6; color: #333;">مرحباً ${data.name}،</p>
        <p style="line-height: 1.6; color: #333;">تم تعيين مهمة جديدة إليك من قبل ${data.assignedBy}.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.taskTitle}</h3>
          <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${data.date}</p>
          <p style="margin: 5px 0;"><strong>الوقت:</strong> ${data.time}</p>
          <p style="margin: 5px 0;"><strong>الأولوية:</strong> ${data.priority}</p>
          <p style="margin: 5px 0;"><strong>الوصف:</strong> ${data.description || 'لا يوجد وصف'}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.taskUrl}" style="background: #8B1A1A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">عرض المهمة</a>
        </div>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  meeting_invite: {
    subject: 'دعوة لحضور اجتماع',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">دعوة لحضور اجتماع</h2>
        <p style="line-height: 1.6; color: #333;">مرحباً ${data.name}،</p>
        <p style="line-height: 1.6; color: #333;">تمت دعوتك لحضور اجتماع من قبل ${data.invitedBy}.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.meetingTitle}</h3>
          <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${data.date}</p>
          <p style="margin: 5px 0;"><strong>الوقت:</strong> ${data.time}</p>
          <p style="margin: 5px 0;"><strong>النوع:</strong> ${data.type === 'online' ? 'عن بُعد' : 'حضوري'}</p>
          ${data.meetingLink ? `<p style="margin: 5px 0;"><strong>رابط الاجتماع:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></p>` : ''}
          <p style="margin: 5px 0;"><strong>الملاحظات:</strong> ${data.notes || 'لا توجد ملاحظات'}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.meetingUrl}" style="background: #8B1A1A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">عرض الاجتماع</a>
        </div>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  mention: {
    subject: 'تمت الإشارة إليك',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">تمت الإشارة إليك</h2>
        <p style="line-height: 1.6; color: #333;">مرحباً ${data.name}،</p>
        <p style="line-height: 1.6; color: #333;">قام ${data.mentionedBy} بالإشارة إليك في ${data.type === 'task' ? 'مهمة' : 'اجتماع'}:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.title}</h3>
          <p style="margin: 5px 0;">${data.message}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.url}" style="background: #8B1A1A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">عرض التفاصيل</a>
        </div>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  approval_request: {
    subject: 'طلب انضمام جديد للموافقة',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">طلب انضمام جديد</h2>
        <p style="line-height: 1.6; color: #333;">لديك طلب انضمام جديد للموافقة عليه.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>الاسم:</strong> ${data.name}</p>
          <p style="margin: 5px 0;"><strong>البريد:</strong> ${data.email}</p>
          <p style="margin: 5px 0;"><strong>الجوال:</strong> ${data.phone}</p>
          <p style="margin: 5px 0;"><strong>الإدارة:</strong> ${data.department}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.approvalUrl}" style="background: #8B1A1A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">مراجعة الطلب</a>
        </div>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  approval_response: {
    subject: 'تم البت في طلب انضمامك',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">${data.status === 'approved' ? 'تم قبول طلبك' : 'تم رفض طلبك'}</h2>
        <p style="line-height: 1.6; color: #333;">مرحباً ${data.name}،</p>
        ${data.status === 'approved' ? `
          <p style="line-height: 1.6; color: #333;">تمت الموافقة على طلب انضمامك إلى منصة United Experts.</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.loginUrl}" style="background: #8B1A1A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">تسجيل الدخول الآن</a>
          </div>
        ` : `
          <p style="line-height: 1.6; color: #333;">نأسف لإبلاغك بأن طلب انضمامك لم يتم الموافقة عليه.</p>
          <p style="line-height: 1.6; color: #333;">للحصول على مزيد من المعلومات، يرجى التواصل مع إدارة الموارد البشرية.</p>
        `}
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  reminder: {
    subject: 'تذكير: ${data.title}',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">تذكير: ${data.title}</h2>
        <p style="line-height: 1.6; color: #333;">مرحباً ${data.name}،</p>
        <p style="line-height: 1.6; color: #333;">هذا تذكير ب${data.type === 'task' ? 'المهمة' : 'الاجتماع'} المقرر:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.title}</h3>
          <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${data.date}</p>
          <p style="margin: 5px 0;"><strong>الوقت:</strong> ${data.time}</p>
          <p style="margin: 5px 0;"><strong>يتبقى:</strong> ${data.remainingTime}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.url}" style="background: #8B1A1A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">عرض التفاصيل</a>
        </div>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  },
  report: {
    subject: 'تقرير ${data.reportType}',
    getBody: (data) => `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg viewBox="0 0 340 70" width="200">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
        </div>
        <h2 style="color: #8B1A1A;">تقرير ${data.reportType}</h2>
        <p style="line-height: 1.6; color: #333;">مرحباً ${data.name}،</p>
        <p style="line-height: 1.6; color: #333;">إليك التقرير المطلوب:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          ${data.summary}
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.reportUrl}" style="background: #8B1A1A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">تحميل التقرير</a>
        </div>
        <hr style="margin: 20px 0; border-color: #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">© 2024 United Experts. جميع الحقوق محفوظة</p>
      </div>
    `
  }
};

// ==========================================
// خدمة البريد الإلكتروني
// ==========================================

/**
 * إرسال بريد إلكتروني
 * ملاحظة: في بيئة الإنتاج، يجب استخدام Firebase Cloud Functions
 * أو خدمة خارجية مثل SendGrid, Mailgun, Resend
 */
export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    // تسجيل البريد في Firestore لمتابعة حالة الإرسال
    const emailRef = await addDoc(collection(db, 'emails'), {
      ...emailData,
      status: 'pending',
      createdAt: Date.now(),
      attempts: 0
    });
    
    // محاكاة إرسال البريد (في الإنتاج، استخدم خدمة حقيقية)
    console.log(`📧 Sending email to ${emailData.to}`);
    console.log(`Subject: ${emailData.subject}`);
    console.log(`Body: ${emailData.body.substring(0, 200)}...`);
    
    // تحديث حالة البريد
    await updateDoc(doc(db, 'emails', emailRef.id), {
      status: 'sent',
      sentAt: Date.now()
    });
    
    // عرض إشعار للمستخدم (في بيئة التطوير)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Email sent successfully to ${emailData.to}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

/**
 * إرسال بريد باستخدام قالب
 */
export const sendTemplateEmail = async (
  to: string,
  toName: string,
  type: EmailType,
  data: Record<string, any>,
  metadata?: Record<string, any>
): Promise<boolean> => {
  const template = emailTemplates[type];
  if (!template) {
    console.error(`Template not found for type: ${type}`);
    return false;
  }
  
  // معالجة المتغيرات في الموضوع
  let subject = template.subject;
  Object.entries(data).forEach(([key, value]) => {
    subject = subject.replace(`\${data.${key}}`, String(value));
  });
  
  const body = template.getBody(data);
  
  return sendEmail({
    to,
    toName,
    subject,
    body,
    type,
    metadata
  });
};

/**
 * إرسال بريد ترحيبي لمستخدم جديد
 */
export const sendWelcomeEmail = async (
  email: string,
  name: string,
  password: string
): Promise<boolean> => {
  const loginUrl = `${window.location.origin}/login`;
  
  return sendTemplateEmail(email, name, 'welcome', {
    name,
    email,
    password,
    loginUrl
  });
};

/**
 * إرسال رابط إعادة تعيين كلمة المرور
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> => {
  const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;
  
  return sendTemplateEmail(email, name, 'password_reset', {
    name,
    resetUrl
  });
};

/**
 * إرسال رابط سحري لتسجيل الدخول
 */
export const sendMagicLinkEmail = async (
  email: string,
  name: string,
  magicLink: string
): Promise<boolean> => {
  return sendTemplateEmail(email, name, 'magic_link', {
    name,
    magicLink
  });
};

/**
 * إرسال إشعار بتعيين مهمة
 */
export const sendTaskAssignedEmail = async (
  email: string,
  name: string,
  taskTitle: string,
  assignedBy: string,
  date: string,
  time: string,
  priority: string,
  description: string,
  taskUrl: string
): Promise<boolean> => {
  return sendTemplateEmail(email, name, 'task_assigned', {
    name,
    taskTitle,
    assignedBy,
    date,
    time,
    priority,
    description,
    taskUrl
  });
};

/**
 * إرسال دعوة اجتماع
 */
export const sendMeetingInviteEmail = async (
  email: string,
  name: string,
  meetingTitle: string,
  invitedBy: string,
  date: string,
  time: string,
  type: string,
  meetingLink: string,
  notes: string,
  meetingUrl: string
): Promise<boolean> => {
  return sendTemplateEmail(email, name, 'meeting_invite', {
    name,
    meetingTitle,
    invitedBy,
    date,
    time,
    type,
    meetingLink,
    notes,
    meetingUrl
  });
};

/**
 * إرسال إشعار إشارة (Mention)
 */
export const sendMentionEmail = async (
  email: string,
  name: string,
  mentionedBy: string,
  type: string,
  title: string,
  message: string,
  url: string
): Promise<boolean> => {
  return sendTemplateEmail(email, name, 'mention', {
    name,
    mentionedBy,
    type,
    title,
    message,
    url
  });
};

/**
 * إرسال إشعار طلب موافقة
 */
export const sendApprovalRequestEmail = async (
  email: string,
  name: string,
  requesterName: string,
  requesterEmail: string,
  requesterPhone: string,
  department: string,
  approvalUrl: string
): Promise<boolean> => {
  return sendTemplateEmail(email, name, 'approval_request', {
    name,
    requesterName,
    requesterEmail,
    requesterPhone,
    department,
    approvalUrl
  });
};

/**
 * إرسال رد على طلب الانضمام
 */
export const sendApprovalResponseEmail = async (
  email: string,
  name: string,
  status: 'approved' | 'rejected',
  loginUrl?: string
): Promise<boolean> => {
  return sendTemplateEmail(email, name, 'approval_response', {
    name,
    status,
    loginUrl
  });
};

/**
 * إرسال تذكير
 */
export const sendReminderEmail = async (
  email: string,
  name: string,
  type: string,
  title: string,
  date: string,
  time: string,
  remainingTime: string,
  url: string
): Promise<boolean> => {
  return sendTemplateEmail(email, name, 'reminder', {
    name,
    type,
    title,
    date,
    time,
    remainingTime,
    url
  });
};

/**
 * إرسال تقرير
 */
export const sendReportEmail = async (
  email: string,
  name: string,
  reportType: string,
  summary: string,
  reportUrl: string
): Promise<boolean> => {
  return sendTemplateEmail(email, name, 'report', {
    name,
    reportType,
    summary,
    reportUrl
  });
};

/**
 * الحصول على حالة البريد الإلكتروني
 */
export const getEmailStatus = async (emailId: string) => {
  try {
    const emailRef = doc(db, 'emails', emailId);
    const emailDoc = await getDoc(emailRef);
    if (emailDoc.exists()) {
      return emailDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting email status:', error);
    return null;
  }
};

/**
 * إعادة محاولة إرسال البريد الفاشل
 */
export const retryFailedEmails = async () => {
  try {
    const q = query(
      collection(db, 'emails'),
      where('status', '==', 'failed'),
      where('attempts', '<', 3)
    );
    
    const snapshot = await getDocs(q);
    const results = { success: 0, failed: 0 };
    
    for (const doc of snapshot.docs) {
      const emailData = doc.data() as EmailData;
      const success = await sendEmail(emailData);
      
      await updateDoc(doc.ref, {
        status: success ? 'sent' : 'failed',
        attempts: (emailData.attempts || 0) + 1,
        lastAttemptAt: Date.now()
      });
      
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error retrying failed emails:', error);
    return { success: 0, failed: 0 };
  }
};

export default {
  sendEmail,
  sendTemplateEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendTaskAssignedEmail,
  sendMeetingInviteEmail,
  sendMentionEmail,
  sendApprovalRequestEmail,
  sendApprovalResponseEmail,
  sendReminderEmail,
  sendReportEmail,
  getEmailStatus,
  retryFailedEmails
};