"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";

interface Role {
  id: string;
  name: string;
  description: string;
  createdAt?: any;
}

export default function RolesManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      } else {
        setError("Không thể tải danh sách vai trò.");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setName("");
    setDescription("");
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles";
      const method = editingRole ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchRoles();
      } else {
        const err = await res.json();
        alert(err.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa vai trò này?")) return;
    try {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchRoles();
      } else {
        const err = await res.json();
        alert(err.error || "Không thể xóa vai trò");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
            Quản Lý Vai Trò (Roles)
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Định nghĩa các chức danh để phân bổ cho thành viên trong dự án.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1 bg-primary hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Thêm Vai Trò
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-primary animate-spin"></div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3">Tên Vai Trò</th>
                <th className="p-3">Mô tả</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                    Chưa có vai trò nào.
                  </td>
                </tr>
              ) : (
                roles.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-800">{r.name}</td>
                    <td className="p-3">{r.description || <span className="text-slate-400 italic">Trống</span>}</td>
                    <td className="p-3">
                      {r.createdAt ? format(new Date(r.createdAt.seconds ? r.createdAt.seconds * 1000 : r.createdAt), "dd/MM/yyyy") : "N/A"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openEditModal(r)}
                        className="p-1 text-slate-400 hover:text-primary transition-colors"
                        title="Sửa"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors ml-1"
                        title="Xóa"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#111c2d] text-base">
                {editingRole ? "Sửa Vai Trò" : "Thêm Vai Trò Mới"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined block text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tên Vai Trò *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Designer..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:border-primary bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mô tả</label>
                <textarea
                  rows={2}
                  placeholder="Quyền hạn hoặc nhiệm vụ chung..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-primary bg-slate-50 focus:bg-white transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors mt-2"
              >
                {saving ? "Đang lưu..." : "Lưu Vai Trò"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
