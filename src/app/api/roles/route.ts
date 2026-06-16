import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

// Check Auth
async function checkAuth() {
  const payload = await getSessionUser();
  if (!payload) return null;
  return payload.userId;
}

export async function GET() {
  try {
    const userId = await checkAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rolesRef = collection(db, "roles");
    const q = query(rolesRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const roles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await checkAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const docRef = await addDoc(collection(db, "roles"), {
      name: body.name.trim(),
      description: body.description || "",
      createdAt: serverTimestamp(),
      createdBy: userId,
    });

    return NextResponse.json({ id: docRef.id, message: "Role created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Failed to create role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}
