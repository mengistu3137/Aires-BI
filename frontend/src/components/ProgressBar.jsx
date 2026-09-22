import React from "react";

export const ProgressBar = ({
	current = 0,
	total = 0,
	label,
	color = "#017C4D",
}) => {
	const percentage =
		total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

	return (
		<div className="w-full">
			<div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
				<span>{label}</span>
				<span>
					{current} / {total} ({percentage}%)
				</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
				<div
					className="h-full transition-all duration-300 rounded-full"
					style={{
						width: `${percentage}%`,
						backgroundColor: color,
					}}
				/>
			</div>
		</div>
	);
};