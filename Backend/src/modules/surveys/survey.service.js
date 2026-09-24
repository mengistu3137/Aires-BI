import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { getIO } from "../../config/socket.js";

// --- Survey Periods ---
export const getActivePeriod = async () => {
  const period = await prisma.surveyPeriod.findFirst({
    where: { status: "OPEN" },
    orderBy: { startDate: "desc" },
  });
  return period;
};

export const createPeriod = async (payload) => {
  const exists = await prisma.surveyPeriod.findUnique({
    where: { id: payload.id },
  });
  if (exists) {
    throw new ApiError(409, `Survey period '${payload.id}' already exists.`);
  }
  return prisma.surveyPeriod.create({
    data: {
      ...payload,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
    },
  });
};

export const getAllPeriods = async () => {
  return prisma.surveyPeriod.findMany({
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });
};

// --- Assignments ---
export const getAssignments = async ({ auditorId, periodId, role }) => {
  const where = {};
  if (role === "FIELD_AUDITOR") {
    where.auditorId = auditorId;
  } else if (auditorId) {
    where.auditorId = auditorId;
  }

  if (periodId) {
    where.surveyPeriodId = periodId;
  }

  return prisma.surveyAssignment.findMany({
    where,
    include: {
      auditor: { select: { id: true, name: true, phone: true } },
      competitor: {
        select: { id: true, name: true, market: true, type: true },
      },
    },
    orderBy: { assignedAt: "desc" },
  });
};

export const createAssignment = async (payload) => {
  const auditor = await prisma.user.findUnique({
    where: { id: payload.auditorId },
  });
  if (!auditor || auditor.role !== "FIELD_AUDITOR") {
    throw new ApiError(400, "Assigned user must be an active FIELD_AUDITOR");
  }

  return prisma.surveyAssignment.create({
    data: payload,
    include: {
      auditor: { select: { id: true, name: true } },
      competitor: { select: { id: true, name: true } },
    },
  });
};

export const updateAssignmentStatus = async (id, status, user) => {
  const assignment = await prisma.surveyAssignment.findUnique({
    where: { id },
  });
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  if (user.role === "FIELD_AUDITOR" && assignment.auditorId !== user.id) {
    throw new ApiError(403, "You can only update your own assignments");
  }

  return prisma.surveyAssignment.update({
    where: { id },
    data: { status },
  });
};

// --- Survey Entries & Sync ---
export const submitEntry = async (auditorId, data) => {
  const entry = await prisma.surveyEntry.create({
    data: {
      ...data,
      auditorId,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    },
    include: {
      product: { select: { id: true, name: true, queensPrice: true } },
      competitor: { select: { id: true, name: true } },
    },
  });

  // Emit real-time update via WebSocket
  try {
    const io = getIO();
    io.emit("survey:entry-created", entry);
  } catch {
    // Socket emit fallback if disconnected
  }

  return entry;
};

export const syncBatchEntries = async (auditorId, entries) => {
  const results = [];
  for (const item of entries) {
    const entry = await submitEntry(auditorId, item);
    results.push(entry);
  }
  return {
    syncedCount: results.length,
    entries: results,
  };
};

export const surveyService = {
  getActivePeriod,
  createPeriod,
  getAssignments,
  createAssignment,
  updateAssignmentStatus,
  getAllPeriods,
  submitEntry,
  syncBatchEntries,
};
