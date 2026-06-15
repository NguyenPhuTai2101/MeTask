require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const crypto = require("crypto");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = "metask_salt";
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Starting database seeding...");

  // Clean database
  await prisma.comment.deleteMany({});
  await prisma.subtask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.feature.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Cleaned database.");

  // Create Users
  const userA = await prisma.user.create({
    data: {
      fullName: "Nguyễn Văn A",
      email: "vana@nexuspm.com",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      passwordHash: hashPassword("password123"),
    },
  });

  const userB = await prisma.user.create({
    data: {
      fullName: "Trần Thị B",
      email: "thib@nexuspm.com",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      passwordHash: hashPassword("password123"),
    },
  });

  const userC = await prisma.user.create({
    data: {
      fullName: "Lê Hoàng C",
      email: "hoangc@nexuspm.com",
      avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80",
      passwordHash: hashPassword("password123"),
    },
  });

  console.log("Created users.");

  // Create Project
  const project = await prisma.project.create({
    data: {
      name: "NexusPM Development",
      description: "Dự án phát triển phần mềm quản lý tác vụ doanh nghiệp NexusPM.",
    },
  });

  console.log("Created project.");

  // Create Modules
  const moduleAuth = await prisma.module.create({
    data: {
      name: "Xác thực người dùng",
      description: "Quản lý đăng nhập, đăng ký và phân quyền.",
      projectId: project.id,
    },
  });

  const moduleBoard = await prisma.module.create({
    data: {
      name: "Bảng công việc",
      description: "Kanban board kéo thả quản lý trạng thái task.",
      projectId: project.id,
    },
  });

  console.log("Created modules.");

  // Create Features
  const featureLogin = await prisma.feature.create({
    data: {
      name: "Đăng nhập",
      description: "Chức năng đăng nhập tài khoản thực tế sử dụng JWT.",
      moduleId: moduleAuth.id,
    },
  });

  const featureRegister = await prisma.feature.create({
    data: {
      name: "Đăng ký",
      description: "Chức năng đăng ký tài khoản mới lưu vào DB.",
      moduleId: moduleAuth.id,
    },
  });

  const featureDnd = await prisma.feature.create({
    data: {
      name: "Kéo thả thẻ",
      description: "Kéo thả thẻ task giữa các cột trạng thái.",
      moduleId: moduleBoard.id,
    },
  });

  console.log("Created features.");

  // Assign Team Members with workloads
  await prisma.teamMember.create({
    data: {
      userId: userA.id,
      projectId: project.id,
      role: "Project Manager",
      workloadPercentage: 60,
    },
  });

  await prisma.teamMember.create({
    data: {
      userId: userB.id,
      projectId: project.id,
      role: "Lead Designer",
      workloadPercentage: 120, // Overcapacity warning test
    },
  });

  await prisma.teamMember.create({
    data: {
      userId: userC.id,
      projectId: project.id,
      role: "Frontend Developer",
      workloadPercentage: 85,
    },
  });

  console.log("Created team members & workloads.");

  // Create Tasks linked to modules/features
  // Task 1: Design system (In Progress)
  const task1 = await prisma.task.create({
    data: {
      taskCode: "TASK-4092",
      title: "Thiết kế hệ thống Design System (Efficient Professional)",
      description: "Xây dựng palette màu sắc, cấu trúc typography (Inter font), bo góc (rounded 4px) và các thành phần giao diện mẫu trong Stitch.",
      status: "In Progress",
      priority: "High",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      projectId: project.id,
      assigneeId: userB.id,
      reporterId: userA.id,
      moduleId: moduleBoard.id,
      featureId: featureDnd.id,
    },
  });

  // Task 2: Backend Setup (Completed)
  const task2 = await prisma.task.create({
    data: {
      taskCode: "TASK-1001",
      title: "Cấu hình dự án Next.js & Kết nối PostgreSQL Database",
      description: "Khởi tạo repo, cài đặt Prisma ORM, viết database schema và thiết lập bộ định tuyến API Next.js App Router.",
      status: "Completed",
      priority: "Medium",
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      projectId: project.id,
      assigneeId: userC.id,
      reporterId: userA.id,
      moduleId: moduleAuth.id,
      featureId: featureRegister.id,
    },
  });

  // Task 3: PWA Integration (Backlog)
  const task3 = await prisma.task.create({
    data: {
      taskCode: "TASK-2022",
      title: "Tích hợp PWA (Progressive Web App) & Service Worker",
      description: "Cấu hình manifest.json, cache tĩnh (pre-caching), lưu trữ ngoại tuyến bằng IndexedDB và cài đặt Web Push Notifications.",
      status: "Backlog",
      priority: "High",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      projectId: project.id,
      assigneeId: userC.id,
      reporterId: userB.id,
      moduleId: moduleAuth.id,
      featureId: featureRegister.id,
    },
  });

  // Task 4: UI Kanban Board (Review)
  const task4 = await prisma.task.create({
    data: {
      taskCode: "TASK-3045",
      title: "Xây dựng màn hình Project Board (Giao diện Kanban)",
      description: "Lập trình cột Kanban kéo thả, filter các task, hiển thị thẻ task đầy đủ metadata và responsive trên thiết bị di động.",
      status: "Review",
      priority: "Medium",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      projectId: project.id,
      assigneeId: userC.id,
      reporterId: userA.id,
      moduleId: moduleBoard.id,
      featureId: featureDnd.id,
    },
  });

  console.log("Created tasks.");

  // Create Subtasks for Task 1
  await prisma.subtask.createMany({
    data: [
      {
        title: "Xác định bảng màu Primary, Surface, Outline",
        isCompleted: true,
        taskId: task1.id,
      },
      {
        title: "Cấu hình font Inter & Typography",
        isCompleted: true,
        taskId: task1.id,
      },
      {
        title: "Tạo các thành phần nút bấm (Buttons) và inputs",
        isCompleted: false,
        taskId: task1.id,
      },
    ],
  });

  // Create Subtasks for Task 2
  await prisma.subtask.createMany({
    data: [
      {
        title: "Tải gói thư viện Prisma và khởi tạo",
        isCompleted: true,
        taskId: task2.id,
      },
      {
        title: "Viết tệp schema.prisma",
        isCompleted: true,
        taskId: task2.id,
      },
      {
        title: "Tạo seed script kiểm thử",
        isCompleted: true,
        taskId: task2.id,
      },
    ],
  });

  console.log("Created subtasks.");

  // Create Comments for Task 1
  await prisma.comment.create({
    data: {
      content: "Tôi đã cập nhật màu Primary thành màu xanh #2563eb, trông hiện đại và chuyên nghiệp hơn.",
      taskId: task1.id,
      userId: userB.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "Tuyệt vời B! Hãy chắc chắn bo góc các components là 4px để đúng với design system nhé.",
      taskId: task1.id,
      userId: userA.id,
    },
  });

  console.log("Created comments.");
  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
