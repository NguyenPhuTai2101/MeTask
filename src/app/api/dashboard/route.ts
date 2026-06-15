import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { decryptSession } from "@/lib/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let userId = searchParams.get("userId");

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("metask_session")?.value;
    if (sessionCookie) {
      const payload = decryptSession(sessionCookie);
      if (payload) {
        userId = payload.userId;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve dbUser from email or id
    let dbUser: any = null;
    if (userId.includes("@")) {
      const uSnapshot = await getDocs(query(collection(db, "users"), where("email", "==", userId.toLowerCase())));
      if (!uSnapshot.empty) {
        dbUser = uSnapshot.docs[0].data();
      }
    } else {
      const uDoc = await getDoc(doc(db, "users", userId));
      if (uDoc.exists()) {
        dbUser = uDoc.data();
      }
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUserId = dbUser.id;

    // Get project memberships to establish roles
    const projectsRef = collection(db, "projects");
    const membershipsSnapshot = await getDocs(query(projectsRef, where("memberIds", "array-contains", currentUserId)));

    const pmProjectIds: string[] = [];
    const memberProjectIds: string[] = [];

    membershipsSnapshot.docs.forEach((doc) => {
      const p = doc.data();
      const member = p.members?.find((m: any) => m.userId === currentUserId);
      if (member) {
        if (member.role === "Project Manager") {
          pmProjectIds.push(doc.id);
        } else {
          memberProjectIds.push(doc.id);
        }
      }
    });

    const visibleProjectIds = [...pmProjectIds, ...memberProjectIds];

    // 1. Projects Count (projects where the user is a team member)
    const activeProjectsCount = visibleProjectIds.length;

    // 2 & 3. Tasks Metrics (Pending & Completed)
    let pendingTasksCount = 0;
    let completedTasksCount = 0;
    
    // Fetch all tasks for the projects the user can see
    let allTasks: any[] = [];
    if (visibleProjectIds.length > 0) {
      const tasksSnapshot = await getDocs(query(collection(db, "tasks"), where("projectId", "in", visibleProjectIds)));
      allTasks = tasksSnapshot.docs.map(t => t.data());
    }

    // Filter tasks based on role visibility
    const visibleTasks = allTasks.filter((t) => {
      const isPM = pmProjectIds.includes(t.projectId);
      if (isPM) return true;
      return t.assigneeId === currentUserId;
    });

    pendingTasksCount = visibleTasks.filter((t) => t.status !== "Completed").length;
    completedTasksCount = visibleTasks.filter((t) => t.status === "Completed").length;

    // 4. Team Performance Chart Data
    // Get unique user IDs of members in projects the current user can see
    const visibleUserIds = new Set<string>();
    membershipsSnapshot.docs.forEach((doc) => {
      const p = doc.data();
      p.memberIds?.forEach((uid: string) => visibleUserIds.add(uid));
    });

    const teamPerformance: any[] = [];
    for (const uid of Array.from(visibleUserIds)) {
      const uDoc = await getDoc(doc(db, "users", uid));
      if (uDoc.exists()) {
        const uData = uDoc.data()!;
        
        // Count tasks assigned to this user that are visible to the current user
        const userTasks = visibleTasks.filter((t) => t.assigneeId === uid);
        const completed = userTasks.filter((t) => t.status === "Completed").length;
        const pending = userTasks.filter((t) => t.status !== "Completed").length;
        
        teamPerformance.push({
          name: uData.fullName,
          "Hoàn thành": completed,
          "Đang xử lý": pending,
        });
      }
    }

    // 5. Recent Activity (Filtered by task visibility)
    const allComments: any[] = [];
    for (const task of visibleTasks) {
      const commentsRef = collection(db, "tasks", task.id, "comments");
      const commentsSnapshot = await getDocs(commentsRef);
      for (const cDoc of commentsSnapshot.docs) {
        const cData = cDoc.data();
        let commentUser = null;
        if (cData.userId) {
          const uDoc = await getDoc(doc(db, "users", cData.userId));
          if (uDoc.exists()) commentUser = uDoc.data();
        }
        allComments.push({
          id: cDoc.id,
          user: commentUser ? commentUser.fullName : "Thành viên",
          avatar: commentUser ? commentUser.avatarUrl : null,
          action: "đã bình luận trong",
          target: `${task.taskCode}: ${task.title}`,
          time: cData.createdAt,
          createdAt: cData.createdAt,
        });
      }
    }

    allComments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const recentActivity = allComments.slice(0, 5);

    // Fallback activity if no comments exist
    if (recentActivity.length === 0) {
      recentActivity.push(
        {
          id: "act-1",
          user: "Nguyễn Văn A",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
          action: "đã tạo dự án mới",
          target: "MeTask Development",
          time: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "act-2",
          user: "Trần Thị B",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
          action: "đã chuyển trạng thái TASK-4092 sang",
          target: "In Progress",
          time: new Date(Date.now() - 7200000).toISOString(),
        }
      );
    }

    // 6. My Tasks (Các task chưa hoàn thành được giao cho User hiện tại)
    const myTasksRaw = visibleTasks.filter((t) => t.assigneeId === currentUserId && t.status !== "Completed");
    
    // Resolve project, module, and feature details for myTasks
    const myTasks: any[] = [];
    for (const task of myTasksRaw) {
      let project = null;
      const pDoc = await getDoc(doc(db, "projects", task.projectId));
      if (pDoc.exists()) project = pDoc.data();

      let module = null;
      if (task.moduleId) {
        const mDoc = await getDoc(doc(db, "modules", task.moduleId));
        if (mDoc.exists()) module = mDoc.data();
      }

      let feature = null;
      if (task.featureId) {
        const fDoc = await getDoc(doc(db, "features", task.featureId));
        if (fDoc.exists()) feature = fDoc.data();
      }

      myTasks.push({
        ...task,
        project,
        module,
        feature
      });
    }

    // Sort by dueDate asc
    myTasks.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

    return NextResponse.json({
      metrics: {
        activeProjects: activeProjectsCount,
        pendingTasks: pendingTasksCount,
        milestones: completedTasksCount,
      },
      teamPerformance,
      recentActivity,
      myTasks,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
