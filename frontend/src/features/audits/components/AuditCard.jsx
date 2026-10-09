import React from "react";
import { useNavigate } from "react-router-dom";
import { AuditStatusBanner } from "./AuditStatusBanner.jsx";
import {
	formatRelativeTime,
	formatDistance,
	calculateAuditProgress,
} from "../utils/audit.utils.js";

/**
 * Compact audit card.
 *
 * Layout:
 *   Row 1: Store name + competitor badge                     ● STATUS
 *          Store location (area, city)
 *   Row 2: [👤 Auditor] [📅 Survey Period · OPEN]           ← chip row
 *   Row 3: ⏱ time · 📍 distance · 📋 observations · ⚠ GPS
 *   Row 4: progress bar (only for in-flight audits)
 */
export const AuditCard = ({ audit }) => {
	const navigate = useNavigate();
	const progress = calculateAuditProgress(audit);

	const store = audit?.store;
	const competitor = store?.competitor;
	const auditor = audit?.auditor;
	const surveyPeriod = audit?.surveyPeriod;
	const gps = audit?.gps;

	const observationsCount = audit?.observationsCount || 0;
	const auditorRoleLabel =
		auditor?.role === "FIELD_AUDITOR"
			? "Field Auditor"
			: auditor?.role === "MANAGER"
				? "Pricing Manager"
				: auditor?.role === "ADMIN"
					? "Administrator"
					: "";

	const surveyStatus = surveyPeriod?.status;
	const surveyStatusClass =
		surveyStatus === "OPEN"
			? "border-emerald-200 bg-emerald-50 text-[#017C4D]"
			: surveyStatus === "DRAFT"
				? "border-amber-200 bg-amber-50 text-[#FE7914]"
				: "border-slate-200 bg-slate-100 text-slate-600";

	return (
		<button
			type="button"
			onClick={() => navigate(`/audits/${audit.id}`)}
			className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition hover:border-slate-300 hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
		>
			{/* Row 1: store name + competitor + status */}
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-1.5">
						<h3 className="truncate text-sm font-bold text-slate-800">
							{store?.name || "Unknown store"}
						</h3>
						{competitor && (
							<span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
								{competitor.name}
							</span>
						)}
					</div>
					<p className="mt-0.5 truncate text-[11px] text-slate-500">
						{[store?.area, store?.city].filter(Boolean).join(", ") ||
							store?.address ||
							"No location"}
					</p>
				</div>
				<AuditStatusBanner status={audit.status} />
			</div>

			{/* Row 2: single-line chip row — auditor + survey period */}
			<div className="mt-2 flex flex-wrap items-center gap-1.5">
				{auditor && (
					<span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-slate-200 bg-slate-50/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
						<svg
							className="h-3 w-3 shrink-0 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
						<span className="truncate">
							{auditor.name}
							{auditorRoleLabel ? (
								<span className="hidden lg:inline"> · {auditorRoleLabel}</span>
							) : null}
						</span>
					</span>
				)}

				{surveyPeriod && (
					<span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-slate-200 bg-slate-50/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
						<svg
							className="h-3 w-3 shrink-0 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<span className="truncate">{surveyPeriod.name}</span>
						{surveyStatus && (
							<span
								className={`ml-0.5 rounded-sm border px-1 py-px text-[9px] font-bold uppercase tracking-wider ${surveyStatusClass}`}
							>
								{surveyStatus}
							</span>
						)}
					</span>
				)}
			</div>

			{/* Row 3: meta strip */}
			<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
				<span className="flex items-center gap-1">
					<svg
						className="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					{formatRelativeTime(audit.createdAt)}
				</span>

				{gps?.distanceFromStoreMeters !== null &&
					gps?.distanceFromStoreMeters !== undefined && (
						<span className="flex items-center gap-1">
							<svg
								className="h-3.5 w-3.5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							{formatDistance(gps.distanceFromStoreMeters)}
						</span>
					)}

				<span className="flex items-center gap-1">
					<svg
						className="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
					{observationsCount} observation{observationsCount === 1 ? "" : "s"}
				</span>

				{gps?.gpsValid === false && (
					<span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
						Outside radius
					</span>
				)}
				{gps?.gpsValid === true && (
					<span className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#017C4D]">
						Location verified
					</span>
				)}
			</div>

			{/* Row 4: progress bar (only for in-flight audits) */}
			{(audit.status === "IN_PROGRESS" || audit.status === "NOT_STARTED") && (
				<div className="mt-2">
					<div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
						<span>Collection progress</span>
						<span className="font-bold text-slate-600">{progress}%</span>
					</div>
					<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
						<div
							className={`h-full rounded-full transition-all duration-500 ${
								progress >= 100 ? "bg-[#017C4D]" : "bg-[#A41821]"
							}`}
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			)}
		</button>
	);
};