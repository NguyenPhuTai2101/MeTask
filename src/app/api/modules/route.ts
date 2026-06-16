import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, setDoc } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    let authenticatedUserId: string | null = null;
    const payload = await getSessionUser();
    if (payload) {
      authenticatedUserId = payload.userId;
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, name, description, startDate, endDate } = body;

    if (!projectId || !name || !startDate || !endDate) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Check project and PM role
    const pDoc = await getDoc(doc(db, "projects", projectId));
    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }

    const pData = pDoc.data();
    const members = pData.members || [];
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);

    if (!authUserMember || (authUserMember.role !== "Project Manager" && authUserMember.role !== "Admin")) {
      return NextResponse.json({ error: "Chỉ Project Manager mới có quyền tạo Phân hệ" }, { status: 403 });
    }

    // Validate dates
    const projStart = new Date(pData.startDate);
    const projEnd = new Date(pData.endDate);
    const modStart = new Date(startDate);
    const modEnd = new Date(endDate);

    if (modStart < projStart || modEnd > projEnd) {
      return NextResponse.json({ error: "Ngày của Phân hệ phải nằm trong khoảng thời gian của Dự án" }, { status: 400 });
    }

    if (modStart > modEnd) {
      return NextResponse.json({ error: "Ngày bắt đầu không được lớn hơn ngày kết thúc" }, { status: 400 });
    }

    // Create module
    const moduleId = `module-${Date.now()}`;
    const moduleData = {
      id: moduleId,
      projectId,
      name,
      description: description || null,
      startDate,
      endDate,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, "modules", moduleId), moduleData);

    return NextResponse.json(moduleData);
  } catch (error) {
    console.error("Failed to create module:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi tạo Phân hệ" }, { status: 500 });
  }
}
