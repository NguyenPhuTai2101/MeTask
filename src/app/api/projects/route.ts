import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    let authenticatedUserId: string | null = null;
    const payload = await getSessionUser();
    if (payload) {
      authenticatedUserId = payload.userId;
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch projects where memberIds contains user ID
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("memberIds", "array-contains", authenticatedUserId));
    const querySnapshot = await getDocs(q);
    
    // Cache to avoid fetching the same user multiple times across projects
    const userCache: Record<string, any> = {};

    // 2. Fetch modules for each project, and features for each module
    const projects: any[] = await Promise.all(
      querySnapshot.docs.map(async (projectDoc) => {
        const pData = projectDoc.data();
        const pId = projectDoc.id;

        // Resolve user details for each member in this project in parallel
        const projectMembers = pData.members || [];
        const resolvedMembers: any[] = await Promise.all(
          projectMembers.map(async (member: any) => {
            let memberUser = null;
            const mUid = member.userId;
            if (mUid) {
              if (userCache[mUid]) {
                memberUser = userCache[mUid];
              } else {
                const uDoc = await getDoc(doc(db, "users", mUid));
                if (uDoc.exists()) {
                  memberUser = uDoc.data();
                  userCache[mUid] = memberUser;
                }
              }
            }
            return {
              ...member,
              user: memberUser
            };
          })
        );

        // Fetch modules flat where projectId matches
        const modulesRef = collection(db, "modules");
        const mq = query(modulesRef, where("projectId", "==", pId));
        const modulesSnapshot = await getDocs(mq);

        const modules: any[] = await Promise.all(
          modulesSnapshot.docs.map(async (mDoc) => {
            const mData = mDoc.data();
            const mId = mDoc.id;

            // Fetch features flat where moduleId matches
            const featuresRef = collection(db, "features");
            const fq = query(featuresRef, where("moduleId", "==", mId));
            const featuresSnapshot = await getDocs(fq);

            const features = featuresSnapshot.docs.map(f => f.data());
            return {
              ...mData,
              features
            };
          })
        );

        // Fetch tasks flat where projectId matches
        const tasksRef = collection(db, "tasks");
        const tq = query(tasksRef, where("projectId", "==", pId));
        const tasksSnapshot = await getDocs(tq);
        const tasks = tasksSnapshot.docs.map(t => t.data());

        return {
          ...pData,
          members: resolvedMembers,
          modules,
          tasks
        };
      })
    );

    // Sort projects desc by createdAt if present
    projects.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Phiên làm việc hết hạn" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Tên dự án là bắt buộc" }, { status: 400 });
    }

    const pId = `proj-${Date.now()}`;
    const projectData = {
      id: pId,
      name,
      description: description || null,
      createdAt: new Date().toISOString(),
      memberIds: [session.userId],
      members: [
        {
          userId: session.userId,
          role: "Project Manager",
          workloadPercentage: 0,
        }
      ]
    };

    await setDoc(doc(db, "projects", pId), projectData);

    // Fetch details of the creator to return in the project object
    const uDoc = await getDoc(doc(db, "users", session.userId));
    const memberUser = uDoc.exists() ? uDoc.data() : null;

    const resolvedMembers = [
      {
        userId: session.userId,
        role: "Project Manager",
        workloadPercentage: 0,
        user: memberUser
      }
    ];

    return NextResponse.json({
      ...projectData,
      members: resolvedMembers,
      modules: [],
      tasks: []
    });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Không thể tạo dự án" }, { status: 500 });
  }
}
