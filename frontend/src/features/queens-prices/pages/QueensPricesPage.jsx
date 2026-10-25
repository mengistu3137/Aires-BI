import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueensPrices } from "../hooks/useQueensPrices.js";
import { QueensPriceFilters } from "../components/QueensPriceFilters.jsx";
import { QueensPriceListTable } from "../components/QueensPriceListTable.jsx";
import { QueensPriceEmptyState } from "../components/QueensPriceEmptyState.jsx";

export const QueensPricesPage = () => {
	const navigate = useNavigate();
	const [page, setPage] = useState(1);
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [activeFrequency, setActiveFrequency] = useState("ALL");
	const [currentOnly, setCurrentOnly] = useState(false);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearch(searchInput.trim());
			setPage(1);
		}, 300);
		return () => clearTimeout(handler);
	}, [searchInput]);

	const filters = useMemo(
		() => ({
			page,
			limit: 20,
			search: debouncedSearch || undefined,
			frequency: activeFrequency !== "ALL" ? activeFrequency : undefined,
			current: currentOnly ? "true" : undefined,
		}),
		[page, debouncedSearch, activeFrequency, currentOnly],
	);

	const { data, isLoading, isError, error } = useQueensPrices(filters);

	const prices = data?.prices || [];
	const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-black text-slate-900 tracking-tight">
							Queens Benchmark Prices
						</h1>
						<span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
							{meta.total} Total Catalog Products
						</span>
					</div>
					<p className="mt-0.5 text-xs text-slate-500">
						Authoritative reference prices across Daily, Weekly, Monthly, and
						Bi-Yearly catalog tracks.
					</p>
				</div>
				<button
					type="button"
					onClick={() => navigate("/queens-prices/new")}
					className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
				>
					<svg
						className="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add Queens Price
				</button>
			</div>

			{/* Filters with 4 Track Tabs */}
			<QueensPriceFilters
				search={searchInput}
				onSearchChange={setSearchInput}
				frequency={activeFrequency}
				onFrequencyChange={(freq) => {
					setActiveFrequency(freq);
					setPage(1);
				}}
				currentFilter={currentOnly}
				onCurrentFilterChange={(val) => {
					setCurrentOnly(val);
					setPage(1);
				}}
			/>

			{/* Loading State */}
			{isLoading && (
				<div className="flex items-center justify-center py-16">
					<div className="flex flex-col items-center gap-2">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
						<p className="text-xs font-semibold text-slate-500">
							Searching benchmark prices...
						</p>
					</div>
				</div>
			)}

			{/* Error State */}
			{isError && (
				<div className="rounded-2xl border border-red-200 bg-red-50 p-4">
					<p className="text-xs font-medium text-[#A41821]">
						{error?.message || "Unable to load Queens benchmark prices"}
					</p>
				</div>
			)}

			{/* Content */}
			{!isLoading && !isError && (
				<>
					{prices.length === 0 ? (
						<QueensPriceEmptyState
							title={
								debouncedSearch
									? `No products match "${debouncedSearch}"`
									: "No catalog products found"
							}
							description={
								debouncedSearch
									? "Try searching with a different product name, brand, or SKU."
									: currentOnly
										? "No products with active benchmark prices match this track."
										: "Every product in the catalog requires a benchmark price for competitive price index calculations."
							}
							action={
								debouncedSearch ? (
									<button
										type="button"
										onClick={() => {
											setSearchInput("");
											setDebouncedSearch("");
										}}
										className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
									>
										Clear Search
									</button>
								) : (
									<button
										type="button"
										onClick={() => navigate("/queens-prices/new")}
										className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219] cursor-pointer"
									>
										Add Queens Price
									</button>
								)
							}
						/>
					) : (
						<QueensPriceListTable prices={prices} />
					)}

					{/* Catalog-Wide Pagination */}
					{meta.totalPages > 1 && (
						<div className="flex items-center justify-between pt-2">
							<button
								type="button"
								disabled={page === 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
							>
								Previous
							</button>
							<span className="text-xs font-semibold text-slate-500">
								Page {meta.page} of {meta.totalPages} ({meta.total} total items)
							</span>
							<button
								type="button"
								disabled={page >= meta.totalPages}
								onClick={() => setPage((p) => p + 1)}
								className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
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