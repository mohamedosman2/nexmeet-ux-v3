rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // دالة مساعدة للتحقق مما إذا كان المستخدم مسجل دخول
    function isAuthenticated() {
      return request.auth != null;
    }

    // السماح للمستخدمين المسجلين بالتعامل مع جميع المستندات (المهام، الاجتماعات، الإشعارات، الخ)
    // الحماية المتقدمة للصلاحيات (رئيس مجلس إدارة، مدير) ستتم برمجياً من داخل كود React
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}