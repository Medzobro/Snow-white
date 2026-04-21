# Snow White — لوحة التحكم

## هيكل المشروع

```
snowwhite/
├── index.html              ← الصفحة الرئيسية
├── css/
│   └── style.css           ← كل التنسيقات
├── js/
│   ├── firebase-config.js  ← ← ← ضع بياناتك هنا
│   └── app.js              ← كل المنطق والوظائف
└── README.md
```

---

## إعداد Firebase (خطوة بخطوة)

### 1. إنشاء مشروع Firebase

1. افتح [https://console.firebase.google.com](https://console.firebase.google.com)
2. اضغط **Add project**
3. اكتب اسم المشروع مثلاً `snow-white-store`
4. أوقف Google Analytics (اختياري) ← اضغط **Create project**

---

### 2. إنشاء قاعدة البيانات (Firestore)

1. من القائمة الجانبية اختر **Firestore Database**
2. اضغط **Create database**
3. اختر **Start in test mode** (للتطوير)
4. اختر المنطقة الأقرب مثلاً `europe-west1` أو `asia-east1`
5. اضغط **Enable**

---

### 3. الحصول على بيانات الاتصال

1. اضغط على **أيقونة الترس** ⚙️ بجانب **Project Overview**
2. اختر **Project settings**
3. نزّل للأسفل إلى قسم **Your apps**
4. اضغط على أيقونة `</>` (Web)
5. اكتب اسماً للتطبيق مثل `admin`
6. اضغط **Register app**
7. ستظهر لك بيانات مثل هذه:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "snow-white-store.firebaseapp.com",
  projectId: "snow-white-store",
  storageBucket: "snow-white-store.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

### 4. ضع البيانات في المشروع

افتح ملف `js/firebase-config.js` والصق بياناتك:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",        // ← من Firebase
  authDomain:        "snow-white-store.firebaseapp.com",
  projectId:         "snow-white-store",
  storageBucket:     "snow-white-store.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

---

### 5. تشغيل الموقع

#### الطريقة الأولى: VS Code Live Server (الأسهل)
1. افتح مجلد `snowwhite` في VS Code
2. ثبّت إضافة **Live Server**
3. كليك يمين على `index.html` ← **Open with Live Server**

#### الطريقة الثانية: Terminal
```bash
cd snowwhite
npx serve .
```
ثم افتح `http://localhost:3000`

> ⚠️ لا تفتح الملف مباشرة بـ `file://` — Firebase لا يعمل بدون سيرفر

---

### 6. إعداد Firestore Rules (للإنتاج لاحقاً)

في **Firestore → Rules** ضع هذا:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // تطوير فقط
    }
  }
}
```

---

## المميزات

- ✅ إضافة منتجات مع اسم، فئة، سعر، كمية، وصف، emoji
- ✅ حذف منتجات مع تأكيد
- ✅ تعديل كل بيانات المنتج
- ✅ تعديل الكمية مباشرة من الجدول
- ✅ فلتر حسب الفئة
- ✅ بحث فوري
- ✅ إحصائيات المخزون
- ✅ إدارة الفئات
- ✅ مؤشر اتصال Firebase
- ✅ تحديثات فورية (Realtime)
