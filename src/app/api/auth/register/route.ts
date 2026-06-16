import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { encryptSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { token, email, fullName } = await request.json();

    if (!token || !email || !fullName) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ thông tin đăng ký" },
        { status: 400 }
      );
    }

    // 1. Verify ID Token using Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const defaultAvatarUrl = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100`;

    // Check if this is the first user ever
    const { collection, getDocs, limit, query } = await import("firebase/firestore");
    const usersRef = collection(db, "users");
    const q = query(usersRef, limit(1));
    const snapshot = await getDocs(q);
    const isFirstUser = snapshot.empty;

    const systemRole = isFirstUser ? "Admin" : "User";
    const status = isFirstUser ? "active" : "pending";

    // 2. Create user document in Firestore
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      id: uid,
      email: email.toLowerCase(),
      fullName,
      avatarUrl: defaultAvatarUrl,
      systemRole,
      status,
      createdAt: new Date().toISOString(),
    });

    // 3. Create session token
    const sessionToken = encryptSession({
      userId: uid,
      email: email.toLowerCase(),
      fullName,
      avatarUrl: defaultAvatarUrl,
      systemRole,
      status,
    });

    // 4. Set cookie
    const cookieStore = await cookies();
    cookieStore.set("metask_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: uid,
        email: email.toLowerCase(),
        fullName,
        avatarUrl: defaultAvatarUrl,
        systemRole,
        status,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Đăng ký không thành công. Hãy chắc chắn Cloud Firestore đã được kích hoạt trên console Firebase." },
      { status: 500 }
    );
  }
}
