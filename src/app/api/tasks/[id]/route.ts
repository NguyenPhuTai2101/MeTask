import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { createNotification } from "@/lib/server-notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const taskDoc = await getDoc(doc(db, "tasks", id));
    if (!taskDoc.exists()) {
      return NextResponse.json({ error: "Không tìm thấy tác vụ" }, { status: 404 });
    }

    const task = taskDoc.data();

    // Resolve assignee
    let assignee = null;
    if (task.assigneeId) {
      const uDoc = await getDoc(doc(db, "users", task.assigneeId));
      if (uDoc.exists()) assignee = uDoc.data();
    }

    // Resolve reporter
    let reporter = null;
    if (task.reporterId) {
      const uDoc = await getDoc(doc(db, "users", task.reporterId));
      if (uDoc.exists()) reporter = uDoc.data();
    }

    // Resolve project
    let project = null;
    const pDoc = await getDoc(doc(db, "projects", task.projectId));
    if (pDoc.exists()) project = pDoc.data();

    // Resolve module
    let module = null;
    if (task.moduleId) {
      const mDoc = await getDoc(doc(db, "modules", task.moduleId));
      if (mDoc.exists()) module = mDoc.data();
    }

    // Resolve feature
    let feature = null;
    if (task.featureId) {
      const fDoc = await getDoc(doc(db, "features", task.featureId));
      if (fDoc.exists()) feature = fDoc.data();
    }

    // Resolve comments
    const commentsRef = collection(db, "tasks", id, "comments");
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

    return NextResponse.json({
      ...task,
      assignee,
      reporter,
      project,
      module,
      feature,
      subtasks: task.subtasks || [],
      comments
    });
  } catch (error) {
    console.error("Failed to fetch task details:", error);
    return NextResponse.json({ error: "Failed to fetch task details" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId, reporterId, moduleId, featureId, subtasks } = body;

    // Fetch original task before update to compare changes
    const taskDocRef = doc(db, "tasks", id);
    const originalTaskDoc = await getDoc(taskDocRef);
    if (!originalTaskDoc.exists()) {
      return NextResponse.json({ error: "Không tìm thấy tác vụ" }, { status: 404 });
    }
    const originalTask = originalTaskDoc.data();

    // Prepare fields to update
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (assigneeId !== undefined) updates.assigneeId = assigneeId;
    if (reporterId !== undefined) updates.reporterId = reporterId;
    if (moduleId !== undefined) updates.moduleId = moduleId;
    if (featureId !== undefined) updates.featureId = featureId;
    if (subtasks !== undefined) updates.subtasks = subtasks;

    await updateDoc(taskDocRef, updates);

    // Get fresh data
    const freshTaskDoc = await getDoc(taskDocRef);
    const freshTask = freshTaskDoc.data()!;

    // Resolve assignee
    let assignee = null;
    if (freshTask.assigneeId) {
      const uDoc = await getDoc(doc(db, "users", freshTask.assigneeId));
      if (uDoc.exists()) assignee = uDoc.data();
    }

    // Resolve reporter
    let reporter = null;
    if (freshTask.reporterId) {
      const uDoc = await getDoc(doc(db, "users", freshTask.reporterId));
      if (uDoc.exists()) reporter = uDoc.data();
    }

    // Notify assignee if task reassigned
    if (assigneeId && assigneeId !== originalTask?.assigneeId) {
      await createNotification(
        assigneeId,
        "Tác vụ được gán cho bạn",
        `Bạn đã được giao thực hiện tác vụ: ${freshTask.taskCode} - ${freshTask.title}`,
        "TaskAssigned",
        `/board`
      );
    }

    // Notify assignee & reporter if status changed
    if (status && status !== originalTask?.status) {
      const statusTextMap: Record<string, string> = {
        "Backlog": "Chờ xử lý (Backlog)",
        "In Progress": "Đang thực hiện (In Progress)",
        "Review": "Đang duyệt (Review)",
        "Completed": "Đã hoàn thành (Completed)"
      };
      
      const newStatusText = statusTextMap[status] || status;

      if (freshTask.assigneeId) {
        await createNotification(
          freshTask.assigneeId,
          "Cập nhật trạng thái công việc",
          `Tác vụ của bạn "${freshTask.taskCode}: ${freshTask.title}" đã chuyển sang: ${newStatusText}`,
          "StatusChanged",
          `/board`
        );
      }
      if (freshTask.reporterId && freshTask.reporterId !== freshTask.assigneeId) {
        await createNotification(
          freshTask.reporterId,
          "Cập nhật trạng thái công việc",
          `Tác vụ "${freshTask.taskCode}: ${freshTask.title}" đã chuyển sang: ${newStatusText}`,
          "StatusChanged",
          `/board`
        );
      }
    }

    return NextResponse.json({
      ...freshTask,
      assignee,
      reporter,
      subtasks: freshTask.subtasks || [],
    });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteDoc(doc(db, "tasks", id));
    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
