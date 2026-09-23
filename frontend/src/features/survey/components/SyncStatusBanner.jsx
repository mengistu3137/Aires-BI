import React, { useState, useEffect } from "react";
import { useSurveyStore } from "@/stores/survey/survey.store.js";
import toast from "react-hot-toast";

export const SyncStatusBanner = () => {
	const { offlineQueue, isSyncing, syncOfflineQueue } = useSurveyStore();
	const [isOnline, setIsOnline] = useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const handleManualSync = async () => {
		if (!isOnline) {
			toast.error(
				"Device is offline. Connect to mobile network or Wi-Fi to sync.",
			);
			return;
		}

		try {
			const res = await syncOfflineQueue();
			toast.success(`Successfully uploaded ${res.syncedCount} observations!`);
		} catch {
			toast.error("Sync failed. Observations remain safely in local storage.");
		}
	};

	const pendingCount = offlineQueue.length;

	return (
		<>
			{/* 1. Offline Notification Bar (Appears when connection drops) */}
			{!isOnline && (
				<div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900 flex items-center justify-between shadow-2xs animate-in slide-in-from-top-1">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-[#FE7914] animate-pulse" />
						<span>
							<strong>Offline Mode Active:</strong> Observations are saved
							securely on this device and will sync when reconnected.
						</span>
					</div>
					<span className="font-bold text-[10px] uppercase tracking-wider text-amber-800">
						{pendingCount} Local
					</span>
				</div>
			)}

			{/* 2. Floating Sync Pill (Appears whenever there are unsynced items) */}
			{pendingCount > 0 && (
				<div className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2">
					<button
						type="button"
						onClick={handleManualSync}
						disabled={isSyncing}
						className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold shadow-lg transition active:scale-95 cursor-pointer ${
							isOnline
								? "bg-[#017C4D] hover:bg-[#015E3A] text-white"
								: "bg-slate-800 text-slate-200 cursor-not-allowed opacity-90"
						}`}
					>
						<svg
							className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						<span>
							{isSyncing
								? "Syncing..."
								: isOnline
									? `Sync ${pendingCount} Local Record${pendingCount > 1 ? "s" : ""}`
									: `${pendingCount} Saved Locally (Offline)`}
						</span>
					</button>
				</div>
			)}
		</>
	);
};