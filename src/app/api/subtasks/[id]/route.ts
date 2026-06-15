import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { isCompleted, title } = body;

    const subtask = await prisma.subtask.update({
      where: { id },
      data: {
        isCompleted,
        title,
      },
    });

    return NextResponse.json(subtask);
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
    await prisma.subtask.delete({
      where: { id },
    });
    return NextResponse.json({ message: "Subtask deleted successfully" });
  } catch (error) {
    console.error("Failed to delete subtask:", error);
    return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
  }
}
