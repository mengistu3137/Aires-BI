import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useUsers } from "../hooks/useUsers.js";
import { useAuth } from "@/hooks/useAuth.js";
import { normalizeEthiopianPhone } from "@/utils/phone.utils.js";
import toast from "react-hot-toast";

const LocationPermissionBadge = ({ role, permission }) => {
	if (role !== "FIELD_AUDITOR") {
		return (
			<span className="text-slate-400 font-mono text-[10px]">N/A (Staff)</span>
		);
	}

	const perm = (permission || "NOT_REQUESTED").toUpperCase();
	const isAllowed = perm === "ALLOWED" || perm === "GRANTED";
	const isDenied = perm === "DENIED";
	const isPrompt = perm === "PROMPT";

	let badgeStyle = "bg-slate-100 text-slate-500 border-slate-200";
	let dotStyle = "bg-slate-400";
	let label = "Not Requested";

	if (isAllowed) {
		badgeStyle = "bg-emerald-50 text-[#017C4D] border-emerald-200";
		dotStyle = "bg-[#017C4D]";
		label = "Allowed";
	} else if (isDenied) {
		badgeStyle = "bg-red-50 text-[#A41821] border-red-200";
		dotStyle = "bg-[#A41821]";
		label = "Denied / Blocked";
	} else if (isPrompt) {
		badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
		dotStyle = "bg-amber-500";
		label = "Prompt Pending";
	}

	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors duration-300 ${badgeStyle}`}
		>
			<span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} />
			{label}
		</span>
	);
};

const DEFAULT_CREATE_FORM = {
	name: "",
	phone: "+251",
	email: "",
	password: "",
	role: "FIELD_AUDITOR",
};

export const UsersPage = () => {
	const { user: currentUser, isAdmin, isAuditor } = useAuth();
	const { users, isLoading, createUser, updateUser, deleteUser } = useUsers();

	// 1. Strict Admin-Only Authorization Guard
	if (!isAdmin) {
		return <Navigate to={isAuditor ? "/audits" : "/dashboard"} replace />;
	}

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState(null);
	const [deleteCandidate, setDeleteCandidate] = useState(null);

	const [createFormData, setCreateFormData] = useState(DEFAULT_CREATE_FORM);
	const [editFormData, setEditFormData] = useState({
		name: "",
		phone: "+251",
		email: "",
		password: "",
		role: "FIELD_AUDITOR",
		active: true,
	});

	// Open Edit Modal
	const handleOpenEditModal = (u) => {
		setEditingUser(u);
		setEditFormData({
			name: u.name || "",
			phone: normalizeEthiopianPhone(u.phone || ""),
			email: u.email || "",
			password: "", // Left blank unless admin wishes to reset
			role: u.role || "FIELD_AUDITOR",
			active: u.active !== false,
		});
	};

	// Toggle active state in table
	const handleToggleActive = async (u) => {
		try {
			await updateUser({
				id: u.id,
				updates: { active: !u.active },
			});
		} catch {
			// Error handled in hook toast
		}
	};

	// Confirm delete/deactivate
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

	// Submit Create User
	const handleCreateSubmit = async (e) => {
		e.preventDefault();

		if (createFormData.phone.length !== 13) {
			toast.error(
				"Please enter a valid 9-digit Ethiopian mobile number (+2519... or +2517...)",
			);
			return;
		}

		try {
			await createUser({
				...createFormData,
				email: createFormData.email?.trim() || undefined,
			});
			setIsCreateModalOpen(false);
			setCreateFormData(DEFAULT_CREATE_FORM);
		} catch {
			// Error handled in hook
		}
	};

	// Submit Edit User
	const handleEditSubmit = async (e) => {
		e.preventDefault();
		if (!editingUser) return;

		if (editFormData.phone.length !== 13) {
			toast.error(
				"Please enter a valid 9-digit Ethiopian mobile number (+2519... or +2517...)",
			);
			return;
		}

		try {
			const updates = {
				name: editFormData.name.trim(),
				phone: editFormData.phone,
				email: editFormData.email?.trim() || "",
				role: editFormData.role,
				active: editFormData.active,
			};

			// Only pass password if admin typed a new one
			if (editFormData.password.trim()) {
				updates.password = editFormData.password.trim();
			}

			await updateUser({
				id: editingUser.id,
				updates,
			});

			setEditingUser(null);
		} catch {
			// Error handled in hook
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
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-black text-slate-900 tracking-tight">
							Auditors & Staff Management
						</h1>
						<span className="rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-[#A41821] uppercase tracking-wider">
							Admin Only
						</span>
					</div>
					<p className="text-xs text-slate-500 mt-0.5">
						Manage system administrators, pricing managers, and field data
						collectors
					</p>
				</div>

				<button
					type="button"
					onClick={() => {
						setCreateFormData(DEFAULT_CREATE_FORM);
						setIsCreateModalOpen(true);
					}}
					className="inline-flex items-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
				>
					<span className="text-sm">+</span>
					Add User
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
								<th className="px-4 py-3">GPS Permission</th>
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
									<td className="px-4 py-3 font-mono text-slate-600 font-semibold">
										{u.phone}
									</td>

									<td className="px-4 py-3">
										<LocationPermissionBadge
											role={u.role}
											permission={u.locationPermission}
										/>
									</td>

									<td className="px-4 py-3">
										<span className="text-slate-600 font-medium">
											{u.stats?.assignments || 0} assignments •{" "}
											{u.stats?.createdAudits || 0} audits
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
									<td className="px-4 py-3 text-right space-x-2">
										<button
											type="button"
											onClick={() => handleOpenEditModal(u)}
											className="text-xs font-semibold text-slate-700 hover:text-[#A41821] transition cursor-pointer"
										>
											Edit
										</button>
										<span className="text-slate-300">|</span>
										<button
											type="button"
											onClick={() => handleToggleActive(u)}
											className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition underline cursor-pointer"
										>
											{u.active ? "Deactivate" : "Activate"}
										</button>
										<span className="text-slate-300">|</span>
										<button
											type="button"
											onClick={() => setDeleteCandidate(u)}
											className="text-xs font-semibold text-red-600 hover:text-red-800 transition cursor-pointer"
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

			{/* 2. Add User Modal */}
			{isCreateModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h2 className="text-base font-bold text-slate-900">
								Add Staff / Auditor
							</h2>
							<button
								type="button"
								onClick={() => setIsCreateModalOpen(false)}
								className="text-slate-400 hover:text-slate-600 cursor-pointer"
							>
								✕
							</button>
						</div>

						<form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Full Name
								</label>
								<input
									type="text"
									required
									placeholder="e.g. Abraham Tefera"
									value={createFormData.name}
									onChange={(e) =>
										setCreateFormData({
											...createFormData,
											name: e.target.value,
										})
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							{/* Phone with Auto +251 & Paste Truncate */}
							<div>
								<div className="flex items-center justify-between mb-1">
									<label className="font-semibold text-slate-700">
										Phone Number
									</label>
									<span className="text-[10px] text-slate-400 font-mono">
										Format: +251 9XXXXXXXX
									</span>
								</div>
								<input
									type="tel"
									required
									placeholder="+251911223344"
									value={createFormData.phone}
									onChange={(e) =>
										setCreateFormData({
											...createFormData,
											phone: normalizeEthiopianPhone(e.target.value),
										})
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-semibold text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Email (Optional)
								</label>
								<input
									type="email"
									placeholder="name@aires.et"
									value={createFormData.email}
									onChange={(e) =>
										setCreateFormData({
											...createFormData,
											email: e.target.value,
										})
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Password
								</label>
								<input
									type="password"
									required
									placeholder="••••••••"
									value={createFormData.password}
									onChange={(e) =>
										setCreateFormData({
											...createFormData,
											password: e.target.value,
										})
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									System Role
								</label>
								<select
									value={createFormData.role}
									onChange={(e) =>
										setCreateFormData({
											...createFormData,
											role: e.target.value,
										})
									}
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
									onClick={() => setIsCreateModalOpen(false)}
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

			{/* 3. Edit User Modal */}
			{editingUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div>
								<h2 className="text-base font-bold text-slate-900">
									Edit User Profile
								</h2>
								<p className="text-[11px] text-slate-500 font-mono">
									ID: {editingUser.id}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setEditingUser(null)}
								className="text-slate-400 hover:text-slate-600 cursor-pointer"
							>
								✕
							</button>
						</div>

						<form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Full Name
								</label>
								<input
									type="text"
									required
									value={editFormData.name}
									onChange={(e) =>
										setEditFormData({ ...editFormData, name: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							{/* Phone with Auto +251 & Paste Truncate */}
							<div>
								<div className="flex items-center justify-between mb-1">
									<label className="font-semibold text-slate-700">
										Phone Number
									</label>
									<span className="text-[10px] text-slate-400 font-mono">
										Format: +251 9XXXXXXXX
									</span>
								</div>
								<input
									type="tel"
									required
									value={editFormData.phone}
									onChange={(e) =>
										setEditFormData({
											...editFormData,
											phone: normalizeEthiopianPhone(e.target.value),
										})
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-semibold text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Email
								</label>
								<input
									type="email"
									placeholder="name@aires.et"
									value={editFormData.email}
									onChange={(e) =>
										setEditFormData({ ...editFormData, email: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<div className="flex items-center justify-between mb-1">
									<label className="font-semibold text-slate-700">
										Reset Password
									</label>
									<span className="text-[10px] text-slate-400">
										Leave blank to keep unchanged
									</span>
								</div>
								<input
									type="password"
									placeholder="Enter new password to reset"
									value={editFormData.password}
									onChange={(e) =>
										setEditFormData({
											...editFormData,
											password: e.target.value,
										})
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									System Role
								</label>
								<select
									value={editFormData.role}
									onChange={(e) =>
										setEditFormData({ ...editFormData, role: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								>
									<option value="FIELD_AUDITOR">Field Auditor</option>
									<option value="MANAGER">Pricing Manager</option>
									<option value="ADMIN">Administrator</option>
								</select>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Account Status
								</label>
								<select
									value={editFormData.active ? "true" : "false"}
									onChange={(e) =>
										setEditFormData({
											...editFormData,
											active: e.target.value === "true",
										})
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								>
									<option value="true">Active (Can log in)</option>
									<option value="false">Inactive (Suspended)</option>
								</select>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setEditingUser(null)}
									className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer"
								>
									Update User
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Confirmation Modal for User Deletion */}
			{deleteCandidate && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
						<h3 className="text-base font-bold text-slate-900">
							Confirm Deletion
						</h3>
						<p className="text-xs text-slate-600 leading-relaxed">
							Are you sure you want to remove{" "}
							<strong className="text-slate-900">{deleteCandidate.name}</strong>
							? If this user has recorded field audits or observations, their
							account will be deactivated instead of deleted to protect
							historical data integrity.
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
		</div>
	);
};