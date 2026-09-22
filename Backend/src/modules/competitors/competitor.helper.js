export const formatCompetitorSummary = (competitor) => {
    return {
        id: competitor.id,
        name: competitor.name,
        market: competitor.market,
        type: competitor.type,
        active: competitor.active,
        activeAssignmentsCount: competitor.assignments ? competitor.assignments.length : 0,
    };
};