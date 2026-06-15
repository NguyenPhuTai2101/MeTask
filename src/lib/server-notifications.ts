import { db } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { sendWebPushNotification } from "./webpush-server";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "TaskAssigned" | "NewComment" | "StatusChanged" | "Overload",
  link?: string
) {
  try {
    const id = `notif-${Date.now()}`;
    const notification = {
      id,
      userId,
      title,
      message,
      type,
      link: link || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "notifications", id), notification);

    // Send Web Push notification asynchronously
    sendWebPushNotification(userId, title, message, link).catch((err) => {
      console.error("Web push dispatch failed:", err);
    });

    return notification;
  } catch (error) {
    console.error("Failed to create database notification:", error);
  }
}
