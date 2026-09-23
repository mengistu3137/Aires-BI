import React from "react";
import { useNavigate } from "react-router-dom";
import { DashboardKpi } from "./DashboardKpi.jsx";
import { formatCompletionRate } from "../utils/dashboard.utils.js";

/**
 * Top-level KPI grid driven by backend aggregates.
 * Backend provides `completionRate` — do NOT recompute.
 * No KPI is shown if the corresponding aggregate is missing.
 */
export const DashboardKpiGrid = ({ dashboard, isAuditor }) => {
  const navigate = useNavigate();

  if (!dashboard) return null;

  const { summary, assignments, audits, observations, alerts } = dashboard;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {/* Assignments */}
      <DashboardKpi
        label="Assignments"
        value={assignments?.total ?? 0}
        support={
          assignments ? `${formatCompletionRate(assignments.completionRate)} completed` : undefined
        }
        onClick={() => navigate("/progress")}
      />

      {/* Audits */}
      <DashboardKpi
        label="Audits"
        value={audits?.total ?? 0}
        support={audits ? `${formatCompletionRate(audits.completionRate)} completed` : undefined}
        tone="info"
        onClick={() => navigate("/audits")}
      />

      {/* Observations */}
      <DashboardKpi
        label="Observations"
        value={observations?.total ?? 0}
        support={
          observations ? `${observations.byReviewStatus?.PENDING ?? 0} pending review` : undefined
        }
        tone={(observations?.byReviewStatus?.PENDING ?? 0) > 0 ? "warning" : "default"}
      />

      {/* Alerts — management only in practice; auditor sees own scope */}
      <DashboardKpi
        label="Open alerts"
        value={alerts?.active ?? 0}
        support={
          (alerts?.bySeverity?.CRITICAL ?? 0) > 0
            ? `${alerts.bySeverity.CRITICAL} critical`
            : undefined
        }
        tone={(alerts?.bySeverity?.CRITICAL ?? 0) > 0 ? "danger" : "default"}
        onClick={() => !isAuditor && navigate("/alerts")}
      />
    </div>
  );
};
