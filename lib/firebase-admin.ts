import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Firebase Admin configuration
const adminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  projectId: process.env.FIREBASE_PROJECT_ID,
};

// Initialize Firebase Admin (only once)
const adminApp = getApps().length === 0 
  ? initializeApp(adminConfig, 'admin')
  : getApps().find(app => app.name === 'admin') || initializeApp(adminConfig, 'admin');

// Initialize Firebase Admin services
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

export default adminApp; 