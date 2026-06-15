import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { decryptSession } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("metask_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const session = decryptSession(sessionCookie);
    if (!session) {
      return NextResponse.json({ error: "Phiên làm việc hết hạn" }, { status: 401 });
    }

    const timeLogsRef = collection(db, "tasks", taskId, "timeLogs");
    const logsSnapshot = await getDocs(timeLogsRef);

    const logs: any[] = [];
    let activeTimer: any = null;

    // Simple cache to avoid redundant user fetches
    const userCache: Record<string, any> = {};

    for (const logDoc of logsSnapshot.docs) {
      const logData = logDoc.data();
      const logUserId = logData.userId;

      let user = null;
      if (logUserId) {
        if (userCache[logUserId]) {
          user = userCache[logUserId];
        } else {
          const uDoc = await getDoc(doc(db, "users", logUserId));
          if (uDoc.exists()) {
            user = uDoc.data();
            userCache[logUserId] = user;
          }
        }
      }

      // Convert Timestamp to ISO string if needed
      const startTimeISO = logData.startTime && typeof logData.startTime.toDate === 'function' 
        ? logData.startTime.toDate().toISOString() 
        : logData.startTime;

      const endTimeISO = logData.endTime && typeof logData.endTime.toDate === 'function'
        ? logData.endTime.toDate().toISOString()
        : logData.endTime;

      const createdAtISO = logData.createdAt && typeof logData.createdAt.toDate === 'function'
        ? logData.createdAt.toDate().toISOString()
        : logData.createdAt;

      const logItem = {
        id: logDoc.id,
        ...logData,
        startTime: startTimeISO,
        endTime: endTimeISO,
        createdAt: createdAtISO,
        user
      };

      logs.push(logItem);

      // Check if it's the active timer for current user
      if (logUserId === session.userId && !logData.endTime) {
        activeTimer = logItem;
      }
    }

    // Order logs by createdAt/startTime desc
    logs.sort((a, b) => new Date(b.createdAt || b.startTime || 0).getTime() - new Date(a.createdAt || a.startTime || 0).getTime());

    return NextResponse.json({ logs, activeTimer });
  } catch (error) {
    console.error("Failed to fetch time logs:", error);
    return NextResponse.json({ error: "Không thể lấy thông tin nhật ký thời gian" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("metask_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const session = decryptSession(sessionCookie);
    if (!session) {
      return NextResponse.json({ error: "Phiên làm việc hết hạn" }, { status: 401 });
    }

    const { action, notes } = await request.json();
    const timeLogsRef = collection(db, "tasks", taskId, "timeLogs");

    if (action === "start") {
      // Check if there is already a running timer for this user on this task
      const logsSnapshot = await getDocs(timeLogsRef);
      let existingTimerDoc = null;

      for (const logDoc of logsSnapshot.docs) {
        const logData = logDoc.data();
        if (logData.userId === session.userId && !logData.endTime) {
          existingTimerDoc = logDoc;
          break;
        }
      }

      if (existingTimerDoc) {
        return NextResponse.json({ error: "Đã có bộ đếm thời gian đang chạy" }, { status: 400 });
      }

      // Start new timer
      const logId = `log-${Date.now()}`;
      const logData = {
        id: logId,
        taskId,
        userId: session.userId,
        startTime: new Date().toISOString(),
        endTime: null,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "tasks", taskId, "timeLogs", logId), logData);

      return NextResponse.json({ success: true, timer: logData });
    } else if (action === "stop") {
      // Find active timer
      const logsSnapshot = await getDocs(timeLogsRef);
      let activeTimerDoc = null;

      for (const logDoc of logsSnapshot.docs) {
        const logData = logDoc.data();
        if (logData.userId === session.userId && !logData.endTime) {
          activeTimerDoc = logDoc;
          break;
        }
      }

      if (!activeTimerDoc) {
        return NextResponse.json({ error: "Không tìm thấy bộ đếm thời gian đang chạy" }, { status: 444 });
      }

      const activeTimerData = activeTimerDoc.data();
      const endTime = new Date();
      const startTime = new Date(activeTimerData.startTime);
      const durationSeconds = Math.round(
        (endTime.getTime() - startTime.getTime()) / 1000
      );

      const updatedFields = {
        endTime: endTime.toISOString(),
        duration: durationSeconds,
        notes: notes || "Không có ghi chú",
      };

      await updateDoc(activeTimerDoc.ref, updatedFields);

      return NextResponse.json({
        success: true,
        log: {
          id: activeTimerDoc.id,
          ...activeTimerData,
          ...updatedFields
        }
      });
    } else {
      return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
    }
  } catch (error) {
    console.error("Failed to manage time log:", error);
    return NextResponse.json({ error: "Không thể ghi nhật ký thời gian" }, { status: 500 });
  }
}
