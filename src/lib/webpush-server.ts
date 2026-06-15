import webpush from "web-push";
import { db } from "./firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@metask.com",
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn("VAPID keys are missing from environment variables. Web Push is disabled.");
}

export async function sendWebPushNotification(
  userId: string,
  title: string,
  message: string,
  link?: string
) {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  try {
    const subsRef = collection(db, "pushSubscriptions");
    const q = query(subsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const subscriptions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: link || "/dashboard",
      },
    });

    const promises = subscriptions.map(async (sub) => {
      const subscriptionObj = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(subscriptionObj, payload);
      } catch (error: any) {
        // Handle expired/invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Deleting expired push subscription: ${sub.id}`);
          await deleteDoc(doc(db, "pushSubscriptions", sub.id)).catch(() => {});
        } else {
          console.error("Web Push sending failed for subscription:", error);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to send Web Push notifications:", err);
  }
}
