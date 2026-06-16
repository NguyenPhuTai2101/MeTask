import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

async function checkAuth() {
  const payload = await getSessionUser();
  if (!payload) return null;
  return payload.userId;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await checkAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const docRef = doc(db, "roles", id);
    const roleDoc = await getDoc(docRef);
    if (!roleDoc.exists()) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await updateDoc(docRef, {
      name: body.name.trim(),
      description: body.description || "",
    });

    return NextResponse.json({ message: "Role updated successfully" });
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await checkAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const docRef = doc(db, "roles", id);
    const roleDoc = await getDoc(docRef);
    if (!roleDoc.exists()) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await deleteDoc(docRef);

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Failed to delete role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
