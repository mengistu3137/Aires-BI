import React, { useState } from "react";
import { useUsers } from "../hooks/useUsers.js";
import { PILOT_COMPETITORS } from "@/data/pilotData.js";

export const UsersPage = () => {
	const { users, isLoading, createUser, updateUser } = useUsers();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		phone: "",
		email: "",
		password: "",
		role: "FIELD_AUDITOR",
		assignedCompetitors: ["shoa"],
	});

	const handleToggleActive = async (user) => {
		await updateUser({
			id: user.id,
			updates: { active: !user.active },
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		await createUser(formData);
		setIsModalOpen(false);
		setFormData({
			name: "",
			phone: "",
			email: "",
			password: "",
			role: "FIELD_AUDITOR",
			assignedCompetitors: ["shoa"],
		});
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
						Auditors & Territories
					</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						Manage field survey staff, pricing managers, and retail competitor
						assignments
					</p>
				</div>

				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="inline-flex items-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
				>
					<span className="text-sm">+</span>
					Add Auditor / Staff
				</button>
			</div>

			{/* Users Table */}
			<div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold text-[10px]">
							<tr>
								<th className="px-4 py-3">User</th>
								<th className="px-4 py-3">Role</th>
								<th className="px-4 py-3">Phone</th>
								<th className="px-4 py-3">Assigned Competitors</th>
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
											{u.email || "No email"}
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
									<td className="px-4 py-3 font-mono text-slate-600">
										{u.phone}
									</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap gap-1">
											{(u.assignedCompetitors || []).length > 0 ? (
												u.assignedCompetitors.map((c) => (
													<span
														key={c}
														className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 uppercase"
													>
														{c}
													</span>
												))
											) : (
												<span className="text-slate-400 italic">
													None assigned
												</span>
											)}
										</div>
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
									<td className="px-4 py-3 text-right">
										<button
											type="button"
											onClick={() => handleToggleActive(u)}
											className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition underline"
										>
											{u.active ? "Deactivate" : "Activate"}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Add User Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h2 className="text-base font-bold text-slate-900">
								Add New Staff / Auditor
							</h2>
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="text-slate-400 hover:text-slate-600"
							>
								✕
							</button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Full Name
								</label>
								<input
									type="text"
									required
									placeholder="e.g. Dawit Haile"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Phone Number
								</label>
								<input
									type="text"
									required
									placeholder="+251..."
									value={formData.phone}
									onChange={(e) =>
										setFormData({ ...formData, phone: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Email (Optional)
								</label>
								<input
									type="email"
									placeholder="name@aires.et"
									value={formData.email}
									onChange={(e) =>
										setFormData({ ...formData, email: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Temporary Password
								</label>
								<input
									type="password"
									required
									placeholder="••••••••"
									value={formData.password}
									onChange={(e) =>
										setFormData({ ...formData, password: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Role
								</label>
								<select
									value={formData.role}
									onChange={(e) =>
										setFormData({ ...formData, role: e.target.value })
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
									onClick={() => setIsModalOpen(false)}
									className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs"
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