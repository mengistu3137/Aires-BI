import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SurveyPeriodSelector } from "@/features/survey/components/SurveyPeriodSelector.jsx";
import {
	downloadIntelligenceReportRequest,
	draftIntelligenceNotesRequest,
	readReportError,
} from "@/services/api/report.api.js";

const EMPTY_EVIDENCE = { location: "", gps: "", audio: "", proof: "" };

const saveBlob = ({ blob, filename }) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
};

const asPdfBlob = (blob) =>
	blob?.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });

export const IntelligenceReportModal = ({ onClose }) => {
	const [surveyPeriodId, setSurveyPeriodId] = useState("");
	const [advisory, setAdvisory] = useState("");
	const [observations, setObservations] = useState("");
	const [purchases, setPurchases] = useState("");
	const [evidence, setEvidence] = useState([{ ...EMPTY_EVIDENCE }]);
	const [busy, setBusy] = useState("");
	const [previewFile, setPreviewFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [draft, setDraft] = useState(null);
	const [drafting, setDrafting] = useState(false);
	const previewFrameRef = useRef(null);

	useEffect(() => {
		if (!surveyPeriodId) {
			setDraft(null);
			return undefined;
		}
		let cancelled = false;
		setDrafting(true);
		draftIntelligenceNotesRequest(surveyPeriodId)
			.then((next) => {
				if (cancelled || !next) return;
				setDraft(next);
				setAdvisory(next.advisory || "");
				setObservations(next.observations || "");
				setPurchases(next.purchases || "");
			})
			.catch(async (error) => {
				if (!cancelled) toast.error(await readReportError(error));
			})
			.finally(() => {
				if (!cancelled) setDrafting(false);
			});
		return () => {
			cancelled = true;
		};
	}, [surveyPeriodId]);

	useEffect(() => {
		if (!previewFile?.blob) return undefined;
		const url = URL.createObjectURL(previewFile.blob);
		setPreviewUrl(url);
		return () => {
			URL.revokeObjectURL(url);
			setPreviewUrl("");
		};
	}, [previewFile]);

	const updateEvidence = (index, field, value) => {
		setEvidence((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
	};

	const notes = () => ({ advisory, observations, purchases, evidence });

	const generate = async (format) => {
		if (!surveyPeriodId) {
			toast.error("Choose a survey period first.");
			return;
		}
		if (format === "pdf" && previewFile?.blob) {
			saveBlob({ blob: previewFile.blob, filename: previewFile.filename });
			toast.success("PDF report downloaded.");
			return;
		}
		setBusy(format);
		try {
			const file = await downloadIntelligenceReportRequest({
				surveyPeriodId,
				format,
				notes: notes(),
			});
			saveBlob(file);
			toast.success(format === "docx" ? "Word report downloaded." : "PDF report downloaded.");
		} catch (error) {
			toast.error(await readReportError(error));
		} finally {
			setBusy("");
		}
	};

	const openPreview = async () => {
		if (!surveyPeriodId) {
			toast.error("Choose a survey period first.");
			return;
		}
		setBusy("preview");
		try {
			const file = await downloadIntelligenceReportRequest({
				surveyPeriodId,
				format: "pdf",
				notes: notes(),
			});
			setPreviewFile({ blob: asPdfBlob(file.blob), filename: file.filename });
		} catch (error) {
			toast.error(await readReportError(error));
		} finally {
			setBusy("");
		}
	};

	const printPreview = () => {
		const frame = previewFrameRef.current;
		if (!frame?.contentWindow) return;
		frame.contentWindow.focus();
		frame.contentWindow.print();
	};

	if (previewFile) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-xs sm:p-4">
				<div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
						<div>
							<h2 className="text-sm font-black text-slate-900">Print preview</h2>
							<p className="mt-0.5 text-[11px] text-slate-500">
								This is the PDF that will download. Word uses the same pages, and you can still edit it after download.
							</p>
						</div>
						<div className="flex flex-wrap justify-end gap-2">
							<button
								type="button"
								onClick={() => setPreviewFile(null)}
								className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
							>
								Back to notes
							</button>
							<button
								type="button"
								onClick={printPreview}
								className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
							>
								Print
							</button>
							<button
								type="button"
								disabled={Boolean(busy)}
								onClick={() => generate("docx")}
								className="cursor-pointer rounded-xl border border-[#017C4D] px-3 py-2 text-xs font-bold text-[#017C4D] disabled:opacity-50"
							>
								{busy === "docx" ? "Preparing Word…" : "Download Word"}
							</button>
							<button
								type="button"
								onClick={() => generate("pdf")}
								className="cursor-pointer rounded-xl bg-[#A41821] px-3 py-2 text-xs font-bold text-white"
							>
								Download PDF
							</button>
						</div>
					</div>
					<iframe
						ref={previewFrameRef}
						title="Competitor price intelligence report preview"
						src={previewUrl || undefined}
						className="min-h-0 w-full flex-1 bg-slate-100"
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
			<div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
				<div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
					<div>
						<h2 className="text-base font-black text-slate-900">
							Competitor price intelligence report
						</h2>
						<p className="mt-1 text-[11px] text-slate-500">
							The price table comes from the survey period. The three notes start as the AI reading of that data. Change them with anything you saw on the visit, then open Print preview.
						</p>
					</div>
					<button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-700">
						✕
					</button>
				</div>

				<div className="mt-4 space-y-4 text-xs">
					<div>
						<label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
							Survey period
						</label>
						<SurveyPeriodSelector value={surveyPeriodId} onChange={setSurveyPeriodId} />
					</div>

					<div className="flex items-center justify-between gap-2">
						<p className="text-[11px] text-slate-500">
							{drafting
								? "Reading the survey and drafting the notes…"
								: "These notes are the AI draft. Add what you observed in the field before you download."}
						</p>
						{draft && (
							<button
								type="button"
								onClick={() => {
									setAdvisory(draft.advisory || "");
									setObservations(draft.observations || "");
									setPurchases(draft.purchases || "");
								}}
								className="cursor-pointer shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 font-bold text-slate-600"
							>
								Restore AI draft
							</button>
						)}
					</div>

					<label className="block">
						<span className="mb-1.5 block font-bold text-slate-700">Strategic advisory</span>
						<textarea
							rows={3}
							value={advisory}
							onChange={(e) => setAdvisory(e.target.value)}
							placeholder="The AI draft appears after you choose a survey period."
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
						/>
					</label>

					<label className="block">
						<span className="mb-1.5 block font-bold text-slate-700">Key market observations</span>
						<span className="mb-1.5 block text-[11px] text-slate-500">Each line is a bullet. The words before the colon, and anything wrapped in **double asterisks**, print in bold.</span>
						<textarea
							rows={4}
							value={observations}
							onChange={(e) => setObservations(e.target.value)}
							placeholder="VAT differences, stock-outs, brand substitutions, and where Queens is competitive."
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
						/>
					</label>

					<label className="block">
						<span className="mb-1.5 block font-bold text-slate-700">Mystery shopping and receipts</span>
						<textarea
							rows={4}
							value={purchases}
							onChange={(e) => setPurchases(e.target.value)}
							placeholder="What was bought at each market, weights, receipt numbers, and totals."
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
						/>
					</label>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<p className="font-bold text-slate-700">Field evidence log</p>
							<button
								type="button"
								onClick={() => setEvidence((rows) => [...rows, { ...EMPTY_EVIDENCE }])}
								className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 font-bold text-slate-600"
							>
								Add location
							</button>
						</div>
						{evidence.map((row, index) => (
							<div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
								<input
									value={row.location}
									onChange={(e) => updateEvidence(index, "location", e.target.value)}
									placeholder="Audit location"
									className="rounded-lg border border-slate-200 px-2.5 py-2"
								/>
								<input
									value={row.gps}
									onChange={(e) => updateEvidence(index, "gps", e.target.value)}
									placeholder="GPS and time"
									className="rounded-lg border border-slate-200 px-2.5 py-2"
								/>
								<input
									value={row.audio}
									onChange={(e) => updateEvidence(index, "audio", e.target.value)}
									placeholder="Hidden audio log"
									className="rounded-lg border border-slate-200 px-2.5 py-2"
								/>
								<input
									value={row.proof}
									onChange={(e) => updateEvidence(index, "proof", e.target.value)}
									placeholder="Photos or receipt proof"
									className="rounded-lg border border-slate-200 px-2.5 py-2"
								/>
							</div>
						))}
					</div>
				</div>

				<div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
					<button
						type="button"
						onClick={onClose}
						className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={Boolean(busy)}
						onClick={openPreview}
						className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
					>
						{busy === "preview" ? "Preparing preview…" : "Print preview"}
					</button>
					<button
						type="button"
						disabled={Boolean(busy)}
						onClick={() => generate("docx")}
						className="cursor-pointer rounded-xl border border-[#017C4D] px-4 py-2 text-xs font-bold text-[#017C4D] disabled:opacity-50"
					>
						{busy === "docx" ? "Preparing Word…" : "Download Word"}
					</button>
					<button
						type="button"
						disabled={Boolean(busy)}
						onClick={() => generate("pdf")}
						className="cursor-pointer rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
					>
						{busy === "pdf" ? "Preparing PDF…" : "Download PDF"}
					</button>
				</div>
			</div>
		</div>
	);
};
