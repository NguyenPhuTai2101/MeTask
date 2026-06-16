import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

export async function GET(
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

    const { id: pId } = await params;

    // 1. Fetch project
    const pDocRef = doc(db, "projects", pId);
    const pDoc = await getDoc(pDocRef);

    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pData = pDoc.data();

    // Optional: check if user is in project.memberIds
    const memberIds = pData.memberIds || [];
    if (!memberIds.includes(authenticatedUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Resolve user details for members in parallel
    const projectMembers = pData.members || [];
    const resolvedMembers: any[] = await Promise.all(
      projectMembers.map(async (member: any) => {
        let memberUser = null;
        const mUid = member.userId;
        if (mUid) {
          const uDoc = await getDoc(doc(db, "users", mUid));
          if (uDoc.exists()) {
            memberUser = uDoc.data();
          }
        }
        return {
          ...member,
          user: memberUser
        };
      })
    );

    // 2. Fetch modules for this project
    const modulesRef = collection(db, "modules");
    const mq = query(modulesRef, where("projectId", "==", pId));
    const modulesSnapshot = await getDocs(mq);

    const modules: any[] = await Promise.all(
      modulesSnapshot.docs.map(async (mDoc) => {
        const mData = mDoc.data();
        const mId = mDoc.id;

        // Fetch features for this module in parallel
        const featuresRef = collection(db, "features");
        const fq = query(featuresRef, where("moduleId", "==", mId));
        const featuresSnapshot = await getDocs(fq);

        const features = featuresSnapshot.docs.map(f => f.data());
        
        // sort features by creation
        features.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

        return {
          ...mData,
          features
        };
      })
    );

    // Sort modules by creation
    modules.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    return NextResponse.json({
      ...pData,
      members: resolvedMembers,
      modules
    });
  } catch (error) {
    console.error("Failed to fetch project details:", error);
    return NextResponse.json({ error: "Failed to fetch project details" }, { status: 500 });
  }
}

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

    const { id: pId } = await params;
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Tên dự án là bắt buộc" }, { status: 400 });
    }

    const pDocRef = doc(db, "projects", pId);
    const pDoc = await getDoc(pDocRef);

    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pData = pDoc.data();
    const members = pData.members || [];
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);

    if (!authUserMember || authUserMember.role !== "Project Manager") {
      return NextResponse.json({ error: "Only Project Managers can edit the project" }, { status: 403 });
    }

    // Since we're using updateDoc, we need to import it. Let's assume we can use setDoc with merge: true, or we import updateDoc at the top.
    // Wait, the file currently imports: import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
    // I should use setDoc({ name, description }, { merge: true }) to be safe if updateDoc isn't imported, but I should probably import updateDoc instead.
    // Actually, I'll use setDoc(pDocRef, { name, description }, { merge: true }).
    // Wait, let's just use dynamic import for updateDoc to be absolutely sure without parsing imports:
    const { updateDoc } = await import("firebase/firestore");

    await updateDoc(pDocRef, {
      name,
      description: description || null
    });

    return NextResponse.json({ success: true, name, description });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
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

    const { id: pId } = await params;
    const pDocRef = doc(db, "projects", pId);
    const pDoc = await getDoc(pDocRef);

    if (!pDoc.exists()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pData = pDoc.data();
    const members = pData.members || [];
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);

    if (!authUserMember || authUserMember.role !== "Project Manager") {
      return NextResponse.json({ error: "Only Project Managers can delete the project" }, { status: 403 });
    }

    const { deleteDoc, writeBatch } = await import("firebase/firestore");
    
    // 1. Find all modules
    const modulesRef = collection(db, "modules");
    const mq = query(modulesRef, where("projectId", "==", pId));
    const modulesSnapshot = await getDocs(mq);
    
    const moduleIds = modulesSnapshot.docs.map(d => d.id);

    // 2. Find all features belonging to those modules
    const featuresRef = collection(db, "features");
    const featureIds: string[] = [];
    
    // Firebase 'in' queries are limited to 10 items, so we fetch iteratively
    for (const mId of moduleIds) {
      const fq = query(featuresRef, where("moduleId", "==", mId));
      const fs = await getDocs(fq);
      fs.docs.forEach(d => featureIds.push(d.id));
    }

    // 3. Find all tasks belonging to the project
    const tasksRef = collection(db, "tasks");
    const tq = query(tasksRef, where("projectId", "==", pId));
    const tasksSnapshot = await getDocs(tq);
    const taskIds = tasksSnapshot.docs.map(d => d.id);

    // 4. Batch delete
    // Note: subcollections inside tasks (like comments, time-logs) won't be deleted automatically by Firestore Web SDK unless specifically queried.
    // To keep it simple and within limits, we'll manually query comments and delete them too.
    const batch = writeBatch(db);
    
    // Delete modules
    modulesSnapshot.docs.forEach(d => batch.delete(d.ref));
    
    // Delete features
    for (const fId of featureIds) {
      batch.delete(doc(db, "features", fId));
    }

    // Delete tasks and their comments
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

    // Delete project
    batch.delete(pDocRef);

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

