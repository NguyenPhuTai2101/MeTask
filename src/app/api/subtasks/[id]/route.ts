import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { isCompleted, title } = body;

    // Query task document that contains this subtask ID in subtaskIds array
    const tasksRef = collection(db, "tasks");
    const q = query(tasksRef, where("subtaskIds", "array-contains", id));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ error: "Không tìm thấy tác vụ chứa subtask này" }, { status: 404 });
    }

    const taskDoc = querySnapshot.docs[0];
    const taskData = taskDoc.data();
    const subtasks = taskData.subtasks || [];

    let updatedSubtask: any = null;
    const updatedSubtasks = subtasks.map((s: any) => {
      if (s.id === id) {
        updatedSubtask = {
          ...s,
          ...(isCompleted !== undefined ? { isCompleted } : {}),
          ...(title !== undefined ? { title } : {}),
        };
        return updatedSubtask;
      }
      return s;
    });

    if (!updatedSubtask) {
      return NextResponse.json({ error: "Không tìm thấy subtask trong tác vụ" }, { status: 404 });
    }

    await updateDoc(taskDoc.ref, {
      subtasks: updatedSubtasks,
    });

    return NextResponse.json(updatedSubtask);
  } catch (error) {
    console.error("Failed to update subtask:", error);
    return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Query task document that contains this subtask ID in subtaskIds array
    const tasksRef = collection(db, "tasks");
    const q = query(tasksRef, where("subtaskIds", "array-contains", id));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ error: "Không tìm thấy tác vụ chứa subtask này" }, { status: 404 });
    }

    const taskDoc = querySnapshot.docs[0];
    const taskData = taskDoc.data();
    const subtasks = taskData.subtasks || [];
    const subtaskIds = taskData.subtaskIds || [];

    const updatedSubtasks = subtasks.filter((s: any) => s.id !== id);
    const updatedSubtaskIds = subtaskIds.filter((subId: string) => subId !== id);

    await updateDoc(taskDoc.ref, {
      subtasks: updatedSubtasks,
      subtaskIds: updatedSubtaskIds
    });

    return NextResponse.json({ message: "Subtask deleted successfully" });
  } catch (error) {
    console.error("Failed to delete subtask:", error);
    return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
  }
}
