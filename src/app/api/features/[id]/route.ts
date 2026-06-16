import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let authenticatedUserId: string | null = null;
    const payload = await getSessionUser();
    if (payload) {
      authenticatedUserId = payload.userId;
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: featureId } = await params;
    const body = await request.json();
    const { name, description, startDate, endDate, parentFeatureId } = body;

    if (!name) {
      return NextResponse.json({ error: "Tên Chức năng là bắt buộc" }, { status: 400 });
    }

    const fDocRef = doc(db, "features", featureId);
    const fDoc = await getDoc(fDocRef);

    if (!fDoc.exists()) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    const fData = fDoc.data();
    const moduleId = fData.moduleId;

    const mDoc = await getDoc(doc(db, "modules", moduleId));
    if (!mDoc.exists()) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }
    const projectId = mDoc.data().projectId;

    const pDoc = await getDoc(doc(db, "projects", projectId));
    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pData = pDoc.data();
    const members = pData.members || [];
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);

    if (!authUserMember || (authUserMember.role !== "Project Manager" && authUserMember.role !== "Admin")) {
      return NextResponse.json({ error: "Only Project Managers can edit features" }, { status: 403 });
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

    // Check parent feature valid
    if (parentFeatureId !== undefined) {
      if (parentFeatureId === featureId) {
        return NextResponse.json({ error: "Không thể chọn chính mình làm chức năng cha" }, { status: 400 });
      }
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
    }

    const updates: any = {
      name,
      description: description || null,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    if (parentFeatureId !== undefined) {
      updates.parentFeatureId = parentFeatureId || null;
    }

    await updateDoc(fDocRef, updates);

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    console.error("Failed to update feature:", error);
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let authenticatedUserId: string | null = null;
    const payload = await getSessionUser();
    if (payload) {
      authenticatedUserId = payload.userId;
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: featureId } = await params;
    const fDocRef = doc(db, "features", featureId);
    const fDoc = await getDoc(fDocRef);

    if (!fDoc.exists()) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    const fData = fDoc.data();
    const moduleId = fData.moduleId;

    const mDoc = await getDoc(doc(db, "modules", moduleId));
    if (!mDoc.exists()) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }
    const projectId = mDoc.data().projectId;

    const pDoc = await getDoc(doc(db, "projects", projectId));
    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pData = pDoc.data();
    const members = pData.members || [];
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);

    if (!authUserMember || authUserMember.role !== "Project Manager") {
      return NextResponse.json({ error: "Only Project Managers can delete features" }, { status: 403 });
    }

    const { deleteDoc, writeBatch, collection, query, where, getDocs } = await import("firebase/firestore");
    
    const batch = writeBatch(db);

    // 1. Delete all tasks in this feature and their subcollections
    const tasksRef = collection(db, "tasks");
    const tq = query(tasksRef, where("featureId", "==", featureId));
    const tasksSnapshot = await getDocs(tq);

    for (const tDoc of tasksSnapshot.docs) {
      const tId = tDoc.id;
      batch.delete(tDoc.ref);
      
      const commentsRef = collection(db, "tasks", tId, "comments");
      const cSnap = await getDocs(commentsRef);
      cSnap.docs.forEach(c => batch.delete(c.ref));
      
      const timeLogsRef = collection(db, "tasks", tId, "time-logs");
      const tlSnap = await getDocs(timeLogsRef);
      tlSnap.docs.forEach(tl => batch.delete(tl.ref));
    }

    // 2. Delete feature itself
    batch.delete(fDocRef);

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete feature:", error);
    return NextResponse.json({ error: "Failed to delete feature" }, { status: 500 });
  }
}
