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
    const { moduleId, name, description, startDate, endDate, parentFeatureId } = body;

    if (!moduleId || !name) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Check module
    const mDoc = await getDoc(doc(db, "modules", moduleId));
    if (!mDoc.exists()) {
      return NextResponse.json({ error: "Không tìm thấy Phân hệ" }, { status: 404 });
    }
    const projectId = mDoc.data().projectId;

    // Check project and PM role
    const pDoc = await getDoc(doc(db, "projects", projectId));
    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }

    const pData = pDoc.data();
    const members = pData.members || [];
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);

    if (!authUserMember || (authUserMember.role !== "Project Manager" && authUserMember.role !== "Admin")) {
      return NextResponse.json({ error: "Chỉ Project Manager mới có quyền tạo Chức năng" }, { status: 403 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Ngày bắt đầu và kết thúc là bắt buộc" }, { status: 400 });
    }

    const fStart = new Date(startDate);
    const fEnd = new Date(endDate);

    if (fStart > fEnd) {
      return NextResponse.json({ error: "Ngày bắt đầu không được lớn hơn ngày kết thúc" }, { status: 400 });
    }

    // Check Module constraints
    const mData = mDoc.data();
    if (mData.startDate && mData.endDate) {
        const mStart = new Date(mData.startDate);
        const mEnd = new Date(mData.endDate);
        if (fStart < mStart || fEnd > mEnd) {
            return NextResponse.json({ error: "Ngày của Chức năng phải nằm trong khoảng thời gian của Phân hệ" }, { status: 400 });
        }
    }

    // If parentFeatureId is provided, verify it exists and belongs to the same module
    if (parentFeatureId) {
      const parentDoc = await getDoc(doc(db, "features", parentFeatureId));
      if (!parentDoc.exists() || parentDoc.data().moduleId !== moduleId) {
        return NextResponse.json({ error: "Chức năng cha không hợp lệ" }, { status: 400 });
      }
      
      const parentData = parentDoc.data();
      if (parentData.startDate && parentData.endDate) {
          const pStart = new Date(parentData.startDate);
          const pEnd = new Date(parentData.endDate);
          if (fStart < pStart || fEnd > pEnd) {
              return NextResponse.json({ error: "Ngày của Chức năng con phải nằm trong khoảng thời gian của Chức năng cha" }, { status: 400 });
          }
      }
    }

    // Create feature
    const featureId = `feature-${Date.now()}`;
    const featureData = {
      id: featureId,
      moduleId,
      name,
      description: description || null,
      startDate: startDate || null,
      endDate: endDate || null,
      parentFeatureId: parentFeatureId || null,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, "features", featureId), featureData);

    return NextResponse.json(featureData);
  } catch (error) {
    console.error("Failed to create feature:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi tạo Chức năng" }, { status: 500 });
  }
}
