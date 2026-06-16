import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";

export async function POST(
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

    const { id: projectId } = await params;
    const { userId, role, workloadPercentage } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Thành viên là bắt buộc" }, { status: 400 });
    }

    const projectRef = doc(db, "projects", projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }

    const projectData = projectDoc.data();
    const members = projectData.members || [];
    const memberIds = projectData.memberIds || [];

    // Check if authenticated user is a Project Manager
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);
    if (!authUserMember || authUserMember.role !== "Project Manager") {
      return NextResponse.json({ error: "Only Project Managers can modify team members" }, { status: 403 });
    }

    const existingMemberIndex = members.findIndex((m: any) => m.userId === userId);
    let updatedMember: any = null;

    if (existingMemberIndex !== -1) {
      // Update existing member
      const member = members[existingMemberIndex];
      updatedMember = {
        ...member,
        role: role || member.role,
        workloadPercentage: workloadPercentage !== undefined ? parseInt(workloadPercentage) : member.workloadPercentage,
      };
      members[existingMemberIndex] = updatedMember;
    } else {
      // Create new member
      updatedMember = {
        userId,
        role: role || "Member",
        workloadPercentage: workloadPercentage !== undefined ? parseInt(workloadPercentage) : 0,
      };
      members.push(updatedMember);
      if (!memberIds.includes(userId)) {
        memberIds.push(userId);
      }
    }

    await updateDoc(projectRef, {
      members,
      memberIds
    });

    // Fetch user details to return in teamMember.user
    const userDoc = await getDoc(doc(db, "users", userId));
    const user = userDoc.exists() ? userDoc.data() : null;

    return NextResponse.json({
      success: true,
      member: {
        ...updatedMember,
        user
      }
    });
  } catch (error) {
    console.error("Failed to manage project member:", error);
    return NextResponse.json({ error: "Không thể thêm hoặc cập nhật thành viên" }, { status: 500 });
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

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Mã thành viên là bắt buộc" }, { status: 400 });
    }

    const projectRef = doc(db, "projects", projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
    }

    const projectData = projectDoc.data();
    let members = projectData.members || [];
    let memberIds = projectData.memberIds || [];

    // Check if authenticated user is a Project Manager
    const authUserMember = members.find((m: any) => m.userId === authenticatedUserId);
    if (!authUserMember || authUserMember.role !== "Project Manager") {
      return NextResponse.json({ error: "Only Project Managers can remove team members" }, { status: 403 });
    }

    members = members.filter((m: any) => m.userId !== userId);
    memberIds = memberIds.filter((id: string) => id !== userId);

    await updateDoc(projectRef, {
      members,
      memberIds
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project member:", error);
    return NextResponse.json({ error: "Không thể xóa thành viên khỏi dự án" }, { status: 500 });
  }
}
