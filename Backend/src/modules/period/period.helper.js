export const isPeriodActive = (period) => {
    if (!period || period.status !== "OPEN") return false;
    const now = new Date();
    return now >= new Date(period.startDate) && now <= new Date(period.endDate);
};