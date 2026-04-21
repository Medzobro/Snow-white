// ═══════════════════════════════════════════════════════
//  firebase-config.js
//  ضع هنا بيانات مشروعك من Firebase Console
//  راجع ملف README.md لشرح كيفية الحصول عليها
// ═══════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "ضع_API_KEY_هنا",
  authDomain:        "ضع_PROJECT_ID_هنا.firebaseapp.com",
  projectId:         "ضع_PROJECT_ID_هنا",
  storageBucket:     "ضع_PROJECT_ID_هنا.appspot.com",
  messagingSenderId: "ضع_SENDER_ID_هنا",
  appId:             "ضع_APP_ID_هنا"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
