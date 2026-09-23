import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useDashboard } from "../hooks/useDashboard.js";
import { useAuth } from "@/hooks/useAuth.js";
import { DashboardHeader } from "../components/DashboardHeader.jsx";
import { SurveyPeriodSelector } from "@/features/survey/components/SurveyPeriodSelector.jsx";
import { ActiveSurveyPeriodCard } from "../components/ActiveSurveyPeriodCard.jsx";
import { DashboardKpiGrid } from "../components/DashboardKpiGrid.jsx";
import { AssignmentProgressCard } from "../components/AssignmentProgressCard.jsx";
import { AuditProgressCard } from "../components/AuditProgressCard.jsx";
import { ObservationSummaryCard } from "../components/ObservationSummaryCard.jsx";
import { PriceActionSummaryCard } from "../components/PriceActionSummaryCard.jsx";
import { AlertSeverityCard } from "../components/AlertSeverityCard.jsx";
import { RecentAlertsList } from "../components/RecentAlertsList.jsx";
import { PriceIndexTrendCard } from "../components/PriceIndexTrendCard.jsx";
import { DashboardSectionError } from "../components/DashboardSectionError.jsx";

export const DashboardPage = () => {
  const { role } = useAuth();
  const isAuditor = role === "FIELD_AUDITOR";
  const [searchParams, setSearchParams] = useSearchParams();

  const surveyPeriodId = searchParams.get("surveyPeriodId") || "";

  const params = useMemo(() => ({ surveyPeriodId: surveyPeriodId || undefined }), [surveyPeriodId]);

  const { data: dashboard, isLoading, isError, error, refetch } = useDashboard(params);

  const handlePeriodChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("surveyPeriodId", val);
    else next.delete("surveyPeriodId");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DashboardHeader roleScope={role} />
        <SurveyPeriodSelector value={surveyPeriodId} onChange={handlePeriodChange} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {isError && <DashboardSectionError message={error?.message} onRetry={() => refetch()} />}

      {/* Content */}
      {!isLoading && !isError && dashboard && (
        <>
          {/* Active survey period */}
          <ActiveSurveyPeriodCard surveyPeriod={dashboard.scope?.surveyPeriod} />

          {/* KPI grid */}
          <DashboardKpiGrid dashboard={dashboard} isAuditor={isAuditor} />

          {/* Field progress */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AssignmentProgressCard assignments={dashboard.assignments} />
            <AuditProgressCard audits={dashboard.audits} />
          </div>

          {/* Observation summary (management focus; still useful for auditor) */}
          <ObservationSummaryCard observations={dashboard.observations} />

          {/* Pricing intelligence — management only */}
          {!isAuditor && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <PriceActionSummaryCard analysis={dashboard.analysis} />
                <AlertSeverityCard alerts={dashboard.alerts} />
              </div>

              {dashboard.recentAlerts?.length > 0 && (
                <RecentAlertsList recentAlerts={dashboard.recentAlerts} />
              )}

              {dashboard.priceTrend?.length > 0 && (
                <PriceIndexTrendCard priceTrend={dashboard.priceTrend} />
              )}
            </>
          )}

          {/* Auditor-only: sync guidance is handled inside Observation module */}
          {isAuditor && dashboard.recentAlerts?.length > 0 && (
            <RecentAlertsList recentAlerts={dashboard.recentAlerts} />
          )}
        </>
      )}
    </div>
  );
};
