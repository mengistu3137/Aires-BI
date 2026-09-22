import React, { useState, useMemo } from "react";

export const DataTable = ({
	columns = [],
	data = [],
	searchKey = null,
	searchPlaceholder = "Search records...",
	pageSize = 10,
	emptyMessage = "No matching records found",
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
	const [currentPage, setCurrentPage] = useState(1);

	// 1. Filter data based on search term
	const filteredData = useMemo(() => {
		if (!searchTerm.trim()) return data;
		const term = searchTerm.toLowerCase();

		return data.filter((row) => {
			if (searchKey) {
				return String(row[searchKey] || "")
					.toLowerCase()
					.includes(term);
			}
			return Object.values(row).some((val) =>
				String(val).toLowerCase().includes(term),
			);
		});
	}, [data, searchTerm, searchKey]);

	// 2. Sort filtered data
	const sortedData = useMemo(() => {
		if (!sortConfig.key) return filteredData;

		return [...filteredData].sort((a, b) => {
			const aVal = a[sortConfig.key];
			const bVal = b[sortConfig.key];

			if (aVal === bVal) return 0;
			if (aVal === null || aVal === undefined) return 1;
			if (bVal === null || bVal === undefined) return -1;

			const comparison = aVal > bVal ? 1 : -1;
			return sortConfig.direction === "asc" ? comparison : -comparison;
		});
	}, [filteredData, sortConfig]);

	// 3. Paginate
	const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
	const paginatedData = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return sortedData.slice(start, start + pageSize);
	}, [sortedData, currentPage, pageSize]);

	const handleSort = (key) => {
		setSortConfig((prev) => {
			if (prev.key === key) {
				return {
					key,
					direction: prev.direction === "asc" ? "desc" : "asc",
				};
			}
			return { key, direction: "asc" };
		});
	};

	return (
		<div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
			{/* Search Header */}
			<div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div className="relative w-full sm:w-72">
					<input
						type="text"
						placeholder={searchPlaceholder}
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setCurrentPage(1);
						}}
						className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
					/>
					<svg
						className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
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

				<span className="text-xs text-slate-400 font-medium">
					Showing {paginatedData.length} of {sortedData.length} entries
				</span>
			</div>

			{/* Table Element */}
			<div className="overflow-x-auto">
				<table className="w-full text-left text-xs">
					<thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold text-[10px]">
						<tr>
							{columns.map((col) => (
								<th
									key={col.key || col.header}
									onClick={() => col.sortable && handleSort(col.key)}
									className={`px-4 py-3 ${
										col.sortable
											? "cursor-pointer select-none hover:text-slate-800"
											: ""
									} ${col.align === "right" ? "text-right" : ""}`}
								>
									<div
										className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}
									>
										<span>{col.header}</span>
										{col.sortable && sortConfig.key === col.key && (
											<span className="text-[#A41821]">
												{sortConfig.direction === "asc" ? "▲" : "▼"}
											</span>
										)}
									</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100 text-slate-700">
						{paginatedData.length > 0 ? (
							paginatedData.map((row, idx) => (
								<tr
									key={row.id || idx}
									className="hover:bg-slate-50/75 transition"
								>
									{columns.map((col) => (
										<td
											key={col.key || col.header}
											className={`px-4 py-3 ${col.align === "right" ? "text-right" : ""}`}
										>
											{col.render ? col.render(row) : row[col.key]}
										</td>
									))}
								</tr>
							))
						) : (
							<tr>
								<td
									colSpan={columns.length}
									className="px-4 py-8 text-center text-slate-400"
								>
									{emptyMessage}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination Controls */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between border-t border-slate-100 p-4">
					<button
						type="button"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
					>
						Previous
					</button>
					<span className="text-xs font-semibold text-slate-500">
						Page {currentPage} of {totalPages}
					</span>
					<button
						type="button"
						disabled={currentPage === totalPages}
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
};