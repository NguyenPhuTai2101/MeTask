import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ count: 0 });
    }

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", session.userId),
      where("isRead", "==", false)
    );
    
    const countSnapshot = await getCountFromServer(q);
    const unreadCount = countSnapshot.data().count;

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error("Failed to fetch unread notifications count:", error);
    return NextResponse.json({ count: 0 });
  }
}
