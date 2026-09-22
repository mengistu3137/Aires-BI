export const isGpsAcceptable = (accuracy) => {
    if (accuracy === null || accuracy === undefined) return false;
    // In field audits, GPS accuracy <= 25 meters is standard
    return accuracy <= 25;
};

export const formatAssignmentSummary = (assignment) => ({
    id: assignment.id,
    auditor: {
        id: assignment.auditor.id,
        name: assignment.auditor.name,
        phone: assignment.auditor.phone,
    },
    competitor: {
        id: assignment.competitor.id,
        name: assignment.competitor.name,
        market: assignment.competitor.market,
    },
    surveyPeriodId: assignment.surveyPeriodId,
    assignedItemsCount: assignment.items.length,
    items: assignment.items,
    status: assignment.status,
    assignedAt: assignment.assignedAt,
});