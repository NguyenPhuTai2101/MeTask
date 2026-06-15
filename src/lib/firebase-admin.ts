import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Automatically use the Client's Project ID if the Server-side one is not set on Vercel
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "metask-38f20";

if (!getApps().length) {
  initializeApp({
    projectId: projectId,
  });
}

const adminAuth = getAuth();

export { adminAuth };
