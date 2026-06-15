import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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

    // 3. Find user's role from projects
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("memberIds", "array-contains", uid));
    const projectDocs = await getDocs(q);

    let role = "Member";
    if (!projectDocs.empty) {
      const proj = projectDocs.docs[0].data();
      const member = proj.members?.find((m: any) => m.userId === uid);
      if (member) {
        role = member.role;
      }
    }

    // 4. Create session token using encryptSession
    const sessionToken = encryptSession({
      userId: uid,
      email: userData.email,
      fullName: userData.fullName,
      avatarUrl: userData.avatarUrl || null,
      role,
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
        role,
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
