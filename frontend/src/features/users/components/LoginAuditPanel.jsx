import React, { useEffect, useState } from "react";
import { Clock, Globe, LogIn, Users } from "lucide-react";
import { getLoginAuditRequest } from "@/services/api/auth.api.js";

const ROLE_LABELS = {
	SUPER_ADMIN: "Aires Super Admin",
	ADMIN: "Aires Admin",
	AIRES_ANALYST: "Aires Analyst",
	FIELD_AUDITOR: "Field Auditor",
	QUEENS_GM: "General Manager",
	MANAGER: "Queens Admin",
	QUEENS_ANALYST: "Queens Analyst",
};

const formatWhen = (value) => {
	if (!value) return "—";
	return new Date(value).toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const formatStay = (seconds, stillSignedIn) => {
	if (stillSignedIn) return "Still signed in";
	const total = Number(seconds) || 0;
	if (total < 60) return "Under a minute";
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
};

const formatDevice = (row) => {
	const os = [row.osName, row.osVersion].filter(Boolean).join(" ");
	const browser = [row.browserName, row.browserVersion?.split(".")[0]].filter(Boolean).join(" ");
	return [os || "Unknown", browser].filter(Boolean).join(" · ");
};

const StatCard = ({ icon: Icon, label, value, hint }) => (
	<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
		<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
			<Icon size={14} />
			{label}
		</div>
		<p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
		<p className="mt-1 text-xs text-slate-500">{hint}</p>
	</div>
);

const LoginAuditPanel = () => {
	const [page, setPage] = useState(1);
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		setLoading(true);
		getLoginAuditRequest({ page, limit: 20 })
			.then((response) => {
				if (active) setResult(response.data);
			})
			.catch(() => {
				if (active) setError("The login audit could not be loaded.");
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [page]);

	const summary = result?.summary || {};
	const rows = result?.data || [];
	const meta = result?.meta || { page: 1, totalPages: 1, total: 0 };
	const averageStay = formatStay(summary.averageStaySeconds, false);

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard icon={Users} label="Signed in now" value={summary.signedInNow ?? "—"} hint="Seen in the last 15 minutes" />
				<StatCard icon={LogIn} label="Sign-ins today" value={summary.sessionsToday ?? "—"} hint="Since midnight on this server" />
				<StatCard icon={Clock} label="Average stay" value={summary.averageStaySeconds == null ? "—" : averageStay} hint="Closed sessions only" />
				<StatCard icon={Globe} label="People today" value={summary.peopleToday ?? "—"} hint="Different accounts that signed in" />
			</div>

			<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="border-b border-slate-100 px-4 py-3">
					<h3 className="text-sm font-bold text-slate-900">Sign-in history</h3>
					<p className="text-xs text-slate-500">Who signed in, from where, and when they signed out.</p>
				</div>
				{error ? <p className="px-4 py-6 text-sm text-rose-600">{error}</p> : null}
				{loading ? <p className="px-4 py-6 text-sm text-slate-500">Loading sign-ins…</p> : null}
				{!loading && !error && rows.length === 0 ? (
					<p className="px-4 py-6 text-sm text-slate-500">No sign-ins have been recorded yet. The next login will appear here.</p>
				) : null}
				{!loading && rows.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="min-w-full text-left text-sm">
							<thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-3">Staff</th>
									<th className="px-4 py-3">Signed in</th>
									<th className="px-4 py-3">Signed out</th>
									<th className="px-4 py-3">Stay</th>
									<th className="px-4 py-3">IP address</th>
									<th className="px-4 py-3">Location</th>
									<th className="px-4 py-3">Device</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{rows.map((row) => (
									<tr key={row.id}>
										<td className="px-4 py-3">
											<p className="font-semibold text-slate-900">{row.name}</p>
											<p className="text-xs text-slate-500">{ROLE_LABELS[row.role] || row.role}</p>
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatWhen(row.loginAt)}</td>
										<td className="whitespace-nowrap px-4 py-3 text-slate-700">
											{row.stillSignedIn ? "Still signed in" : formatWhen(row.logoutAt)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-slate-700">
											{formatStay(row.durationSeconds, row.stillSignedIn)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{row.ipAddress || "—"}</td>
										<td className="px-4 py-3 text-slate-600">{row.location || "—"}</td>
										<td className="px-4 py-3 text-slate-600">{formatDevice(row)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</div>

			{meta.totalPages > 1 ? (
				<div className="flex items-center justify-between text-sm text-slate-600">
					<button
						type="button"
						disabled={page <= 1}
						onClick={() => setPage((current) => Math.max(1, current - 1))}
						className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
					>
						Previous
					</button>
					<span>
						Page {meta.page} of {meta.totalPages}
					</span>
					<button
						type="button"
						disabled={page >= meta.totalPages}
						onClick={() => setPage((current) => current + 1)}
						className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
					>
						Next
					</button>
				</div>
			) : null}
		</div>
	);
};

export default LoginAuditPanel;
