import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { encryptSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { token, email, fullName, role } = await request.json();

    if (!token || !email || !fullName) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ thông tin đăng ký" },
        { status: 400 }
      );
    }

    // 1. Verify ID Token using Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userRole = role || "Member";
    const defaultAvatarUrl = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100`;

    // 2. Create user document in Firestore
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      id: uid,
      email: email.toLowerCase(),
      fullName,
      avatarUrl: defaultAvatarUrl,
      createdAt: new Date().toISOString(),
    });

    // 3. Create session token
    const sessionToken = encryptSession({
      userId: uid,
      email: email.toLowerCase(),
      fullName,
      avatarUrl: defaultAvatarUrl,
      role: userRole,
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
        role: userRole,
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
