import React, { useState, useMemo } from "react";

export const DataTable = ({
	columns = [],
	data = [],
	searchKey = "name",
	searchPlaceholder = "Search records...",
	pageSize = 10,
	emptyMessage = "No records found.",
	onRowClick = null,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

	// 1. Client-Side Search
	const filteredData = useMemo(() => {
		if (!searchTerm.trim()) return data;
		const term = searchTerm.toLowerCase();

		return data.filter((row) => {
			if (searchKey && row[searchKey]) {
				return String(row[searchKey]).toLowerCase().includes(term);
			}
			return Object.values(row).some((val) =>
				String(val).toLowerCase().includes(term),
			);
		});
	}, [data, searchTerm, searchKey]);

	// Reset to page 1 on search
	const handleSearchChange = (val) => {
		setSearchTerm(val);
		setCurrentPage(1);
	};

	// 2. Pagination Math
	const totalItems = filteredData.length;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;
	const startIndex = (currentPage - 1) * pageSize;
	const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

	return (
		<div className="space-y-3.5">
			{/* Search Header */}
			{searchPlaceholder && (
				<div className="relative max-w-sm">
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => handleSearchChange(e.target.value)}
						placeholder={searchPlaceholder}
						className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden shadow-2xs transition"
					/>
					<svg
						className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
			)}

			{/* Empty State */}
			{paginatedData.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-medium text-slate-400">
					{emptyMessage}
				</div>
			) : (
				<>
					{/* A. Desktop Multi-Column Table View (Hidden on Mobile) */}
					<div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
									<tr>
										{columns.map((col, idx) => (
											<th
												key={col.key || idx}
												className={`px-4 py-3 ${col.align === "right" ? "text-right" : "text-left"}`}
											>
												{col.header}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 text-slate-700">
									{paginatedData.map((row, rIdx) => (
										<tr
											key={row.id || rIdx}
											onClick={() => onRowClick?.(row)}
											className={`transition ${onRowClick ? "cursor-pointer hover:bg-slate-50/75" : "hover:bg-slate-50/40"}`}
										>
											{columns.map((col, cIdx) => (
												<td
													key={col.key || cIdx}
													className={`px-4 py-3 ${col.align === "right" ? "text-right" : "text-left"}`}
												>
													{col.render ? col.render(row) : row[col.key]}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* B. Mobile Stacked Data Card View (Visible ONLY on Mobile < md) */}
					<div className="space-y-3 md:hidden">
						{paginatedData.map((row, rIdx) => (
							<div
								key={row.id || rIdx}
								onClick={() => onRowClick?.(row)}
								className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5 transition ${
									onRowClick ? "cursor-pointer active:scale-[0.99]" : ""
								}`}
							>
								{columns.map((col, cIdx) => (
									<div
										key={col.key || cIdx}
										className="flex items-start justify-between gap-3 text-xs"
									>
										<span className="font-bold uppercase tracking-wider text-slate-400 text-[9px] flex-none">
											{col.header}
										</span>
										<div className="text-right text-slate-800 font-medium">
											{col.render ? col.render(row) : row[col.key]}
										</div>
									</div>
								))}
							</div>
						))}
					</div>

					{/* Clean Pagination Footer */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-2">
							<button
								type="button"
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40"
							>
								Previous
							</button>
							<span className="text-xs font-semibold text-slate-500">
								Page {currentPage} of {totalPages} ({totalItems} total)
							</span>
							<button
								type="button"
								disabled={currentPage >= totalPages}
								onClick={() =>
									setCurrentPage((p) => Math.min(totalPages, p + 1))
								}
								className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40"
							>
								Next
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
};