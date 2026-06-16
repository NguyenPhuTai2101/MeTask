"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  systemRole: string;
  status: string;
  createdAt: string;
}

export default function UsersManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError("Không thể tải danh sách người dùng.");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    if (id === user?.id && updates.status === "suspended") {
      alert("Bạn không thể tự đình chỉ chính mình!");
      return;
    }
    
    try {
      setProcessingId(id);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối.");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md text-[10px] font-bold border border-green-200">Đã duyệt</span>;
      case "pending":
        return <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-md text-[10px] font-bold border border-orange-200">Chờ duyệt</span>;
      case "suspended":
        return <span className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-bold border border-red-200">Đình chỉ</span>;
      default:
        return <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
            Quản Lý Tài Khoản (Users)
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Duyệt, phân quyền hoặc đình chỉ tài khoản người dùng trên hệ thống.
          </p>
        </div>
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
                <th className="p-3">Người Dùng</th>
                <th className="p-3">Quyền Hệ Thống</th>
                <th className="p-3">Trạng Thái</th>
                <th className="p-3">Ngày Đăng Ký</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                    Chưa có người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={u.avatarUrl} alt={u.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                        <div>
                          <p className="font-bold text-slate-800">{u.fullName}</p>
                          <p className="text-[10px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <select 
                        value={u.systemRole} 
                        onChange={(e) => updateUser(u.id, { systemRole: e.target.value })}
                        disabled={processingId === u.id || u.id === user?.id}
                        className="bg-white border border-slate-200 rounded px-2 py-1 outline-none text-[11px] disabled:opacity-50"
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(u.status)}
                    </td>
                    <td className="p-3 text-[11px]">
                      {u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy HH:mm") : "N/A"}
                    </td>
                    <td className="p-3 text-right">
                      {u.status === "pending" && (
                        <button
                          onClick={() => updateUser(u.id, { status: "active" })}
                          disabled={processingId === u.id}
                          className="bg-primary hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-md text-[10px] transition-colors shadow-sm disabled:opacity-50"
                        >
                          Duyệt
                        </button>
                      )}
                      
                      {u.status === "active" && u.id !== user?.id && (
                        <button
                          onClick={() => {
                            if (confirm("Bạn có chắc muốn đình chỉ tài khoản này?")) {
                              updateUser(u.id, { status: "suspended" });
                            }
                          }}
                          disabled={processingId === u.id}
                          className="border border-red-200 text-red-500 hover:bg-red-50 font-bold px-3 py-1.5 rounded-md text-[10px] transition-colors ml-2 disabled:opacity-50"
                        >
                          Đình chỉ
                        </button>
                      )}

                      {u.status === "suspended" && (
                        <button
                          onClick={() => updateUser(u.id, { status: "active" })}
                          disabled={processingId === u.id}
                          className="border border-green-200 text-green-600 hover:bg-green-50 font-bold px-3 py-1.5 rounded-md text-[10px] transition-colors shadow-sm ml-2 disabled:opacity-50"
                        >
                          Khôi phục
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
