"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface Task {
  id: string;
  taskCode: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: User | null;
  assigneeId?: string | null;
  reporter: User | null;
  reporterId?: string | null;
  subtasks: Subtask[];
  comments: Comment[];
}

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  projectMembers: { user: User; role: string }[];
}

export default function TaskDetailModal({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated,
  projectMembers,
}: TaskDetailModalProps) {
  const { user: currentUser } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Local state for subtasks and comments inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newCommentContent, setNewCommentContent] = useState("");

  // TipTap Rich Text Editor setup
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 rounded-lg border border-[#cfdaf2] bg-slate-50 focus:bg-white focus:border-primary transition-all text-sm text-[#111c2d]",
      },
    },
  });

  // Fetch task details when taskId changes
  useEffect(() => {
    if (!taskId || !isOpen) return;

    const fetchTaskDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tasks`);
        if (res.ok) {
          const tasks: Task[] = await res.json();
          const found = tasks.find((t) => t.id === taskId);
          if (found) {
            setTask(found);
            if (editor) {
              editor.commands.setContent(found.description || "");
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch task details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskId, isOpen, editor]);

  if (!isOpen || !task) return null;

  // Handler to update direct task properties
  const updateTaskField = async (fields: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (res.ok) {
        const updatedTask = await res.json();
        setTask((prev) => (prev ? { ...prev, ...updatedTask } : null));
        onTaskUpdated();
      }
    } catch (e) {
      console.error("Failed to update task field:", e);
    }
  };

  // Save description editor content
  const saveDescription = () => {
    if (editor) {
      const htmlContent = editor.getHTML();
      updateTaskField({ description: htmlContent });
    }
  };

  // Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle }),
      });

      if (res.ok) {
        const newSub = await res.json();
        setTask((prev) =>
          prev ? { ...prev, subtasks: [...prev.subtasks, newSub] } : null
        );
        setNewSubtaskTitle("");
        onTaskUpdated();
      }
    } catch (e) {
      console.error("Failed to add subtask:", e);
    }
  };

  // Toggle Subtask Completion
  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted }),
      });

      if (res.ok) {
        setTask((prev) => {
          if (!prev) return null;
          const updatedSubs = prev.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, isCompleted } : s
          );
          return { ...prev, subtasks: updatedSubs };
        });
        onTaskUpdated();
      }
    } catch (e) {
      console.error("Failed to toggle subtask:", e);
    }
  };

  // Delete Subtask
  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTask((prev) =>
          prev
            ? { ...prev, subtasks: prev.subtasks.filter((s) => s.id !== subtaskId) }
            : null
        );
        onTaskUpdated();
      }
    } catch (e) {
      console.error("Failed to delete subtask:", e);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim() || !currentUser) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newCommentContent,
          userId: currentUser.id === "user-a-id-placeholder" ? projectMembers[0]?.user.id : currentUser.id, // Map to DB ID
        }),
      });

      if (res.ok) {
        const newCom = await res.json();
        setTask((prev) =>
          prev ? { ...prev, comments: [newCom, ...prev.comments] } : null
        );
        setNewCommentContent("");
      }
    } catch (e) {
      console.error("Failed to add comment:", e);
    }
  };

  // Calculate Subtask Progress
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end transition-all duration-300">
      {/* Backdrop overlay trigger close */}
      <div onClick={onClose} className="absolute inset-0 cursor-default" />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col z-10 animate-slide-in">
        {/* Header Section */}
        <div className="h-16 px-6 border-b border-[#cfdaf2] flex items-center justify-between bg-slate-50/50">
          <div className="flex flex-col">
            <span className="text-[10px] font-sans font-semibold text-slate-400 tracking-wider uppercase">
              Dự án / {task.taskCode}
            </span>
            <h2 className="text-sm font-bold text-[#111c2d] truncate max-w-md">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined block text-[22px]">close</span>
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
            </div>
          ) : (
            <>
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-[#cfdaf2]/50 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Người Thực Hiện</label>
                  <select
                    value={task.assignee?.id || ""}
                    onChange={(e) => updateTaskField({ assigneeId: e.target.value || null })}
                    className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none font-medium text-slate-700"
                  >
                    <option value="">Chưa gán</option>
                    {projectMembers.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Trạng Thái</label>
                  <select
                    value={task.status}
                    onChange={(e) => updateTaskField({ status: e.target.value })}
                    className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none font-medium text-slate-700"
                  >
                    <option value="Backlog">Backlog</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Ngày Hết Hạn</label>
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.split("T")[0] : ""}
                    onChange={(e) => updateTaskField({ dueDate: e.target.value || null })}
                    className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Độ Ưu Tiên</label>
                  <select
                    value={task.priority}
                    onChange={(e) => updateTaskField({ priority: e.target.value })}
                    className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none font-medium text-slate-700"
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                </div>
              </div>

              {/* Description Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#111c2d] uppercase tracking-wider">
                    Mô tả tác vụ
                  </h3>
                  <button
                    onClick={saveDescription}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Lưu mô tả
                  </button>
                </div>
                <EditorContent editor={editor} />
              </div>

              {/* Subtasks Section */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-[#111c2d] uppercase tracking-wider">
                  Checklist Công Việc Con ({completedSubtasks}/{totalSubtasks})
                </h3>

                {/* Progress bar */}
                {totalSubtasks > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{progressPercent}%</span>
                  </div>
                )}

                {/* Subtask list */}
                <div className="flex flex-col gap-1.5">
                  {task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={sub.isCompleted}
                          onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                          className="rounded border-[#cfdaf2] text-primary focus:ring-primary h-4 w-4"
                        />
                        <span
                          className={`font-medium ${
                            sub.isCompleted ? "line-through text-slate-400" : "text-[#111c2d]"
                          }`}
                        >
                          {sub.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined block text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add subtask input */}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Thêm công việc con mới..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 border border-[#cfdaf2] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary placeholder-slate-400"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-white text-xs font-semibold px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Thêm
                  </button>
                </form>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-150"></div>

              {/* Comments Section */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-[#111c2d] uppercase tracking-wider">
                  Thảo luận ({task.comments.length})
                </h3>

                {/* Add comment */}
                <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    placeholder="Viết bình luận của bạn..."
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    className="w-full border border-[#cfdaf2] rounded-lg p-3 text-sm outline-none focus:border-primary placeholder-slate-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Gửi Bình Luận
                    </button>
                  </div>
                </form>

                {/* Comment list */}
                <div className="flex flex-col gap-4 mt-2">
                  {task.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comment.user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                        alt={comment.user.fullName}
                        className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-slate-100"
                      />
                      <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-800">{comment.user.fullName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleDateString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Styles for sliding animation */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
