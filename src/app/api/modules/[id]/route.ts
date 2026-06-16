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

    const { id: moduleId } = await params;
    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Tên và ngày tháng Phân hệ là bắt buộc" }, { status: 400 });
    }

    const mDocRef = doc(db, "modules", moduleId);
    const mDoc = await getDoc(mDocRef);

    if (!mDoc.exists()) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const mData = mDoc.data();
    const projectId = mData.projectId;

    const pDoc = await getDoc(doc(db, "projects", projectId));
    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pData = pDoc.data();
    const members = pData.members || [];
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);

    if (!authUserMember || (authUserMember.role !== "Project Manager" && authUserMember.role !== "Admin")) {
      return NextResponse.json({ error: "Only Project Managers can edit modules" }, { status: 403 });
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

    await updateDoc(mDocRef, {
      name,
      description: description || null,
      startDate,
      endDate
    });

    return NextResponse.json({ success: true, name, description });
  } catch (error) {
    console.error("Failed to update module:", error);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
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

    const { id: moduleId } = await params;
    const mDocRef = doc(db, "modules", moduleId);
    const mDoc = await getDoc(mDocRef);

    if (!mDoc.exists()) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const mData = mDoc.data();
    const projectId = mData.projectId;

    const pDoc = await getDoc(doc(db, "projects", projectId));
    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pData = pDoc.data();
    const members = pData.members || [];
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);

    if (!authUserMember || authUserMember.role !== "Project Manager") {
      return NextResponse.json({ error: "Only Project Managers can delete modules" }, { status: 403 });
    }

    const { deleteDoc, writeBatch, collection, query, where, getDocs } = await import("firebase/firestore");
    
    const batch = writeBatch(db);

    // 1. Delete all features inside this module
    const featuresRef = collection(db, "features");
    const fq = query(featuresRef, where("moduleId", "==", moduleId));
    const fs = await getDocs(fq);
    fs.docs.forEach(d => batch.delete(d.ref));

    // 2. Delete all tasks in this module and their subcollections
    const tasksRef = collection(db, "tasks");
    const tq = query(tasksRef, where("moduleId", "==", moduleId));
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

    // 3. Delete module itself
    batch.delete(mDocRef);

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete module:", error);
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 });
  }
}
