// frontend/src/features/survey/components/SurveyPeriodSelector.jsx
import React from "react";
import { useSurveyPeriods } from "../hooks/useSurveyPeriods.js";

export const SurveyPeriodSelector = ({
	value,
	onChange,
	disabled = false,
	label = "Survey period",
	placeholder = "All survey periods",
	className = "",
}) => {
	const { data: periods = [], isLoading, isError } = useSurveyPeriods();

	const openPeriods = periods.filter((p) => p.status === "OPEN");
	const closedPeriods = periods.filter((p) => p.status === "CLOSED");
	const draftPeriods = periods.filter((p) => p.status === "DRAFT");

	return (
		<div className={`w-full sm:max-w-xs ${className}`}>
			{label && (
				<label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
					{label}
				</label>
			)}
			<select
				value={value || ""}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled || isLoading}
				className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821] disabled:opacity-50"
			>
				<option value="">
					{isLoading
						? "Loading survey periods..."
						: isError
							? "Unable to load periods"
							: placeholder}
				</option>

				{openPeriods.length > 0 && (
					<optgroup label="Open Cycles">
						{openPeriods.map((period) => (
							<option key={period.id} value={period.id}>
								{period.name || period.id}
							</option>
						))}
					</optgroup>
				)}

				{closedPeriods.length > 0 && (
					<optgroup label="Closed Historical Cycles">
						{closedPeriods.map((period) => (
							<option key={period.id} value={period.id}>
								{period.name || period.id} (Closed)
							</option>
						))}
					</optgroup>
				)}

				{draftPeriods.length > 0 && (
					<optgroup label="Draft Cycles">
						{draftPeriods.map((period) => (
							<option key={period.id} value={period.id}>
								{period.name || period.id} (Draft)
							</option>
						))}
					</optgroup>
				)}
			</select>
		</div>
	);
};