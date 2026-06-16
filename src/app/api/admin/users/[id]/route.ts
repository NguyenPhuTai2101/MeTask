import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

async function checkAdminAuth() {
  const payload = await getSessionUser();
  if (!payload || payload.systemRole !== "Admin") return false;
  return true;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    
    // Only allow updating status and systemRole
    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.systemRole) updates.systemRole = body.systemRole;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const docRef = doc(db, "users", id);
    const userDoc = await getDoc(docRef);
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await updateDoc(docRef, updates);

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
