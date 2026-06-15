import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { decryptSession } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("metask_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const session = decryptSession(sessionCookie);
    if (!session) {
      return NextResponse.json({ error: "Phiên làm việc hết hạn" }, { status: 401 });
    }

    const ref = collection(db, "notifications");
    const q = query(ref, where("userId", "==", session.userId));
    const snapshot = await getDocs(q);
    
    const notifications = snapshot.docs.map(doc => doc.data());
    
    // Sort desc by createdAt
    notifications.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Không thể lấy danh sách thông báo" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("metask_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const session = decryptSession(sessionCookie);
    if (!session) {
      return NextResponse.json({ error: "Phiên làm việc hết hạn" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId } = body;

    const ref = collection(db, "notifications");
    if (notificationId) {
      await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
    } else {
      // Mark all as read
      const q = query(ref, where("userId", "==", session.userId), where("isRead", "==", false));
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        await updateDoc(doc(db, "notifications", d.id), { isRead: true });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json({ error: "Không thể cập nhật trạng thái thông báo" }, { status: 500 });
  }
}
