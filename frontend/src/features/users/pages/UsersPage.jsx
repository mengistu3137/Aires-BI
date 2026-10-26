import React, { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useUsers } from "../hooks/useUsers.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useAuthStore } from "@/stores/auth/auth.store.js";
import { normalizeEthiopianPhone } from "@/utils/phone.utils.js";
import { impersonateUserRequest } from "@/services/api/auth.api.js";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

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
		label = "Denied";
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
	phone: "",
	email: "",
	password: "",
	role: "FIELD_AUDITOR",
};

export const UsersPage = () => {
	const navigate = useNavigate();
	const {
		user: currentUser,
		isAdmin,
		isSuperAdmin,
		canImpersonate,
		isAuditor,
		isImpersonating,
		impersonate,
		stopImpersonation,
	} = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();

	const page = Math.max(1, Number(searchParams.get("page") || 1));

	const setPage = (next) => {
		const nextParams = new URLSearchParams(searchParams);
		if (next <= 1) nextParams.delete("page");
		else nextParams.set("page", String(next));
		setSearchParams(nextParams, { replace: true });
	};

	const {
		users,
		meta,
		isLoading,
		isFetching,
		createUser,
		updateUser,
		deleteUser,
	} = useUsers({ page, limit: PAGE_SIZE });

	if (!isAdmin && !isImpersonating) {
		return <Navigate to={isAuditor ? "/audits" : "/dashboard"} replace />;
	}

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState(null);
	const [deleteCandidate, setDeleteCandidate] = useState(null);
	const [isImpersonatingLoading, setIsImpersonatingLoading] = useState(false);

	const [showCreatePassword, setShowCreatePassword] = useState(false);
	const [showEditPassword, setShowEditPassword] = useState(false);

	const [createFormData, setCreateFormData] = useState(DEFAULT_CREATE_FORM);
	const [editFormData, setEditFormData] = useState({
		name: "",
		phone: "+251",
		email: "",
		password: "",
		role: "FIELD_AUDITOR",
		active: true,
	});

	const handleOpenEditModal = (u) => {
		setEditingUser(u);
		setShowEditPassword(false);
		setEditFormData({
			name: u.name || "",
			phone: normalizeEthiopianPhone(u.phone || ""),
			email: u.email || "",
			password: "",
			role: u.role || "FIELD_AUDITOR",
			active: u.active !== false,
		});
	};

	const handleToggleActive = async (u) => {
		try {
			await updateUser({
				id: u.id,
				updates: { active: !u.active },
			});
		} catch {
			// Handled in toast
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

	const handleCreateSubmit = async (e) => {
		e.preventDefault();

		const phone = createFormData.phone.trim();
		const email = createFormData.email.trim();

		if (!phone && !email) {
			toast.error("Please provide either a phone number or an email address");
			return;
		}

		if (phone && phone.length !== 13) {
			toast.error(
				"Please enter a valid 9-digit Ethiopian mobile number (+2519... or 09...)",
			);
			return;
		}

		try {
			await createUser({
				...createFormData,
				phone: phone || undefined,
				email: email || undefined,
			});
			setIsCreateModalOpen(false);
			setShowCreatePassword(false);
			setCreateFormData(DEFAULT_CREATE_FORM);
		} catch {
			// Handled by toast
		}
	};

	const handleEditSubmit = async (e) => {
		e.preventDefault();
		if (!editingUser) return;

		const phone = editFormData.phone?.trim() || "";
		const email = editFormData.email?.trim() || "";

		if (!phone && !email) {
			toast.error("Please provide either a phone number or an email address");
			return;
		}

		if (phone && phone !== "+251" && phone.length !== 13) {
			toast.error(
				"Please enter a valid 9-digit Ethiopian mobile number (+2519... or 09...)",
			);
			return;
		}

		try {
			const updates = {
				name: editFormData.name.trim(),
				phone: phone && phone !== "+251" ? phone : null,
				email: email || null,
				role: editFormData.role,
				active: editFormData.active,
			};

			if (editFormData.password && editFormData.password.trim().length > 0) {
				updates.password = editFormData.password.trim();
			}

			await updateUser({ id: editingUser.id, updates });
			setEditingUser(null);
			setShowEditPassword(false);
		} catch {
			// Handled by toast
		}
	};

	// Super Admin signs in as the target user
	const handleImpersonate = async (targetUser) => {
		if (targetUser.id === currentUser?.id) {
			toast.error("You are already signed into this account");
			return;
		}

		setIsImpersonatingLoading(true);
		const toastId = toast.loading(`Signing in as ${targetUser.name}...`);

		try {
			const res = await impersonateUserRequest(targetUser.id);
			const { token, user: impersonatedUserData, impersonator } = res.data;

			const store = useAuthStore.getState();

			if (typeof impersonate === "function") {
				impersonate({
					targetUser: impersonatedUserData,
					token,
					impersonator,
				});
			} else if (typeof store.impersonate === "function") {
				store.impersonate({
					targetUser: impersonatedUserData,
					token,
					impersonator,
				});
			} else {
				store.setAuth({ user: impersonatedUserData, token });
			}

			toast.success(`Signed in on behalf of ${targetUser.name}`, {
				id: toastId,
			});

			if (targetUser.role === "FIELD_AUDITOR") {
				navigate("/audits");
			} else {
				navigate("/dashboard");
			}
		} catch (err) {
			toast.error(
				err?.response?.data?.message || err?.message || "Impersonation failed",
				{
					id: toastId,
				},
			);
		} finally {
			setIsImpersonatingLoading(false);
		}
	};

	const formatRoleBadge = (r) => {
		if (r === "SUPER_ADMIN")
			return { label: "Aires Super Admin", style: "bg-[#A41821] text-white" };
		if (r === "ADMIN")
			return { label: "Aires Admin", style: "bg-slate-800 text-white" };
		if (r === "MANAGER")
			return {
				label: "Queens Admin",
				style: "bg-emerald-50 text-[#017C4D] border border-emerald-200",
			};
		return {
			label: "Field Auditor",
			style: "bg-blue-50 text-blue-700 border border-blue-200",
		};
	};

	if (isLoading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-5 pb-16 px-1 sm:px-0">
			{/* Top Banner */}
			<div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
							User Access &amp; Role Management
						</h1>
						<span className="rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#A41821] uppercase tracking-wider">
							{isSuperAdmin ? "Aires Super Admin" : "Aires Administrator"}
						</span>
					</div>
					<p className="text-xs text-slate-500 mt-0.5">
						Aires Super Admin, Aires Operations Admins, Queens Client Admins,
						and Field Auditors
					</p>
				</div>

				<button
					type="button"
					onClick={() => {
						setCreateFormData(DEFAULT_CREATE_FORM);
						setShowCreatePassword(false);
						setIsCreateModalOpen(true);
					}}
					className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
				>
					<span className="text-sm font-bold">+</span>
					Add User
				</button>
			</div>

			{/* Desktop Table View */}
			<div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold text-[10px]">
							<tr>
								<th className="px-4 py-3">Staff Member</th>
								<th className="px-4 py-3">Role &amp; Organization</th>
								<th className="px-4 py-3">Phone</th>
								<th className="px-4 py-3">GPS Status</th>
								<th className="px-4 py-3">Activity</th>
								<th className="px-4 py-3">Status</th>
								<th className="px-4 py-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-slate-700">
							{users.map((u) => {
								const isSelf = u.id === currentUser?.id;
								const badge = formatRoleBadge(u.role);

								return (
									<tr key={u.id} className="hover:bg-slate-50/75 transition">
										<td className="px-4 py-3">
											<div className="font-bold text-slate-900 flex items-center gap-1.5">
												<span>{u.name}</span>
												{isSelf && (
													<span className="rounded bg-slate-200 px-1 py-0.2 text-[9px] font-bold text-slate-700 font-mono">
														YOU
													</span>
												)}
											</div>
											<span className="text-[11px] text-slate-400">
												{u.email || "No email assigned"}
											</span>
										</td>
										<td className="px-4 py-3">
											<span
												className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.style}`}
											>
												{badge.label}
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
											{/* "Sign in as User" IS EXCLUSIVELY VISIBLE TO AIRES SUPER ADMIN */}
											{canImpersonate && !isSelf && u.active && (
												<>
													<button
														type="button"
														disabled={isImpersonatingLoading}
														onClick={() => handleImpersonate(u)}
														className="text-xs font-bold text-[#017C4D] hover:underline cursor-pointer disabled:opacity-40"
														title={`Sign into Aires-BI on behalf of ${u.name}`}
													>
														Sign in as User
													</button>
													<span className="text-slate-300">|</span>
												</>
											)}

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
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Mobile Card List View */}
			<div className="space-y-3 md:hidden">
				{users.map((u) => {
					const isSelf = u.id === currentUser?.id;
					const badge = formatRoleBadge(u.role);

					return (
						<div
							key={u.id}
							className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 transition"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
										<span>{u.name}</span>
										{isSelf && (
											<span className="rounded bg-slate-200 px-1 py-0.2 text-[9px] font-bold text-slate-700 font-mono">
												YOU
											</span>
										)}
									</div>
									<div className="text-[11px] text-slate-400 truncate">
										{u.email || "No email assigned"}
									</div>
								</div>

								<div className="flex flex-col items-end gap-1 flex-none">
									<span
										className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-bold ${badge.style}`}
									>
										{badge.label}
									</span>
									<span
										className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
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
								</div>
							</div>

							<div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
								<div>
									<span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
										Phone
									</span>
									<span className="font-mono font-semibold text-slate-700">
										{u.phone}
									</span>
								</div>
								<div>
									<span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
										GPS Status
									</span>
									<div className="mt-0.5">
										<LocationPermissionBadge
											role={u.role}
											permission={u.locationPermission}
										/>
									</div>
								</div>
							</div>

							<div className="text-[11px] text-slate-500 font-medium">
								{u.stats?.assignments || 0} assignments •{" "}
								{u.stats?.createdAudits || 0} audits
							</div>

							<div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
								{/* "Sign in as User" IS EXCLUSIVELY VISIBLE TO AIRES SUPER ADMIN */}
								{canImpersonate && !isSelf && u.active ? (
									<button
										type="button"
										disabled={isImpersonatingLoading}
										onClick={() => handleImpersonate(u)}
										className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-[#017C4D] hover:bg-emerald-100 transition cursor-pointer"
									>
										Sign in as User
									</button>
								) : (
									<span />
								)}

								<div className="flex items-center gap-1.5">
									<button
										type="button"
										onClick={() => handleOpenEditModal(u)}
										className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => handleToggleActive(u)}
										className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
									>
										{u.active ? "Deactivate" : "Activate"}
									</button>
									<button
										type="button"
										onClick={() => setDeleteCandidate(u)}
										className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-[#A41821] hover:bg-red-100 transition cursor-pointer"
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Pagination footer */}
			{!isLoading && meta.totalPages > 1 && (
				<div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs sm:flex-row">
					<p className="text-[11px] font-semibold text-slate-500">
						Page{" "}
						<span className="font-mono font-bold text-slate-700">
							{meta.page}
						</span>{" "}
						of{" "}
						<span className="font-mono font-bold text-slate-700">
							{meta.totalPages}
						</span>{" "}
						·{" "}
						<span className="font-mono font-bold text-slate-700">
							{meta.total}
						</span>{" "}
						total users
					</p>

					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setPage(1)}
							disabled={meta.page <= 1 || isFetching}
							className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							«
						</button>
						<button
							type="button"
							onClick={() => setPage(meta.page - 1)}
							disabled={meta.page <= 1 || isFetching}
							className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Previous
						</button>

						<button
							type="button"
							onClick={() => setPage(meta.page + 1)}
							disabled={meta.page >= meta.totalPages || isFetching}
							className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Next
						</button>
						<button
							type="button"
							onClick={() => setPage(meta.totalPages)}
							disabled={meta.page >= meta.totalPages || isFetching}
							className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							»
						</button>
					</div>
				</div>
			)}

			{/* Add User Modal */}
			{isCreateModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-slate-100 space-y-4 my-auto max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-none">
							<h2 className="text-base font-bold text-slate-900">
								Add Platform User
							</h2>
							<button
								type="button"
								onClick={() => setIsCreateModalOpen(false)}
								className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
							>
								✕
							</button>
						</div>

						<form
							onSubmit={handleCreateSubmit}
							className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1"
						>
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
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Phone Number
								</label>
								<input
									type="tel"
									placeholder="+251911223344"
									value={createFormData.phone}
									onChange={(e) =>
										setCreateFormData({
											...createFormData,
											phone: normalizeEthiopianPhone(e.target.value),
										})
									}
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono font-semibold text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Email
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
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Password
								</label>
								<div className="relative">
									<input
										type={showCreatePassword ? "text" : "password"}
										required
										placeholder="••••••••"
										value={createFormData.password}
										onChange={(e) =>
											setCreateFormData({
												...createFormData,
												password: e.target.value,
											})
										}
										className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-11 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
									/>
									<button
										type="button"
										tabIndex={-1}
										onClick={() => setShowCreatePassword(!showCreatePassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
									>
										{showCreatePassword ? "Hide" : "Show"}
									</button>
								</div>
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
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								>
									<option value="FIELD_AUDITOR">Field Auditor</option>
									<option value="MANAGER">Queens Admin (Client Admin)</option>
									<option value="ADMIN">Aires Admin (Operations)</option>
									{isSuperAdmin && (
										<option value="SUPER_ADMIN">
											Aires Super Admin (Full Control)
										</option>
									)}
								</select>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-slate-100 flex-none">
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

			{/* Edit User Modal */}
			{editingUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-slate-100 space-y-4 my-auto max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-none">
							<div>
								<h2 className="text-base font-bold text-slate-900">
									Edit User Profile
								</h2>
								<p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
									ID: {editingUser.id}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setEditingUser(null)}
								className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
							>
								✕
							</button>
						</div>

						<form
							onSubmit={handleEditSubmit}
							className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1"
						>
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
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Phone Number
								</label>
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
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono font-semibold text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
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
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Reset Password (Leave blank to keep current)
								</label>
								<div className="relative">
									<input
										type={showEditPassword ? "text" : "password"}
										placeholder="Enter new password to reset"
										value={editFormData.password}
										onChange={(e) =>
											setEditFormData({
												...editFormData,
												password: e.target.value,
											})
										}
										className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-11 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
									/>
									<button
										type="button"
										tabIndex={-1}
										onClick={() => setShowEditPassword(!showEditPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
									>
										{showEditPassword ? "Hide" : "Show"}
									</button>
								</div>
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
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								>
									<option value="FIELD_AUDITOR">Field Auditor</option>
									<option value="MANAGER">Queens Admin (Client Admin)</option>
									<option value="ADMIN">Aires Admin (Operations)</option>
									{isSuperAdmin && (
										<option value="SUPER_ADMIN">
											Aires Super Admin (Full Control)
										</option>
									)}
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
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								>
									<option value="true">Active (Can log in)</option>
									<option value="false">Inactive (Suspended)</option>
								</select>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-slate-100 flex-none">
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

			{/* Deletion Confirmation Modal */}
			{deleteCandidate && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-slate-100 space-y-4 my-auto">
						<h3 className="text-base font-bold text-slate-900">
							Confirm Deletion
						</h3>
						<p className="text-xs text-slate-600 leading-relaxed">
							Are you sure you want to remove{" "}
							<strong className="text-slate-900">{deleteCandidate.name}</strong>
							? If this user has recorded field audits or observations, their
							account will be deactivated instead of deleted.
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