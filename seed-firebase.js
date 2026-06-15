require("dotenv").config();
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helper function to get or create a user in Firebase Auth using Client SDK
async function getOrCreateAuthUser(email, password) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    console.log(`Created auth user in Firebase Authentication: ${email}`);
    return userCred.user.uid;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log(`Auth user already exists, retrieved UID for: ${email}`);
      return userCred.user.uid;
    }
    throw error;
  }
}

async function main() {
  console.log("Starting Firebase Firestore & Authentication seeding...");

  // 1. Create users in Firebase Authentication and get their real UIDs
  let userA_Id, userB_Id, userC_Id;
  try {
    userA_Id = await getOrCreateAuthUser("vana@nexuspm.com", "password123");
    userB_Id = await getOrCreateAuthUser("thib@nexuspm.com", "password123");
    userC_Id = await getOrCreateAuthUser("hoangc@nexuspm.com", "password123");
  } catch (authError) {
    console.error("\n❌ LỖI TẠO USER TRÊN AUTHENTICATION:");
    if (authError.code === 'auth/operation-not-allowed') {
      console.error("-> Firebase Authentication chưa được bật hoặc phương thức Email/Password sign-in đang bị tắt.");
      console.error("-> Hướng dẫn khắc phục: Vào Firebase Console -> Authentication -> Sign-in method -> Bật Email/Password và lưu lại.\n");
    } else {
      console.error(authError);
    }
    process.exit(1);
  }

  // 2. Seed Users to Firestore
  const users = {
    [userA_Id]: {
      id: userA_Id,
      fullName: "Nguyễn Văn A",
      email: "vana@nexuspm.com",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      createdAt: new Date().toISOString(),
    },
    [userB_Id]: {
      id: userB_Id,
      fullName: "Trần Thị B",
      email: "thib@nexuspm.com",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      createdAt: new Date().toISOString(),
    },
    [userC_Id]: {
      id: userC_Id,
      fullName: "Lê Hoàng C",
      email: "hoangc@nexuspm.com",
      avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80",
      createdAt: new Date().toISOString(),
    }
  };

  for (const [userId, userData] of Object.entries(users)) {
    await setDoc(doc(db, "users", userId), userData);
    console.log(`Seeded Firestore user profile: ${userData.fullName}`);
  }

  // 3. Seed Project
  const projectId = "project-metask-demo";
  const projectData = {
    id: projectId,
    name: "MeTask Development",
    description: "Dự án phát triển phần mềm quản lý tác vụ doanh nghiệp MeTask sử dụng Firebase.",
    createdAt: new Date().toISOString(),
    memberIds: [userA_Id, userB_Id, userC_Id],
    members: [
      { userId: userA_Id, role: "Project Manager", workloadPercentage: 60 },
      { userId: userB_Id, role: "Lead Designer", workloadPercentage: 120 },
      { userId: userC_Id, role: "Frontend Developer", workloadPercentage: 85 }
    ]
  };
  await setDoc(doc(db, "projects", projectId), projectData);
  console.log("Seeded project: MeTask Development");

  // 4. Seed Modules
  const modules = {
    "module-auth": {
      id: "module-auth",
      name: "Xác thực người dùng",
      description: "Quản lý đăng nhập, đăng ký và phân quyền.",
      projectId: projectId,
      createdAt: new Date().toISOString(),
    },
    "module-board": {
      id: "module-board",
      name: "Bảng công việc",
      description: "Kanban board kéo thả quản lý trạng thái task.",
      projectId: projectId,
      createdAt: new Date().toISOString(),
    }
  };

  for (const [moduleId, moduleData] of Object.entries(modules)) {
    await setDoc(doc(db, "modules", moduleId), moduleData);
    console.log(`Seeded module: ${moduleData.name}`);
  }

  // 5. Seed Features
  const features = {
    "feature-login": {
      id: "feature-login",
      name: "Đăng nhập",
      description: "Chức năng đăng nhập tài khoản thực tế sử dụng JWT.",
      moduleId: "module-auth",
      createdAt: new Date().toISOString(),
    },
    "feature-register": {
      id: "feature-register",
      name: "Đăng ký",
      description: "Chức năng đăng ký tài khoản mới lưu vào DB.",
      moduleId: "module-auth",
      createdAt: new Date().toISOString(),
    },
    "feature-dnd": {
      id: "feature-dnd",
      name: "Kéo thả thẻ",
      description: "Kéo thả thẻ task giữa các cột trạng thái.",
      moduleId: "module-board",
      createdAt: new Date().toISOString(),
    }
  };

  for (const [featureId, featureData] of Object.entries(features)) {
    await setDoc(doc(db, "features", featureId), featureData);
    console.log(`Seeded feature: ${featureData.name}`);
  }

  // 6. Seed Tasks
  const tasks = [
    {
      id: "task-1",
      taskCode: "TASK-4092",
      title: "Thiết kế hệ thống Design System (Efficient Professional)",
      description: "Xây dựng palette màu sắc, cấu trúc typography (Inter font), bo góc (rounded 4px) và các thành phần giao diện mẫu trong Stitch.",
      status: "In Progress",
      priority: "High",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      projectId: projectId,
      assigneeId: userB_Id,
      reporterId: userA_Id,
      moduleId: "module-board",
      featureId: "feature-dnd",
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: "sub-1-1", title: "Xác định bảng màu Primary, Surface, Outline", isCompleted: true },
        { id: "sub-1-2", title: "Cấu hình font Inter & Typography", isCompleted: true },
        { id: "sub-1-3", title: "Tạo các thành phần nút bấm (Buttons) và inputs", isCompleted: false }
      ]
    },
    {
      id: "task-2",
      taskCode: "TASK-1001",
      title: "Cấu hình dự án Next.js & Kết nối PostgreSQL Database",
      description: "Khởi tạo repo, cài đặt Prisma ORM, viết database schema và thiết lập bộ định tuyến API Next.js App Router.",
      status: "Completed",
      priority: "Medium",
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      projectId: projectId,
      assigneeId: userC_Id,
      reporterId: userA_Id,
      moduleId: "module-auth",
      featureId: "feature-register",
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: "sub-2-1", title: "Tải gói thư viện Prisma và khởi tạo", isCompleted: true },
        { id: "sub-2-2", title: "Viết tệp schema.prisma", isCompleted: true },
        { id: "sub-2-3", title: "Tạo seed script kiểm thử", isCompleted: true }
      ]
    },
    {
      id: "task-3",
      taskCode: "TASK-2022",
      title: "Tích hợp PWA (Progressive Web App) & Service Worker",
      description: "Cấu hình manifest.json, cache tĩnh (pre-caching), lưu trữ ngoại tuyến bằng IndexedDB và cài đặt Web Push Notifications.",
      status: "Backlog",
      priority: "High",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      projectId: projectId,
      assigneeId: userC_Id,
      reporterId: userB_Id,
      moduleId: "module-auth",
      featureId: "feature-register",
      createdAt: new Date().toISOString(),
      subtasks: []
    },
    {
      id: "task-4",
      taskCode: "TASK-3045",
      title: "Xây dựng màn hình Project Board (Giao diện Kanban)",
      description: "Lập trình cột Kanban kéo thả, filter các task, hiển thị thẻ task đầy đủ metadata và responsive trên thiết bị di động.",
      status: "Review",
      priority: "Medium",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      projectId: projectId,
      assigneeId: userC_Id,
      reporterId: userA_Id,
      moduleId: "module-board",
      featureId: "feature-dnd",
      createdAt: new Date().toISOString(),
      subtasks: []
    }
  ];

  for (const taskData of tasks) {
    const subtaskIds = (taskData.subtasks || []).map(s => s.id);
    await setDoc(doc(db, "tasks", taskData.id), {
      ...taskData,
      subtaskIds
    });
    console.log(`Seeded task: ${taskData.taskCode}`);
  }

  // 7. Seed Comments for Task 1
  const comments = [
    {
      id: "comment-1",
      content: "Tôi đã cập nhật màu Primary thành màu xanh #2563eb, trông hiện đại và chuyên nghiệp hơn.",
      userId: userB_Id,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "comment-2",
      content: "Tuyệt vời B! Hãy chắc chắn bo góc các components là 4px để đúng với design system nhé.",
      userId: userA_Id,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    }
  ];

  for (const comment of comments) {
    await setDoc(doc(db, "tasks", "task-1", "comments", comment.id), comment);
    console.log(`Seeded comment on task-1: "${comment.content.slice(0, 30)}..."`);
  }

  console.log("Firebase Firestore & Authentication seeding completed successfully!");
}

main().catch(console.error);
