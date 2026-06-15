import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createNotification } from "@/lib/server-notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  try {
    const body = await request.json();
    const { content, userId } = body;

    if (!content || !userId) {
      return NextResponse.json({ error: "Content and userId are required" }, { status: 400 });
    }

    // Fetch comment user details
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = userDoc.data();

    const commentId = `comment-${Date.now()}`;
    const commentData = {
      id: commentId,
      content,
      taskId,
      userId,
      createdAt: new Date().toISOString(),
    };

    // Save comment to subcollection tasks/{taskId}/comments
    const commentRef = doc(db, "tasks", taskId, "comments", commentId);
    await setDoc(commentRef, commentData);

    const commentWithUser = {
      ...commentData,
      user
    };

    // Fetch task details to identify who to notify
    const taskDoc = await getDoc(doc(db, "tasks", taskId));
    if (taskDoc.exists()) {
      const task = taskDoc.data();
      const commenterName = user.fullName || "Ai đó";
      const notificationTitle = "Bình luận mới trong công việc";
      const notificationMessage = `${commenterName} đã bình luận trong tác vụ "${task.taskCode}: ${task.title}"`;

      // Notify assignee if not the commenter
      if (task.assigneeId && task.assigneeId !== userId) {
        await createNotification(
          task.assigneeId,
          notificationTitle,
          notificationMessage,
          "NewComment",
          `/board`
        );
      }

      // Notify reporter if not the commenter
      if (task.reporterId && task.reporterId !== userId && task.reporterId !== task.assigneeId) {
        await createNotification(
          task.reporterId,
          notificationTitle,
          notificationMessage,
          "NewComment",
          `/board`
        );
      }
    }

    return NextResponse.json(commentWithUser, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
