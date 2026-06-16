import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let userId = searchParams.get("userId");

  try {
    const payload = await getSessionUser();
    if (payload) {
      userId = payload.userId;
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
    
    // Fetch all tasks for the projects the user can see (handling max 10 for 'in' query)
    let allTasks: any[] = [];
    if (visibleProjectIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < visibleProjectIds.length; i += 10) {
        chunks.push(visibleProjectIds.slice(i, i + 10));
      }
      
      const chunkPromises = chunks.map(chunk => 
        getDocs(query(collection(db, "tasks"), where("projectId", "in", chunk)))
      );
      
      const chunkSnapshots = await Promise.all(chunkPromises);
      chunkSnapshots.forEach(snap => {
        allTasks.push(...snap.docs.map(t => t.data()));
      });
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
    const teamPromises = Array.from(visibleUserIds).map(uid => getDoc(doc(db, "users", uid)));
    const teamSnapshots = await Promise.all(teamPromises);
    
    teamSnapshots.forEach((uDoc) => {
      if (uDoc.exists()) {
        const uData = uDoc.data()!;
        const uid = uDoc.id;
        
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
    });

    // 5. Recent Activity (Filtered by task visibility)
    const recentActivity: any[] = [];
    if (visibleTasks.length > 0) {
      // Parallel fetch for comments
      const commentsPromises = visibleTasks.map(task => getDocs(collection(db, "tasks", task.id, "comments")));
      const commentsSnapshots = await Promise.all(commentsPromises);
      
      const allComments: any[] = [];
      commentsSnapshots.forEach((snap, idx) => {
        const task = visibleTasks[idx];
        snap.docs.forEach(cDoc => {
          const cData = cDoc.data();
          allComments.push({
            id: cDoc.id,
            userId: cData.userId,
            action: "đã bình luận trong",
            target: `${task.taskCode}: ${task.title}`,
            time: cData.createdAt,
            createdAt: cData.createdAt,
          });
        });
      });
      
      // Sort all comments to get top 5
      allComments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const topComments = allComments.slice(0, 5);
      
      // Resolve user for top 5 only
      const userResolvers = topComments.map(async (comment) => {
        let commentUser = null;
        if (comment.userId) {
          const uDoc = await getDoc(doc(db, "users", comment.userId));
          if (uDoc.exists()) commentUser = uDoc.data();
        }
        return {
          ...comment,
          user: commentUser ? commentUser.fullName : "Thành viên",
          avatar: commentUser ? commentUser.avatarUrl : null,
        };
      });
      
      const resolvedActivity = await Promise.all(userResolvers);
      recentActivity.push(...resolvedActivity);
    }

    // 6. My Tasks (Các task chưa hoàn thành được giao cho User hiện tại)
    const myTasksRaw = visibleTasks.filter((t) => t.assigneeId === currentUserId && t.status !== "Completed");
    
    // Resolve project, module, and feature details for myTasks
    const myTasksPromises = myTasksRaw.map(async (task) => {
      let project = null;
      let module = null;
      let feature = null;

      const pDocPromise = getDoc(doc(db, "projects", task.projectId));
      const mDocPromise = task.moduleId ? getDoc(doc(db, "modules", task.moduleId)) : Promise.resolve(null);
      const fDocPromise = task.featureId ? getDoc(doc(db, "features", task.featureId)) : Promise.resolve(null);

      const [pDoc, mDoc, fDoc] = await Promise.all([pDocPromise, mDocPromise, fDocPromise]);

      if (pDoc.exists()) project = pDoc.data();
      if (mDoc && mDoc.exists()) module = mDoc.data();
      if (fDoc && fDoc.exists()) feature = fDoc.data();

      return {
        ...task,
        project,
        module,
        feature
      };
    });

    const myTasks = await Promise.all(myTasksPromises);

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
