import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("metask_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ user: null });
    }

    const payload = decryptSession(sessionCookie);

    if (!payload) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: payload });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông tin phiên làm việc" },
      { status: 500 }
    );
  }
}
