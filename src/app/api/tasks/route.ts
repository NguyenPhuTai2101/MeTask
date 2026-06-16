import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  try {
    let authenticatedUserId: string | null = null;
    const payload = await getSessionUser();
    if (payload) {
      authenticatedUserId = payload.userId;
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user's project memberships to see what they have access to
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("memberIds", "array-contains", authenticatedUserId));
    const projectDocs = await getDocs(q);

    const pmProjectIds: string[] = [];
    const memberProjectIds: string[] = [];

    projectDocs.docs.forEach((doc) => {
      const p = doc.data();
      const member = p.members?.find((m: any) => m.userId === authenticatedUserId);
      if (member) {
        if (member.role === "Project Manager") {
          pmProjectIds.push(doc.id);
        } else {
          memberProjectIds.push(doc.id);
        }
      }
    });

    const visibleProjectIds = [...pmProjectIds, ...memberProjectIds];

    if (projectId && !visibleProjectIds.includes(projectId)) {
      return NextResponse.json([]); // No access
    }

    // 2. Fetch tasks from Firestore
    const tasksRef = collection(db, "tasks");
    let tq;
    
    if (projectId) {
      tq = query(tasksRef, where("projectId", "==", projectId));
    } else {
      if (visibleProjectIds.length === 0) {
        return NextResponse.json([]);
      }
      tq = query(tasksRef, where("projectId", "in", visibleProjectIds));
    }
    
    const tasksSnapshot = await getDocs(tq);
    let tasks = tasksSnapshot.docs.map(d => d.data());

    // 3. Apply role-based filtering:
    // Non-PMs can only see their own tasks
    tasks = tasks.filter((t: any) => {
      const isPM = pmProjectIds.includes(t.projectId);
      if (isPM) return true;
      return t.assigneeId === authenticatedUserId;
    });

    // 4. Resolve relational data: project, module, feature, assignee, reporter, comments
    const resolvedTasks: any[] = [];
    for (const task of tasks) {
      let assignee = null;
      if (task.assigneeId) {
        const uDoc = await getDoc(doc(db, "users", task.assigneeId));
        if (uDoc.exists()) assignee = uDoc.data();
      }

      let reporter = null;
      if (task.reporterId) {
        const uDoc = await getDoc(doc(db, "users", task.reporterId));
        if (uDoc.exists()) reporter = uDoc.data();
      }

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

      const commentsRef = collection(db, "tasks", task.id, "comments");
      const commentsSnapshot = await getDocs(commentsRef);
      const comments: any[] = [];
      for (const cDoc of commentsSnapshot.docs) {
        const cData = cDoc.data();
        let commentUser = null;
        if (cData.userId) {
          const uDoc = await getDoc(doc(db, "users", cData.userId));
          if (uDoc.exists()) commentUser = uDoc.data();
        }
        comments.push({
          ...cData,
          user: commentUser
        });
      }

      comments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      resolvedTasks.push({
        ...task,
        assignee,
        reporter,
        project,
        module,
        feature,
        subtasks: task.subtasks || [],
        comments
      });
    }

    resolvedTasks.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    return NextResponse.json(resolvedTasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      status, 
      priority, 
      dueDate, 
      projectId, 
      assigneeId, 
      reporterId,
      moduleId,
      featureId
    } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: "Title and projectId are required" }, { status: 400 });
    }

    const tasksRef = collection(db, "tasks");
    const tasksSnapshot = await getDocs(tasksRef);
    const taskCount = tasksSnapshot.size;
    const taskCode = `TASK-${4000 + taskCount + 1}`;
    const taskId = `task-${Date.now()}`;

    const taskData = {
      id: taskId,
      taskCode,
      title,
      description: description || null,
      status: status || "Backlog",
      priority: priority || "Medium",
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      projectId,
      assigneeId: assigneeId || null,
      reporterId: reporterId || null,
      moduleId: moduleId || null,
      featureId: featureId || null,
      createdAt: new Date().toISOString(),
      subtasks: []
    };

    await setDoc(doc(db, "tasks", taskId), taskData);

    let assignee = null;
    if (assigneeId) {
      const uDoc = await getDoc(doc(db, "users", assigneeId));
      if (uDoc.exists()) assignee = uDoc.data();
    }
    let reporter = null;
    if (reporterId) {
      const uDoc = await getDoc(doc(db, "users", reporterId));
      if (uDoc.exists()) reporter = uDoc.data();
    }

    return NextResponse.json({
      ...taskData,
      assignee,
      reporter,
      subtasks: [],
      comments: []
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
