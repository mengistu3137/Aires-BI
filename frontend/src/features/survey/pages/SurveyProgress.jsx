import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useSurveySessionStore } from "@/stores/survey/surveySession.store.js";
import { StatusBadge } from "@/components/StatusBadge.jsx";
import { ProgressBar } from "@/components/ProgressBar.jsx";
import { DataTable } from "@/components/DataTable.jsx";
import { SurveyAssignmentModal } from "../components/SurveyAssignmentModal.jsx";
import { PeriodManagementModal } from "../components/PeriodManagementModal.jsx";
import { Can } from "@/components/Can.jsx";

export const SurveyProgress = () => {
  const navigate = useNavigate();
  const { isAuditor, isManager, isAdmin } = useAuth();
  const { assignments, isLoading, updateStatus, isUpdating, refetch } = useAssignments();
  const { setActiveAssignment } = useSurveySessionStore();

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Filter assignments locally by status tab
  const filteredAssignments = useMemo(() => {
    if (filterStatus === "ALL") return assignments;
    return assignments.filter((a) => a.status === filterStatus);
  }, [assignments, filterStatus]);

  // Counts for tabs
  const statusCounts = useMemo(() => {
    return {
      total: assignments.length,
      notStarted: assignments.filter((a) => a.status === "NOT_STARTED").length,
      inProgress: assignments.filter((a) => a.status === "IN_PROGRESS").length,
      completed: assignments.filter((a) => a.status === "COMPLETED").length,
    };
  }, [assignments]);

  const handleStartOrContinueAudit = (assignment) => {
    setActiveAssignment(assignment);
    navigate(`/survey/audit/${assignment.id}`);
  };

  const handleStatusChange = async (assignmentId, currentStatus) => {
    let nextStatus = "IN_PROGRESS";
    if (currentStatus === "NOT_STARTED") nextStatus = "IN_PROGRESS";
    else if (currentStatus === "IN_PROGRESS") nextStatus = "COMPLETED";
    else if (currentStatus === "COMPLETED") nextStatus = "IN_PROGRESS";

    await updateStatus({ id: assignmentId, status: nextStatus });
  };

  const tableColumns = [
    {
      header: "Store Location",
      key: "storeName",
      sortable: true,
      render: (row) => (
        <div>
          <button
            type="button"
            onClick={() => handleStartOrContinueAudit(row)}
            className="font-bold text-slate-900 hover:text-[#A41821] text-left cursor-pointer"
          >
            {row.store?.name}
          </button>
          <span className="block text-[11px] text-slate-500">
            {row.store?.area || row.store?.address || "Addis Ababa"} • {row.store?.type}
          </span>
        </div>
      ),
    },
    {
      header: "Assigned Auditor",
      key: "auditorName",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-slate-800">{row.auditor?.name}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-slate-400 font-mono">
              {row.auditor?.phone}
            </span>
            {/* Live Auditor Location Permission Badge */}
            {row.auditor?.locationPermission && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                  row.auditor.locationPermission === "ALLOWED"
                    ? "bg-emerald-50 text-[#017C4D] border-emerald-200"
                    : row.auditor.locationPermission === "DENIED"
                    ? "bg-red-50 text-[#A41821] border-red-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                GPS: {row.auditor.locationPermission === "ALLOWED" ? "Allowed" : row.auditor.locationPermission === "DENIED" ? "Blocked" : "Prompt"}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Store GPS Anchor",
      key: "gps",
      render: (row) =>
        row.store?.latitude ? (
          <div className="font-mono text-[11px] text-slate-600">
            {Number(row.store.latitude).toFixed(5)}, {Number(row.store.longitude).toFixed(5)}
          </div>
        ) : (
          <span className="text-slate-400 italic">No GPS set</span>
        ),
    },
    {
      header: "Real Audit Progress",
      key: "observedCount",
      align: "center",
      sortable: true,
      render: (row) => {
        const total = row.totalItemsCount || row.items?.length || 0;
        const observed = row.observedCount || 0;
        const percent = total > 0 ? Math.round((observed / total) * 100) : 0;

        return (
          <div className="font-mono text-center">
            <span className={`font-black text-xs ${observed > 0 ? "text-[#017C4D]" : "text-slate-700"}`}>
              {observed} / {total}
            </span>
            <span className="block text-[10px] text-slate-400 font-sans">
              ({percent}%)
            </span>
          </div>
        );
      },
    },
    {
      header: "Status",
      key: "status",
      align: "center",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Action",
      key: "actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {/* Direct CTA into rapid collection */}
          <button
            type="button"
            onClick={() => handleStartOrContinueAudit(row)}
            className="rounded-lg bg-slate-100 hover:bg-[#A41821] hover:text-white px-2.5 py-1 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            {row.status === "COMPLETED" ? "Review" : "Audit →"}
          </button>

          {/* Manager status override */}
          {(isManager || isAdmin) && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusChange(row.id, row.status)}
              className="text-slate-400 hover:text-slate-700 text-xs underline cursor-pointer disabled:opacity-50"
              title="Toggle Status"
            >
              {row.status === "NOT_STARTED" ? "Start" : row.status === "IN_PROGRESS" ? "Finish" : "Reopen"}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Top Banner */}
  

<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-xl font-black text-slate-900 tracking-tight">
      Field Survey Assignments
    </h1>
    <p className="text-xs text-slate-500 mt-0.5">
      Store dispatch management, surveyor GPS tracking, and cycle completion
    </p>
  </div>

  {/* Admin & Manager Action Buttons */}
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => refetch()}
      className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2 text-slate-600 transition cursor-pointer"
      title="Refresh assignments from server"
    >
      <svg className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>

    <button
      type="button"
      onClick={() => setIsPeriodModalOpen(true)}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
    >
      <span>🗓️</span>
      Manage Cycles
    </button>

    <button
      type="button"
      onClick={() => setIsAssignmentModalOpen(true)}
      className="inline-flex items-center gap-1.5 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
    >
      <span className="text-sm font-bold">+</span>
      Dispatch Assignment
    </button>
  </div>
</div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "ALL", label: `All (${statusCounts.total})` },
          { id: "IN_PROGRESS", label: `In Progress (${statusCounts.inProgress})` },
          { id: "NOT_STARTED", label: `Not Started (${statusCounts.notStarted})` },
          { id: "COMPLETED", label: `Completed (${statusCounts.completed})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterStatus(tab.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filterStatus === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assignment Overview Cards with 100% Real Progress Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAssignments.map((asn) => {
          const totalItems = asn.totalItemsCount || asn.items?.length || 0;
          // Real observed count from PostgreSQL database:
          const realObserved = asn.observedCount || 0;
          const isDone = asn.status === "COMPLETED";

          return (
            <div
              key={asn.id}
              className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between space-y-4 transition ${
                asn.status === "IN_PROGRESS"
                  ? "border-[#A41821]/40 bg-white ring-2 ring-[#A41821]/10"
                  : isDone
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {asn.store?.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                    {asn.store?.area || asn.store?.address || "Addis Ababa"} • {asn.store?.type}
                  </p>
                </div>
                <StatusBadge status={asn.status} />
              </div>

              {/* Progress Bar bound to real database observations */}
              <ProgressBar
                current={realObserved}
                total={totalItems}
                label="Verified Price Observations"
                color={isDone ? "#017C4D" : realObserved > 0 ? "#017C4D" : "#FE7914"}
              />

              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <div className="min-w-0 pr-2">
                  <span className="text-[11px] text-slate-500 block truncate">
                    Auditor: <strong>{asn.auditor?.name}</strong>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Cycle: {asn.surveyPeriod?.id || "2026-W39"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartOrContinueAudit(asn)}
                  className={`flex-none inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs ${
                    asn.status === "IN_PROGRESS"
                      ? "bg-[#A41821] hover:bg-[#7F1219] text-white"
                      : isDone
                      ? "border border-emerald-300 bg-white text-[#017C4D] hover:bg-emerald-50"
                      : "bg-[#017C4D] hover:bg-[#015E3A] text-white"
                  }`}
                >
                  {asn.status === "IN_PROGRESS"
                    ? "Continue Audit →"
                    : isDone
                    ? "Review Items"
                    : "Start Audit →"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Assignment Table */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">
          All Store Assignments ({filteredAssignments.length})
        </h2>
        <DataTable
          columns={tableColumns}
          data={filteredAssignments}
          searchPlaceholder="Search store, auditor, or area..."
          pageSize={8}
          emptyMessage={
            isLoading
              ? "Loading assignments from server..."
              : "No field assignments match the selected filter."
          }
        />
      </div>

      {/* Dispatch Modal */}
      <SurveyAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
      />

      {/* Period Management Modal */}
      <PeriodManagementModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
      />
    </div>
  );
};