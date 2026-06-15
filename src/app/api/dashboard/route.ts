import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  try {
    // 1. Projects Count
    const activeProjectsCount = await prisma.project.count();

    // 2. Pending Tasks (Status !== 'Completed')
    const pendingTasksCount = await prisma.task.count({
      where: {
        status: {
          not: "Completed",
        },
      },
    });

    // 3. Milestones (Mục tiêu hoàn thành - sử dụng số task đã completed làm chỉ số thành tựu)
    const completedTasksCount = await prisma.task.count({
      where: {
        status: "Completed",
      },
    });

    // 4. Team Performance Chart Data (Số lượng task Hoàn thành vs Đang xử lý của mỗi User)
    const users = await prisma.user.findMany({
      include: {
        assignedTasks: true,
      },
    });

    const teamPerformance = users.map((u) => {
      const completed = u.assignedTasks.filter((t) => t.status === "Completed").length;
      const pending = u.assignedTasks.filter((t) => t.status !== "Completed").length;
      return {
        name: u.fullName,
        "Hoàn thành": completed,
        "Đang xử lý": pending,
      };
    });

    // 5. Recent Activity (Lấy các bình luận mới nhất làm luồng hoạt động chính)
    const comments = await prisma.comment.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
        task: true,
      },
    });

    const recentActivity = comments.map((c) => ({
      id: c.id,
      user: c.user.fullName,
      avatar: c.user.avatarUrl,
      action: `đã bình luận trong`,
      target: `${c.task.taskCode}: ${c.task.title}`,
      time: c.createdAt.toISOString(),
    }));

    // Thêm log hoạt động giả định nếu chưa có bình luận nào
    if (recentActivity.length === 0) {
      recentActivity.push(
        {
          id: "act-1",
          user: "Nguyễn Văn A",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
          action: "đã tạo dự án mới",
          target: "NexusPM Development",
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
    let myTasks: any[] = [];
    if (userId) {
      // Vì mockup lưu ID dạng string, nếu là placeholder trong Context, chúng ta map về email
      // Đầu tiên lấy user thật từ database để lấy ID thật
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { email: userId.includes("@") ? userId : undefined }, // Dự phòng nếu truyền email
          ],
        },
      });

      if (dbUser) {
        myTasks = await prisma.task.findMany({
          where: {
            assigneeId: dbUser.id,
            status: {
              not: "Completed",
            },
          },
          orderBy: {
            dueDate: "asc",
          },
        });
      }
    }

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
