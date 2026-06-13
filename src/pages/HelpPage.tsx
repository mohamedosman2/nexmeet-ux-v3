import React, { useState } from 'react';
import { 
  FaQuestionCircle, 
  FaTasks, 
  FaVideo, 
  FaUsers, 
  FaBuilding, 
  FaBell, 
  FaKey, 
  FaUserCog, 
  FaComments, 
  FaCalendarAlt, 
  FaSearch, 
  FaDownload, 
  FaPrint, 
  FaEnvelope, 
  FaPhone, 
  FaWhatsapp, 
  FaTelegram, 
  FaTwitter, 
  FaLinkedin,
  FaShieldAlt
} from 'react-icons/fa';

// ==========================================
// صفحة المساعدة والدعم الفني
// ==========================================

export const HelpPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showContactForm, setShowContactForm] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [sendingContact, setSendingContact] = useState<boolean>(false);

  // ==========================================
  // الأسئلة الشائعة (FAQ)
  // ==========================================

  const faqs: Record<string, { q: string; a: string; icon: JSX.Element }[]> = {
    general: [
      { 
        q: 'ما هو نظام United Experts؟', 
        a: 'United Experts هو نظام متكامل لإدارة المهام والاجتماعات والتواصل بين الموظفين، مصمم خصيصاً لشركة UX - خبراء المتحدة.',
        icon: <FaQuestionCircle className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تسجيل الدخول إلى النظام؟', 
        a: 'يمكنك تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور الخاصة بك. إذا كنت موظفاً جديداً، سيتم إرسال بيانات الدخول إلى بريدك الإلكتروني.',
        icon: <FaQuestionCircle className="text-brand" size={18} />
      },
      { 
        q: 'ماذا أفعل إذا نسيت كلمة المرور؟', 
        a: 'انقر على رابط "نسيت كلمة المرور" في صفحة تسجيل الدخول، وأدخل بريدك الإلكتروني. ستتلقى رابطاً لإعادة تعيين كلمة المرور.',
        icon: <FaKey className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تغيير اللغة؟', 
        a: 'اذهب إلى صفحة الإعدادات (Settings) من القائمة الجانبية، ثم اختر اللغة المفضلة (العربية أو الإنجليزية).',
        icon: <FaQuestionCircle className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تغيير المظهر (الوضع الداكن/الفاتح)؟', 
        a: 'اذهب إلى صفحة الإعدادات، ثم اختر المظهر المفضل (داكن أو فاتح).',
        icon: <FaQuestionCircle className="text-brand" size={18} />
      }
    ],
    tasks: [
      { 
        q: 'كيف يمكنني إنشاء مهمة جديدة؟', 
        a: 'يمكنك إنشاء مهمة جديدة من خلال الذهاب إلى صفحة المهام والضغط على زر "مهمة جديدة". املأ البيانات المطلوبة (العنوان، التاريخ، الوقت، الأولوية، إلخ) ثم اضغط حفظ.',
        icon: <FaTasks className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تعيين مسؤولين لمهمة؟', 
        a: 'عند إنشاء أو تعديل مهمة، يمكنك إضافة المسؤولين من قائمة المستخدمين. سيتم إشعارهم عبر الإشعارات.',
        icon: <FaUsers className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني رفع مرفقات للمهمة؟', 
        a: 'في نافذة المهمة، يوجد قسم خاص لرفع المرفقات. يمكنك رفع ملفات تصل إلى 10 ميجابايت (صور، PDF، مستندات، إلخ).',
        icon: <FaQuestionCircle className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تغيير حالة المهمة؟', 
        a: 'من صفحة المهام، يمكنك تغيير حالة المهمة عن طريق القائمة المنسدلة بجانب كل مهمة (لم تبدأ / جارية / مكتملة).',
        icon: <FaQuestionCircle className="text-brand" size={18} />
      },
      { 
        q: 'ماذا تعني الأولويات المختلفة للمهام؟', 
        a: 'الأولوية العالية (حمراء): مهام عاجلة يجب إنجازها فوراً. الأولوية المتوسطة (برتقالية): مهام مهمة. الأولوية المنخفضة (خضراء): مهام يمكن تأجيلها.',
        icon: <FaQuestionCircle className="text-brand" size={18} />
      }
    ],
    meetings: [
      { 
        q: 'كيف يمكنني جدولة اجتماع جديد؟', 
        a: 'اذهب إلى صفحة الاجتماعات واضغط على زر "اجتماع جديد". اختر نوع الاجتماع (عن بُعد أو حضوري)، وحدد التاريخ والوقت والمشاركين.',
        icon: <FaVideo className="text-brand" size={18} />
      },
      { 
        q: 'ما الفرق بين الاجتماع عن بُعد والحضوري؟', 
        a: 'الاجتماع عن بُعد يتم عبر الإنترنت باستخدام منصات مثل Zoom أو Google Meet. الاجتماع الحضوري يتم في مقر الشركة أو أحد الفروع.',
        icon: <FaQuestionCircle className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني الانضمام إلى اجتماع عن بُعد؟', 
        a: 'من صفحة الاجتماعات، اضغط على زر "انضمام" بجانب الاجتماع. سيتم فتح رابط الاجتماع في نافذة جديدة.',
        icon: <FaVideo className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني إرسال تذكير للمشاركين في الاجتماع؟', 
        a: 'من صفحة تفاصيل الاجتماع، يمكنك الضغط على زر "إرسال تذكير" لإشعار جميع المشاركين عبر الإشعارات.',
        icon: <FaBell className="text-brand" size={18} />
      },
      { 
        q: 'ماذا تشمل مرافق فروع الشركة؟', 
        a: 'جميع الفروع مجهزة بقاعات اجتماعات، واي فاي، ميكروفونات، شاشات عرض، ومواقف سيارات. بعض الفروع توفر بوفيه مفتوح وكافيتيريا.',
        icon: <FaBuilding className="text-brand" size={18} />
      }
    ],
    chat: [
      { 
        q: 'كيف يمكنني بدء محادثة مع موظف آخر؟', 
        a: 'اذهب إلى صفحة المحادثات، واختر الموظف من قائمة المحادثات الخاصة. يمكنك إرسال رسائل نصية وملفات وصور.',
        icon: <FaComments className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني إنشاء مكالمة صوتية أو فيديو؟', 
        a: 'في صفحة المحادثات، افتح محادثة مع موظف، ثم اضغط على أيقونة الهاتف للمكالمة الصوتية أو أيقونة الكاميرا لمكالمة الفيديو.',
        icon: <FaComments className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني الإشارة إلى شخص ما (@منشن)؟', 
        a: 'اكتب @ ثم اسم الشخص في رسالتك. سيتم إشعار الشخص المشار إليه.',
        icon: <FaComments className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تعديل أو حذف رسالة؟', 
        a: 'مرر الماوس فوق الرسالة التي أرسلتها، ستظهر أزرار التعديل والحذف.',
        icon: <FaComments className="text-brand" size={18} />
      },
      { 
        q: 'هل يمكنني رفع ملفات في المحادثة؟', 
        a: 'نعم، يمكنك رفع ملفات (صور، مستندات) حتى 10 ميجابايت عن طريق الضغط على أيقونة المرفقات.',
        icon: <FaComments className="text-brand" size={18} />
      }
    ],
    calendar: [
      { 
        q: 'كيف يمكنني عرض المهام في التقويم؟', 
        a: 'اذهب إلى صفحة التقويم (لوحة التحكم). ستظهر المهام كنقاط ملونة في الأيام المحددة. اضغط على أي يوم لعرض مهامه.',
        icon: <FaCalendarAlt className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني التنقل بين الأشهر في التقويم؟', 
        a: 'استخدم أزرار الأسهم (يمين/يسار) أعلى التقويم للتنقل بين الأشهر. يمكنك أيضاً الضغط على زر "اليوم" للعودة إلى الشهر الحالي.',
        icon: <FaCalendarAlt className="text-brand" size={18} />
      },
      { 
        q: 'ماذا تعني الألوان المختلفة في التقويم؟', 
        a: 'الأحمر: مهام عالية الأولوية، البرتقالي: مهام متوسطة الأولوية، الأخضر: مهام منخفضة الأولوية.',
        icon: <FaCalendarAlt className="text-brand" size={18} />
      }
    ],
    profile: [
      { 
        q: 'كيف يمكنني تحديث صورتي الشخصية؟', 
        a: 'اذهب إلى صفحة الملف الشخصي، اضغط على الصورة الحالية، ثم اختر صورة جديدة من جهازك.',
        icon: <FaUserCog className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تغيير كلمة المرور؟', 
        a: 'اذهب إلى صفحة الملف الشخصي، ثم اختر تبويب "الأمان". أدخل كلمة المرور الحالية ثم الجديدة.',
        icon: <FaKey className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تغيير إعدادات الإشعارات؟', 
        a: 'اذهب إلى صفحة الإعدادات (Settings) من القائمة الجانبية، ثم عدل الإشعارات حسب رغبتك.',
        icon: <FaBell className="text-brand" size={18} />
      }
    ],
    admin: [
      { 
        q: 'كيف يمكنني إضافة مستخدم جديد؟', 
        a: 'اذهب إلى لوحة التحكم > إدارة المستخدمين، ثم اضغط على زر "إضافة مستخدم جديد". املأ البيانات المطلوبة.',
        icon: <FaUsers className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني ترقية موظف إلى مدير؟', 
        a: 'في صفحة إدارة المستخدمين، اضغط على أيقونة التاج (👑) بجانب المستخدم لترقيته إلى مدير.',
        icon: <FaUserCog className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني منح صلاحية استثنائية لمستخدم؟', 
        a: 'في صفحة إدارة المستخدمين، اضغط على أيقونة الدرع 🛡️ بجانب المستخدم لمنحه صلاحية الوصول إلى لوحة التحكم.',
        icon: <FaShieldAlt className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني إضافة إدارة جديدة؟', 
        a: 'اذهب إلى لوحة التحكم > إدارة الإدارات، ثم اضغط على زر "إدارة جديدة". أدخل اسم الإدارة.',
        icon: <FaBuilding className="text-brand" size={18} />
      },
      { 
        q: 'كيف يمكنني تصدير تقرير عن المستخدمين؟', 
        a: 'في صفحة إدارة المستخدمين، اضغط على زر "تصدير" لتحميل ملف CSV ببيانات المستخدمين.',
        icon: <FaDownload className="text-brand" size={18} />
      }
    ]
  };

  // ==========================================
  // الفئات المتاحة للأسئلة الشائعة
  // ==========================================

  const categories = [
    { id: 'general', name: 'عام', icon: <FaQuestionCircle size={16} /> },
    { id: 'tasks', name: 'المهام', icon: <FaTasks size={16} /> },
    { id: 'meetings', name: 'الاجتماعات', icon: <FaVideo size={16} /> },
    { id: 'chat', name: 'المحادثات', icon: <FaComments size={16} /> },
    { id: 'calendar', name: 'التقويم', icon: <FaCalendarAlt size={16} /> },
    { id: 'profile', name: 'الملف الشخصي', icon: <FaUserCog size={16} /> },
    { id: 'admin', name: 'الإدارة', icon: <FaShieldAlt size={16} /> }
  ];

  // ==========================================
  // فلترة الأسئلة حسب البحث
  // ==========================================

  const getFilteredFaqs = () => {
    if (!searchQuery.trim()) {
      return faqs[activeCategory as keyof typeof faqs] || [];
    }
    
    const allFaqs = Object.values(faqs).flat();
    return allFaqs.filter(faq => 
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredFaqs = getFilteredFaqs();

  // ==========================================
  // إرسال نموذج الاتصال
  // ==========================================

  const handleSendContact = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    setSendingContact(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setShowContactForm(false);
    } catch (error) {
      console.error('Error sending contact:', error);
      alert('حدث خطأ في إرسال الرسالة. يرجى المحاولة لاحقاً.');
    } finally {
      setSendingContact(false);
    }
  };

  // ==========================================
  // معلومات الاتصال
  // ==========================================

  const contactInfo = [
    { icon: <FaEnvelope className="text-brand" size={18} />, title: 'البريد الإلكتروني', value: 'support@uexperts.sa', action: 'mailto:support@uexperts.sa' },
    { icon: <FaPhone className="text-brand" size={18} />, title: 'الهاتف', value: '+966 11 123 4567', action: 'tel:+966111234567' },
    { icon: <FaWhatsapp className="text-green-500" size={18} />, title: 'WhatsApp', value: '+966 55 123 4567', action: 'https://wa.me/966551234567' },
    { icon: <FaTelegram className="text-blue-500" size={18} />, title: 'Telegram', value: '@uexperts_support', action: 'https://t.me/uexperts_support' }
  ];

  // ==========================================
  // الواجهة الرئيسية للصفحة
  // ==========================================

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fadeIn">
      
      {/* ==========================================
           عنوان الصفحة
      ========================================== */}
      
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-brand/10">
          <FaQuestionCircle className="text-brand text-3xl" />
        </div>
        <h1 className="text-2xl font-bold">مركز المساعدة والدعم الفني</h1>
        <p className="text-gray-500 mt-2">دليل استخدام النظام والإجابة على الأسئلة الشائعة</p>
      </div>
      
      {/* ==========================================
           شريط البحث
      ========================================== */}
      
      <div className="relative max-w-md mx-auto mb-8">
        <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في مركز المساعدة..."
          className="input pr-10"
        />
      </div>
      
      {/* ==========================================
           تبويبات الفئات
      ========================================== */}
      
      <div className="flex flex-wrap gap-2 justify-center mb-8 border-b pb-4" style={{ borderColor: 'var(--bd)' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeCategory === cat.id 
                ? 'bg-brand text-white' 
                : 'text-gray-500 hover:bg-hv'
            }`}
          >
            {cat.icon}
            {cat.name}
          </button>
        ))}
      </div>
      
      {/* ==========================================
           الأسئلة الشائعة
      ========================================== */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {filteredFaqs.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <FaSearch className="text-4xl mx-auto mb-3 text-gray-500" />
            <p className="text-gray-500">لا توجد نتائج مطابقة لبحثك</p>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => (
            <div key={index} className="card hover:border-brand transition-all cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {faq.icon}
                </div>
                <div>
                  <h3 className="font-bold mb-2 group-hover:text-brand transition-colors">{faq.q}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* ==========================================
           روابط سريعة
      ========================================== */}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="card text-center cursor-pointer hover:border-brand transition-all" onClick={() => window.location.href = '/tasks'}>
          <FaTasks className="mx-auto mb-2 text-brand" size={24} />
          <h3 className="font-bold text-sm">إدارة المهام</h3>
          <p className="text-xs text-gray-500 mt-1">إنشاء وتعديل المهام</p>
        </div>
        <div className="card text-center cursor-pointer hover:border-brand transition-all" onClick={() => window.location.href = '/meetings'}>
          <FaVideo className="mx-auto mb-2 text-brand" size={24} />
          <h3 className="font-bold text-sm">جدولة الاجتماعات</h3>
          <p className="text-xs text-gray-500 mt-1">إنشاء وإدارة الاجتماعات</p>
        </div>
        <div className="card text-center cursor-pointer hover:border-brand transition-all" onClick={() => window.location.href = '/profile'}>
          <FaUserCog className="mx-auto mb-2 text-brand" size={24} />
          <h3 className="font-bold text-sm">الملف الشخصي</h3>
          <p className="text-xs text-gray-500 mt-1">تحديث بياناتك الشخصية</p>
        </div>
        <div className="card text-center cursor-pointer hover:border-brand transition-all" onClick={() => window.location.href = '/settings'}>
          <FaBell className="mx-auto mb-2 text-brand" size={24} />
          <h3 className="font-bold text-sm">الإعدادات</h3>
          <p className="text-xs text-gray-500 mt-1">تخصيص تجربتك</p>
        </div>
      </div>
      
      {/* ==========================================
           معلومات الاتصال والدعم
      ========================================== */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* بطاقة معلومات الاتصال */}
        <div className="card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FaEnvelope className="text-brand" />
            تواصل مع الدعم الفني
          </h3>
          <div className="space-y-3">
            {contactInfo.map((info, idx) => (
              <a
                key={idx}
                href={info.action}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-hv transition-colors"
              >
                {info.icon}
                <div>
                  <p className="text-xs text-gray-500">{info.title}</p>
                  <p className="text-sm font-medium">{info.value}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
        
        {/* بطاقة نموذج الاتصال */}
        <div className="card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FaEnvelope className="text-brand" />
            أرسل استفسارك
          </h3>
          
          {!showContactForm ? (
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-4">لم تجد إجابة لسؤالك؟</p>
              <button
                onClick={() => setShowContactForm(true)}
                className="btn-primary"
              >
                تواصل مع الدعم
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="input"
                  placeholder="أدخل اسمك"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="input"
                  placeholder="example@uexperts.sa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الرسالة</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="textarea"
                  rows={4}
                  placeholder="اكتب استفسارك هنا..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowContactForm(false)}
                  className="btn-outline flex-1"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSendContact}
                  disabled={sendingContact}
                  className="btn-primary flex-1"
                >
                  {sendingContact ? 'جاري الإرسال...' : 'إرسال'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* ==========================================
           وسائل التواصل الاجتماعي
      ========================================== */}
      
      <div className="text-center mt-8 pt-6 border-t" style={{ borderColor: 'var(--bd)' }}>
        <p className="text-sm text-gray-500 mb-3">تابعنا على وسائل التواصل الاجتماعي</p>
        <div className="flex justify-center gap-4">
          <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-hv hover:bg-brand/20 transition-colors">
            <FaTwitter className="text-blue-400" size={18} />
          </a>
          <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-hv hover:bg-brand/20 transition-colors">
            <FaLinkedin className="text-blue-600" size={18} />
          </a>
          <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-hv hover:bg-brand/20 transition-colors">
            <FaWhatsapp className="text-green-500" size={18} />
          </a>
          <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-hv hover:bg-brand/20 transition-colors">
            <FaTelegram className="text-blue-500" size={18} />
          </a>
        </div>
      </div>
      
    </div>
  );
};

export default HelpPage;