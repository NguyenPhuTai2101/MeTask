import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const payload = await getSessionUser();

    if (!payload) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ 
      user: {
        id: payload.userId,
        email: payload.email,
        fullName: payload.fullName,
        avatarUrl: payload.avatarUrl,
        systemRole: payload.systemRole || "User",
        status: payload.status || "active",
        role: payload.role
      } 
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông tin phiên làm việc" },
      { status: 500 }
    );
  }
}
