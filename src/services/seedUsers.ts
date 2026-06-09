import { doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { UserProfile } from "../types";

export const seedInitialUsers = async () => {
  const users: UserProfile[] = [
    {
      uid: "chairman_uid_here", // سيتم ربطه بحساب الـ Auth
      name: "محمد آل نصار (أبو نواف)",
      email: "mohd@uexperts.sa",
      phone: "+966568652222",
      department: "الإدارة العليا",
      primaryRole: "chairman",
      additionalTitles: ["رئيس مجلس الإدارة"],
      isActive: true
    },
    {
      uid: "vp_uid_here",
      name: "علي آل رابعة القحطاني",
      email: "ali@uexperts.sa",
      phone: "+966556333301",
      department: "التسويق",
      primaryRole: "vp",
      additionalTitles: ["نائب رئيس مجلس الإدارة", "مدير التسويق"],
      isActive: true
    },
    {
      uid: "othman_uid_here",
      name: "محمد عثمان",
      email: "m.othman@uexperts.sa",
      phone: "+966539303952", // جوالك
      department: "المالية والتدقيق",
      primaryRole: "manager", // الصلاحية الأساسية
      additionalTitles: ["مستشار رئيس مجلس الإدارة"], // الألقاب الإضافية
      isActive: true
    },
    {
      uid: "muharib_uid_here",
      name: "خالد المحارب",
      email: "muharib@uexperts.sa",
      phone: "+966542222207",
      department: "العلاقات العامة",
      primaryRole: "manager",
      additionalTitles: ["مستشار رئيس مجلس الإدارة"],
      isActive: true
    }
  ];

  for (const user of users) {
    await setDoc(doc(db, "users", user.email), user); // نستخدم الإيميل كمعرف أولي لسهولة الربط
  }
  console.log("تم تهيئة قاعدة البيانات والإدارة العليا بنجاح!");
};