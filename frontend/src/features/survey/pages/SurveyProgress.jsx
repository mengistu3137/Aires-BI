import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { useAssignments, useDeleteAssignment } from "../hooks/useAssignments.js";
import { StatusBadge } from "@/components/StatusBadge.jsx";
import { Can } from "@/components/Can.jsx";
import { SurveyAssignmentModal } from "../components/SurveyAssignmentModal.jsx";
import { PeriodManagementModal } from "../components/PeriodManagementModal.jsx";
import { ConfirmDeleteAssignmentModal } from "../components/ConfirmDeleteAssignmentModal.jsx";
import toast from "react-hot-toast";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

/**
 * Local date formatter — no external dependency.
 */
const formatAssignedDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const SurveyProgress = () => {
  const navigate = useNavigate();
  const { isAuditor } = useAuth();
  const { data: assignments = [], isLoading, isError, error, refetch } = useAssignments();
  const deleteAssignment = useDeleteAssignment();

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const visibleAssignments = useMemo(() => {
    let list = assignments;

    if (statusFilter) {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((a) => {
        const storeName = (a.store?.name || "").toLowerCase();
        const area = (a.store?.area || a.store?.address || "").toLowerCase();
        const auditorName = (a.auditor?.name || "").toLowerCase();
        const cycleId = (a.surveyPeriod?.id || "").toLowerCase();
        return (
          storeName.includes(term) ||
          area.includes(term) ||
          auditorName.includes(term) ||
          cycleId.includes(term)
        );
      });
    }

    return list;
  }, [assignments, statusFilter, searchTerm]);

  const counts = useMemo(
    () => ({
      all: assignments.length,
      notStarted: assignments.filter((a) => a.status === "NOT_STARTED").length,
      inProgress: assignments.filter((a) => a.status === "IN_PROGRESS").length,
      completed: assignments.filter((a) => a.status === "COMPLETED").length,
    }),
    [assignments]
  );

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteAssignment.mutateAsync(deleteCandidate.id);
      setDeleteCandidate(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete assignment");
    }
  };

  const handleOpenNew = () => {
    setEditingAssignment(null);
    setIsAssignmentModalOpen(true);
  };

  const handleOpenEdit = (assignment) => {
    setEditingAssignment(assignment);
    setIsAssignmentModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAssignmentModalOpen(false);
    setEditingAssignment(null);
  };

  const handleViewAudits = (assignment) => {
    navigate(`/audits?assignmentId=${assignment.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Field survey assignments
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {isAuditor
              ? "Your assigned store audits and target product checklists"
              : "Dispatch, edit, and monitor field auditor assignments"}
          </p>
        </div>

        <Can role={["ADMIN", "MANAGER"]}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPeriodModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
            >
              Manage cycles
            </button>
            <button
              type="button"
              onClick={handleOpenNew}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#7F1219] active:scale-95"
            >
              + Dispatch assignment
            </button>
          </div>
        </Can>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total" value={counts.all} tone="slate" />
        <Kpi label="Not started" value={counts.notStarted} tone="amber" />
        <Kpi label="In progress" value={counts.inProgress} tone="blue" />
        <Kpi label="Completed" value={counts.completed} tone="emerald" />
      </div>

      {/* Search + status filters */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by store, auditor, or cycle..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
          />
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === f.value
                  ? "bg-[#A41821] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-[#A41821]">
            {error?.message || "Unable to load assignments"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 cursor-pointer rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#A41821] hover:bg-red-50"
          >
            Try again
          </button>
        </div>
      )}

      {/* Cards grid */}
      {!isLoading && !isError && (
        <>
          {visibleAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">
                {statusFilter || searchTerm
                  ? "No assignments match your filters"
                  : "No assignments yet"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                {statusFilter || searchTerm
                  ? "Try adjusting your search or filters."
                  : "Dispatch a new assignment to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  isAuditor={isAuditor}
                  onViewAudits={() => handleViewAudits(assignment)}
                  onEdit={() => handleOpenEdit(assignment)}
                  onDelete={() => setDeleteCandidate(assignment)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dispatch / edit modal */}
      <SurveyAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={handleCloseModal}
        assignment={editingAssignment}
      />

      {/* Period management modal */}
      <PeriodManagementModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
      />

      {/* Confirm delete */}
      <ConfirmDeleteAssignmentModal
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleConfirmDelete}
        isPending={deleteAssignment.isPending}
        assignment={deleteCandidate}
      />
    </div>
  );
};

const AssignmentCard = ({ assignment, isAuditor, onViewAudits, onEdit, onDelete }) => {
  const store = assignment.store || {};
  const auditor = assignment.auditor || {};
  const cycle = assignment.surveyPeriod || {};
  console.log("Cycle:", cycle);

  const canEdit = assignment.status === "NOT_STARTED";
  const canDelete = assignment.status === "NOT_STARTED" && (assignment.auditsCount ?? 0) <= 1;

  const productCount = assignment.totalItemsCount ?? assignment.items?.length ?? 0;

  const statusAccent =
    {
      NOT_STARTED: "bg-slate-300",
      IN_PROGRESS: "bg-[#FE7914]",
      COMPLETED: "bg-[#017C4D]",
      CANCELLED: "bg-slate-400",
    }[assignment.status] || "bg-slate-300";

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-sm">
      <div className={`h-1 w-full ${statusAccent}`} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-slate-900">
              {store.name || "Unknown store"}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {store.area || store.address || store.city || "No location"}
            </p>
          </div>
          <StatusBadge status={assignment.status} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50/70 px-2.5 py-2">
          <DetailCell label="Auditor" value={auditor.name || "—"} sub={auditor.phone || ""} />
          <DetailCell label="Cycle" value={cycle.name || "—"} sub={cycle.status || ""} mono />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
              {productCount}
            </span>
            products
          </span>
          {assignment.assignedAt && (
            <span className="text-slate-400">
              Assigned {formatAssignedDate(assignment.assignedAt)}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onViewAudits}
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline"
          >
            View audits →
          </button>

          {!isAuditor && (
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button
                type="button"
                disabled={!canEdit}
                onClick={onEdit}
                className="cursor-pointer text-[#A41821] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                title={canEdit ? "Edit assignment" : "Only NOT_STARTED assignments can be edited"}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={!canDelete}
                onClick={onDelete}
                className="cursor-pointer text-red-600 hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  canDelete ? "Delete assignment" : "Cannot delete — a visit has already started"
                }
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailCell = ({ label, value, sub, mono = false }) => (
  <div className="min-w-0">
    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p
      className={`mt-0.5 truncate text-[11px] font-bold text-slate-700 ${mono ? "font-mono" : ""}`}
    >
      {value}
    </p>
    {sub && <p className="mt-0.5 truncate text-[10px] text-slate-400">{sub}</p>}
  </div>
);

const Kpi = ({ label, value, tone }) => {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    amber: "border-amber-200 bg-amber-50/50 text-[#FE7914]",
    blue: "border-blue-200 bg-blue-50/50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50/50 text-[#017C4D]",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
};
