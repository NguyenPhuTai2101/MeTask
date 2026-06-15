import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin SDK using only the Project ID
// This is sufficient for verifying client ID tokens using public keys
if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "metask-38f20",
  });
}

const adminAuth = getAuth();

export { adminAuth };
