import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

/**
 * Sequential, timezone-safe daily cycle generator with full error reporting
 */
export const healDailyCyclesForPeriod = async (periodId, startDate, endDate, status = "OPEN") => {
  

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Normalize start to UTC midnight
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0));
    // Normalize end to UTC end-of-day
    const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));

    const diffDays = Math.round((endUtc - cur) / (1000 * 60 * 60 * 24));
  

    if (diffDays < 1) {
        console.warn(`[HealDailyCycles] diffDays is less than 1. Skipping daily cycles.`);
        return [];
    }

    const createdIds = [];

    while (cur <= endUtc) {
        const dayStart = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(), 0, 0, 0));
        const dayEnd = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(), 23, 59, 59, 999));

        const yyyy = cur.getUTCFullYear();
        const mm = String(cur.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(cur.getUTCDate()).padStart(2, "0");
        const monthName = MONTH_NAMES[cur.getUTCMonth()];
        const dayNumber = cur.getUTCDate();

        const dailyName = `${monthName} ${dayNumber}, ${yyyy} Daily survey`;
        const dailyId = `${periodId}-DAILY-${yyyy}-${mm}-${dd}`;

        try {
            const upserted = await prisma.surveyPeriod.upsert({
                where: { id: dailyId },
                update: {
                    name: dailyName,
                    startDate: dayStart,
                    endDate: dayEnd,
                    status: status || "OPEN",
                },
                create: {
                    id: dailyId,
                    name: dailyName,
                    startDate: dayStart,
                    endDate: dayEnd,
                    status: status || "OPEN",
                },
            });
            createdIds.push(upserted.id);
           
        } catch (err) {
            console.error(`  ✗ Failed to upsert ${dailyId}:`, err.message);
        }

        // Advance to next day in UTC
        cur.setUTCDate(cur.getUTCDate() + 1);
    }

 

    return createdIds;
};

export const getAll = async () => {
    return prisma.surveyPeriod.findMany({
        orderBy: { startDate: "desc" },
        include: {
            _count: { select: { assignments: true, audits: true, priceAnalyses: true } },
        },
    });
};

export const getActive = async () => {
    return prisma.surveyPeriod.findFirst({
        where: { status: "OPEN" },
        orderBy: { startDate: "desc" },
        include: {
            _count: { select: { assignments: true, audits: true } },
        },
    });
};

export const getById = async (id) => {
    const period = await prisma.surveyPeriod.findUnique({
        where: { id },
        include: {
            _count: { select: { assignments: true, audits: true, priceAnalyses: true } },
        },
    });

    if (!period) {
        throw new ApiError(404, `Survey period '${id}' not found`);
    }

    return period;
};

export const create = async (payload) => {
    const exists = await prisma.surveyPeriod.findUnique({
        where: { id: payload.id },
    });
    if (exists) {
        throw new ApiError(409, `Survey period '${payload.id}' already exists.`);
    }

    const periodName = payload.name || `Survey Cycle ${payload.id}`;
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);
    const status = payload.status || "OPEN";

    // 1. Create main weekly cycle
    const mainPeriod = await prisma.surveyPeriod.create({
        data: {
            id: payload.id,
            name: periodName,
            status,
            startDate,
            endDate,
        },
    });

    // 2. Automatically generate 7 daily cycles
    await healDailyCyclesForPeriod(payload.id, startDate, endDate, status);

    return mainPeriod;
};

export const update = async (id, payload) => {
    const existing = await getById(id);

    const startDate = payload.startDate ? new Date(payload.startDate) : existing.startDate;
    const endDate = payload.endDate ? new Date(payload.endDate) : existing.endDate;
    const status = payload.status !== undefined ? payload.status : existing.status;
    const name = payload.name !== undefined ? payload.name : existing.name;

    // 1. Update the parent cycle
    const updated = await prisma.surveyPeriod.update({
        where: { id },
        data: {
            name,
            startDate,
            endDate,
            status,
        },
    });

    // 2. Await the healing process so all 7 daily cycles are created in the DB
    await healDailyCyclesForPeriod(id, startDate, endDate, status);

    return updated;
};

export const updateStatus = async (id, status) => {
    await getById(id);
    const updated = await prisma.surveyPeriod.update({
        where: { id },
        data: { status },
    });

    // Cascade status to child daily cycles
    await prisma.surveyPeriod.updateMany({
        where: { id: { startsWith: `${id}-DAILY-` } },
        data: { status },
    });

    return updated;
};

export const remove = async (id) => {
    const period = await getById(id);

    if (period._count?.assignments > 0 || period._count?.audits > 0) {
        throw new ApiError(
            400,
            `Cannot delete cycle '${period.name}' because it has active assignments or field audits.`
        );
    }

    await prisma.priceAnalysis.deleteMany({
        where: { surveyPeriodId: id },
    });

    // Delete unassigned child daily cycles
    await prisma.surveyPeriod.deleteMany({
        where: {
            id: { startsWith: `${id}-DAILY-` },
            assignments: { none: {} },
            audits: { none: {} },
        },
    });

    await prisma.surveyPeriod.delete({
        where: { id },
    });

    return { deleted: true, message: `Survey cycle '${period.name}' deleted successfully.` };
};

export const periodService = {
    getAll,
    getActive,
    getById,
    create,
    update,
    updateStatus,
    remove,
    healDailyCyclesForPeriod,
};