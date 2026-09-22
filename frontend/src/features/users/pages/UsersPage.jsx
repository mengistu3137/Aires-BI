import React, { useState } from "react";
import { useUsers } from "../hooks/useUsers.js";
import toast from "react-hot-toast";

export const UsersPage = () => {
  const { users, isLoading, createUser, updateUser, deleteUser } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "FIELD_AUDITOR",
  });

  const handleToggleActive = async (user) => {
    try {
      await updateUser({
        id: user.id,
        updates: { active: !user.active },
      });
    } catch {
      // Error handled in useUsers hook
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;

    try {
      const res = await deleteUser(deleteCandidate.id);
      if (res?.data?.deactivated) {
        toast(res.data.message, { icon: "ℹ️", duration: 5000 });
      } else {
        toast.success("User deleted successfully");
      }
      setDeleteCandidate(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createUser(formData);
      setIsModalOpen(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
        role: "FIELD_AUDITOR",
      });
    } catch {
      // Error handled in useUsers hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Auditors & Staff Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system administrators, pricing managers, and field data collectors
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
        >
          <span className="text-sm">+</span>
          Add Staff / Auditor
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Field Records</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/75 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <span className="text-[11px] text-slate-400">
                      {u.email || "No email assigned"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        u.role === "ADMIN"
                          ? "bg-slate-800 text-white"
                          : u.role === "MANAGER"
                          ? "bg-emerald-50 text-[#017C4D] border border-emerald-200"
                          : "bg-red-50 text-[#A41821] border border-red-200"
                      }`}
                    >
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600 font-medium">
                      {u.stats?.assignments || 0} assignments • {u.stats?.createdAudits || 0} audits
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.active
                          ? "bg-emerald-50 text-[#017C4D]"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          u.active ? "bg-[#017C4D]" : "bg-slate-400"
                        }`}
                      />
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(u)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition underline cursor-pointer"
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(u)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 transition underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for User Deletion */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove{" "}
              <span className="font-bold text-slate-900">{deleteCandidate.name}</span>?
              If this user has recorded field audits, their account will be deactivated instead of deleted to protect historical data.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Add Staff / Auditor</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abraham Tefera"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+2519..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="name@aires.et"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                >
                  <option value="FIELD_AUDITOR">Field Auditor</option>
                  <option value="MANAGER">Pricing Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};