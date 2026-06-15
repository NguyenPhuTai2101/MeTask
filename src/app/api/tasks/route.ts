import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  try {
    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        assignee: true,
        reporter: true,
        subtasks: true,
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, priority, dueDate, projectId, assigneeId, reporterId } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: "Title and projectId are required" }, { status: 400 });
    }

    // Generate a unique task code e.g., TASK-1005
    const taskCount = await prisma.task.count();
    const taskCode = `TASK-${4000 + taskCount + 1}`;

    const task = await prisma.task.create({
      data: {
        taskCode,
        title,
        description,
        status: status || "Backlog",
        priority: priority || "Medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId,
        reporterId,
      },
      include: {
        assignee: true,
        reporter: true,
        subtasks: true,
        comments: true,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
