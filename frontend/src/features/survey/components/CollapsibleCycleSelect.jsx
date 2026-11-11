import React, { useState, useEffect, useMemo, useRef } from "react";

export const CollapsibleCycleSelect = ({
	value,
	onChange,
	periods = [],
	label = "Survey Cycle",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [expandedWeeks, setExpandedWeeks] = useState({});
	const containerRef = useRef(null);

	// Filter open periods and group daily cycles under weekly parent cycles
	const { weeklyPeriods, dailyByWeekly } = useMemo(() => {
		const weekly = [];
		const dailyMap = {};

		const openList = (periods || []).filter((p) => p.status === "OPEN");

		openList.forEach((p) => {
			const isDaily =
				p.id.includes("-DAILY-") || p.name?.toLowerCase().includes("daily");

			if (isDaily) {
				const parentKey = p.id.split("-DAILY-")[0];
				if (!dailyMap[parentKey]) dailyMap[parentKey] = [];
				dailyMap[parentKey].push(p);
			} else {
				weekly.push(p);
			}
		});

		Object.keys(dailyMap).forEach((k) => {
			dailyMap[k].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
		});

		return { weeklyPeriods: weekly, dailyByWeekly: dailyMap };
	}, [periods]);

	// Auto-expand parent week if currently selected cycle is one of its daily streams
	useEffect(() => {
		if (value && value.includes("-DAILY-")) {
			const parentKey = value.split("-DAILY-")[0];
			setExpandedWeeks((prev) => ({ ...prev, [parentKey]: true }));
		}
	}, [value]);

	// Close on click outside
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
		() => (periods || []).find((p) => p.id === value),
		[periods, value],
	);

	const isDailySelected = Boolean(
		value?.includes("-DAILY-") ||
			selectedObj?.name?.toLowerCase().includes("daily"),
	);

	return (
		<div className="relative" ref={containerRef}>
			{label && (
				<label className="mb-1 block font-bold text-slate-700 text-xs">
					{label}
				</label>
			)}

			{/* Main Trigger Button */}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] cursor-pointer text-left shadow-2xs hover:bg-slate-50/80 transition"
			>
				<div className="flex items-center gap-2 truncate pr-2">
					
					<span className="truncate">
						{selectedObj?.name || "Select survey cycle..."}
					</span>
				</div>
				<span className="text-slate-400 text-[10px] ml-1 flex-none font-bold">
					{isOpen ? "▲" : "▼"}
				</span>
			</button>

			{/* Collapsible Dropdown Panel */}
			{isOpen && (
				<div className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 space-y-1 text-xs">
					{weeklyPeriods.length === 0 ? (
						<p className="p-2 text-center text-slate-400 text-xs">
							No open cycles available
						</p>
					) : (
						weeklyPeriods.map((wp) => {
							const dailyList = dailyByWeekly[wp.id] || [];
							const isExpanded = Boolean(expandedWeeks[wp.id]);
							const isWeeklySelected = value === wp.id;

							return (
								<div
									key={wp.id}
									className="rounded-lg border border-slate-100 bg-slate-50/60 overflow-hidden"
								>
									{/* Weekly Cycle Row */}
									<div className="flex items-center justify-between p-2 hover:bg-slate-100/80 transition">
										{/* Extending Arrow (Collapsed by Default) */}
										{dailyList.length > 0 && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setExpandedWeeks((prev) => ({
														...prev,
														[wp.id]: !prev[wp.id],
													}));
												}}
												className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-slate-200/70 text-slate-600 hover:bg-slate-300 text-[9px] font-bold cursor-pointer transition flex-none"
												title={
													isExpanded
														? "Collapse daily streams"
														: "Expand 7 daily streams"
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
											<div className="flex items-center gap-1.5">
												<span
													className={`text-xs font-bold block truncate ${
														isWeeklySelected
															? "text-[#A41821]"
															: "text-slate-800"
													}`}
												>
													{isWeeklySelected ? "✓ " : ""}
													{wp.name}
												</span>
											</div>
											{dailyList.length > 0 && (
												<span className="text-[10px] text-emerald-700 font-semibold block">
													({dailyList.length} daily streams available)
												</span>
											)}
										</div>
									</div>

									{/* 7 Daily Cycles (Hidden by default, shown when arrow is clicked) */}
									{isExpanded && dailyList.length > 0 && (
										<div className="border-t border-slate-200 bg-white py-1 pl-6 pr-2 space-y-0.5 animate-in fade-in">
											{dailyList.map((dp) => {
												const isDailyChildSelected = value === dp.id;

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
						})
					)}
				</div>
			)}
		</div>
	);
};