import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

async function checkAdminAuth() {
  const payload = await getSessionUser();
  if (!payload || payload.systemRole !== "Admin") return false;
  return true;
}

export async function GET() {
  try {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        systemRole: data.systemRole || "User",
        status: data.status || "active",
        createdAt: data.createdAt,
      };
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
