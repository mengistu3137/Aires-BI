import React, { useState, useEffect, useMemo, useRef } from "react";
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
	const [isOpen, setIsOpen] = useState(false);
	const [expandedWeeks, setExpandedWeeks] = useState({});
	const containerRef = useRef(null);

	// Group daily cycles under their respective weekly parent cycles
	const { openWeekly, openDailyMap, closedWeekly, closedDailyMap } =
		useMemo(() => {
			const openW = [];
			const openD = {};
			const closedW = [];
			const closedD = {};

			periods.forEach((p) => {
				const isDaily =
					p.id.includes("-DAILY-") || p.name?.toLowerCase().includes("daily");
				const isClosed = p.status === "CLOSED";

				if (isDaily) {
					const parentKey = p.id.split("-DAILY-")[0];
					const targetMap = isClosed ? closedD : openD;
					if (!targetMap[parentKey]) targetMap[parentKey] = [];
					targetMap[parentKey].push(p);
				} else if (isClosed) {
					closedW.push(p);
				} else {
					openW.push(p);
				}
			});

			// Sort daily streams chronologically
			Object.keys(openD).forEach((k) =>
				openD[k].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)),
			);
			Object.keys(closedD).forEach((k) =>
				closedD[k].sort(
					(a, b) => new Date(a.startDate) - new Date(b.startDate),
				),
			);

			return {
				openWeekly: openW,
				openDailyMap: openD,
				closedWeekly: closedW,
				closedDailyMap: closedD,
			};
		}, [periods]);

	// Auto-expand parent week if currently selected cycle is one of its daily streams
	useEffect(() => {
		if (value && value.includes("-DAILY-")) {
			const parentKey = value.split("-DAILY-")[0];
			setExpandedWeeks((prev) => ({ ...prev, [parentKey]: true }));
		}
	}, [value]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const selectedObj = useMemo(
		() => periods.find((p) => String(p.id) === String(value)),
		[periods, value],
	);

	const isDailySelected = Boolean(
		value?.includes("-DAILY-") ||
			selectedObj?.name?.toLowerCase().includes("daily"),
	);

	const toggleWeek = (e, weekId) => {
		e.stopPropagation();
		setExpandedWeeks((prev) => ({
			...prev,
			[weekId]: !prev[weekId],
		}));
	};

	return (
		<div className={`relative ${className}`} ref={containerRef}>
			{label && (
				<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
					{label}
				</label>
			)}

			{/* Main Trigger Button */}
			<button
				type="button"
				disabled={disabled || isLoading}
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821] disabled:opacity-50 cursor-pointer text-left shadow-2xs hover:bg-slate-100/50 transition"
			>
				<div className="flex items-center gap-2 truncate pr-2">
					{value && (
						<span
							className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider flex-none ${
								isDailySelected
									? "bg-emerald-50 text-[#017C4D] border border-emerald-200"
									: "bg-red-50 text-[#A41821] border border-red-200"
							}`}
						>
							{isDailySelected ? "Daily Fresh" : "Weekly Ultra"}
						</span>
					)}
					<span className="truncate">
						{isLoading
							? "Loading survey periods..."
							: isError
								? "Unable to load periods"
								: selectedObj
									? selectedObj.name || selectedObj.id
									: placeholder}
					</span>
				</div>
				<span className="text-slate-400 text-xs ml-1 flex-none font-bold">
					{isOpen ? "▲" : "▼"}
				</span>
			</button>

			{/* Collapsible Dropdown Overlay */}
			{isOpen && (
				<div className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 space-y-1 text-xs">
					{/* "All Survey Periods" Option */}
					<button
						type="button"
						onClick={() => {
							onChange("");
							setIsOpen(false);
						}}
						className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-bold text-left transition cursor-pointer ${
							!value
								? "bg-slate-100 text-[#A41821]"
								: "text-slate-700 hover:bg-slate-50"
						}`}
					>
						<span>{placeholder}</span>
						{!value && <span className="text-xs">✓</span>}
					</button>

					{/* ── Open Cycles ── */}
					{openWeekly.length > 0 && (
						<div className="pt-1 border-t border-slate-100 space-y-1">
							<p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Open Cycles
							</p>

							{openWeekly.map((wp) => {
								const dailyList = openDailyMap[wp.id] || [];
								const isExpanded = Boolean(expandedWeeks[wp.id]);
								const isWeeklySelected = String(value) === String(wp.id);

								return (
									<div
										key={wp.id}
										className="rounded-lg border border-slate-100 bg-slate-50/50 overflow-hidden"
									>
										<div className="flex items-center justify-between p-2 hover:bg-slate-100/80 transition">
											{/* Expanding Arrow */}
											{dailyList.length > 0 && (
												<button
													type="button"
													onClick={(e) => toggleWeek(e, wp.id)}
													className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-slate-200/70 text-slate-600 hover:bg-slate-300 text-[9px] font-bold cursor-pointer transition flex-none"
													title={
														isExpanded
															? "Collapse daily cycles"
															: "Expand 7 daily cycles"
													}
												>
													{isExpanded ? "▼" : "▶"}
												</button>
											)}

											{/* Select Weekly Cycle */}
											<div
												onClick={() => {
													onChange(wp.id);
													setIsOpen(false);
												}}
												className="flex-1 cursor-pointer min-w-0"
											>
												<span
													className={`text-xs font-bold block truncate ${
														isWeeklySelected
															? "text-[#A41821]"
															: "text-slate-800"
													}`}
												>
													{isWeeklySelected ? "✓ " : ""}
													{wp.name || wp.id}
												</span>
												{dailyList.length > 0 && (
													<span className="text-[10px] text-emerald-700 font-semibold block">
														({dailyList.length} daily streams)
													</span>
												)}
											</div>
										</div>

										{/* 7 Daily Cycles Collapsed by Default */}
										{isExpanded && dailyList.length > 0 && (
											<div className="border-t border-slate-200 bg-white py-1 pl-6 pr-2 space-y-0.5 animate-in fade-in">
												{dailyList.map((dp) => {
													const isDailyChildSelected =
														String(value) === String(dp.id);

													return (
														<button
															key={dp.id}
															type="button"
															onClick={() => {
																onChange(dp.id);
																setIsOpen(false);
															}}
															className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-[11px] transition cursor-pointer ${
																isDailyChildSelected
																	? "bg-emerald-50 text-[#017C4D] font-bold"
																	: "text-slate-600 hover:bg-slate-50"
															}`}
														>
															<span className="truncate">↳ {dp.name}</span>
															<span className="text-[9px] font-mono text-slate-400">
																Daily
															</span>
														</button>
													);
												})}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}

					{/* ── Closed Historical Cycles ── */}
					{closedWeekly.length > 0 && (
						<div className="pt-2 border-t border-slate-100 space-y-1">
							<p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Closed Historical Cycles
							</p>

							{closedWeekly.map((wp) => {
								const dailyList = closedDailyMap[wp.id] || [];
								const isExpanded = Boolean(expandedWeeks[wp.id]);
								const isWeeklySelected = String(value) === String(wp.id);

								return (
									<div
										key={wp.id}
										className="rounded-lg border border-slate-100 bg-slate-50/40 overflow-hidden"
									>
										<div className="flex items-center justify-between p-2 hover:bg-slate-100/80 transition">
											{dailyList.length > 0 && (
												<button
													type="button"
													onClick={(e) => toggleWeek(e, wp.id)}
													className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-slate-200/70 text-slate-500 hover:bg-slate-300 text-[9px] font-bold cursor-pointer transition flex-none"
												>
													{isExpanded ? "▼" : "▶"}
												</button>
											)}

											<div
												onClick={() => {
													onChange(wp.id);
													setIsOpen(false);
												}}
												className="flex-1 cursor-pointer min-w-0"
											>
												<span
													className={`text-xs font-semibold block truncate ${
														isWeeklySelected
															? "text-[#A41821] font-bold"
															: "text-slate-600"
													}`}
												>
													{isWeeklySelected ? "✓ " : ""}
													{wp.name || wp.id} (Closed)
												</span>
											</div>
										</div>

										{isExpanded && dailyList.length > 0 && (
											<div className="border-t border-slate-200 bg-white py-1 pl-6 pr-2 space-y-0.5 animate-in fade-in">
												{dailyList.map((dp) => (
													<button
														key={dp.id}
														type="button"
														onClick={() => {
															onChange(dp.id);
															setIsOpen(false);
														}}
														className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-[11px] transition cursor-pointer ${
															String(value) === String(dp.id)
																? "bg-slate-100 text-[#A41821] font-bold"
																: "text-slate-500 hover:bg-slate-50"
														}`}
													>
														<span className="truncate">↳ {dp.name}</span>
														<span className="text-[9px] font-mono text-slate-400">
															Closed
														</span>
													</button>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
};