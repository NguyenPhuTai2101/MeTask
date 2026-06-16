import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { encryptSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { token, email } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token xác thực không hợp lệ" },
        { status: 400 }
      );
    }

    // 1. Verify ID Token using Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 2. Fetch user details from Firestore
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản người dùng trong hệ thống" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // 4. Create session token using encryptSession
    const sessionToken = encryptSession({
      userId: uid,
      email: userData.email,
      fullName: userData.fullName,
      avatarUrl: userData.avatarUrl || null,
      systemRole: userData.systemRole || "User",
      status: userData.status || "active",
    });

    // 5. Set session cookie
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
        email: userData.email,
        fullName: userData.fullName,
        avatarUrl: userData.avatarUrl || null,
        systemRole: userData.systemRole || "User",
        status: userData.status || "active",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Đăng nhập không thành công. Hãy chắc chắn Cloud Firestore đã được tạo và kích hoạt trên console Firebase." },
      { status: 500 }
    );
  }
}
