import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  try {
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const taskRef = doc(db, "tasks", taskId);
    const taskDoc = await getDoc(taskRef);
    if (!taskDoc.exists()) {
      return NextResponse.json({ error: "Không tìm thấy tác vụ" }, { status: 404 });
    }

    const taskData = taskDoc.data();
    const subtasks = taskData.subtasks || [];
    const subtaskIds = taskData.subtaskIds || [];

    const subtaskId = `subtask-${Date.now()}`;
    const newSubtask = {
      id: subtaskId,
      title,
      isCompleted: false,
      taskId
    };

    subtasks.push(newSubtask);
    subtaskIds.push(subtaskId);

    await updateDoc(taskRef, {
      subtasks,
      subtaskIds
    });

    return NextResponse.json(newSubtask, { status: 201 });
  } catch (error) {
    console.error("Failed to create subtask:", error);
    return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
  }
}
