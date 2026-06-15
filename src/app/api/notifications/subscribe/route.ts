import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { decryptSession } from "@/lib/session";

export async function POST(request: Request) {
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

    const { subscription } = await request.json();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: "Yêu cầu đăng ký không hợp lệ" }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Thiếu các khóa mã hóa subscription" }, { status: 400 });
    }

    // Use URL-safe base64 or URI encoding for document ID to ensure it is valid in Firestore
    const docId = encodeURIComponent(endpoint);
    const subRef = doc(db, "pushSubscriptions", docId);
    
    const pushSub = {
      userId: session.userId,
      endpoint,
      p256dh,
      auth,
      updatedAt: new Date().toISOString()
    };

    await setDoc(subRef, pushSub);

    return NextResponse.json({ success: true, subscription: pushSub });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: "Không thể lưu thông tin đăng ký nhận thông báo" }, { status: 500 });
  }
}
