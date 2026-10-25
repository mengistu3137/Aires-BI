// frontend/src/components/ConfirmDialog.jsx
import React, { useEffect } from "react";

/**
 * Reusable confirmation dialog.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={!!target}
 *     title="Delete product?"
 *     message={`Delete "${target.name}"?`}
 *     details="This action cannot be undone."
 *     confirmLabel="Delete"
 *     cancelLabel="Cancel"
 *     variant="danger"        // "danger" | "primary"
 *     isConfirming={isDeleting}
 *     onCancel={() => setTarget(null)}
 *     onConfirm={() => handleDelete(target.id)}
 *   />
 */
export const ConfirmDialog = ({
	open,
	title = "Are you sure?",
	message,
	details,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	variant = "danger",
	isConfirming = false,
	onCancel,
	onConfirm,
}) => {
	// Escape key closes; block background scroll while open.
	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "Escape" && !isConfirming) onCancel?.();
		};
		document.addEventListener("keydown", onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [open, isConfirming, onCancel]);

	if (!open) return null;

	const confirmClasses =
		variant === "danger"
			? "bg-[#A41821] hover:bg-[#7F1219] text-white"
			: "bg-[#017C4D] hover:bg-[#01633D] text-white";

	const ringAccent =
		variant === "danger" ? "ring-[#A41821]/30" : "ring-[#017C4D]/30";

	return (
		<div
			role="dialog"
			aria-modal="true"
			className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isConfirming) onCancel?.();
			}}
		>
			<div
				className={`w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 ring-4 ${ringAccent}`}
			>
				<div className="flex items-start gap-3">
					<div
						className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full ${
							variant === "danger"
								? "bg-[#A41821]/10 text-[#A41821]"
								: "bg-[#017C4D]/10 text-[#017C4D]"
						}`}
					>
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
							/>
						</svg>
					</div>
					<div className="space-y-1">
						<h3 className="text-sm font-black text-slate-900">{title}</h3>
						{message && (
							<p className="text-xs text-slate-600 leading-relaxed">
								{message}
							</p>
						)}
					</div>
				</div>

				{details && (
					<p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800 leading-relaxed">
						{details}
					</p>
				)}

				<div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
					<button
						type="button"
						onClick={onCancel}
						disabled={isConfirming}
						className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={isConfirming}
						className={`rounded-xl px-4 py-2 font-bold shadow-xs cursor-pointer disabled:opacity-50 ${confirmClasses}`}
					>
						{isConfirming ? "Working..." : confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmDialog;