import prisma from "../../config/db.js";

const lastWrite = new Map();

export const openLoginSession = async (userId, client) => {
  return prisma.loginSession.create({
    data: {
      userId,
      ipAddress: client.ipAddress,
      location: client.location,
      userAgent: client.userAgent,
      osName: client.osName,
      osVersion: client.osVersion,
      deviceType: client.deviceType,
      browserName: client.browserName,
      browserVersion: client.browserVersion,
    },
  });
};

export const closeLoginSession = async (sessionId) => {
  if (!sessionId) return;
  const session = await prisma.loginSession.findUnique({ where: { id: sessionId } });
  if (!session || session.logoutAt) return;

  const logoutAt = new Date();
  const durationSeconds = Math.max(0, Math.round((logoutAt.getTime() - session.loginAt.getTime()) / 1000));
  await prisma.loginSession.update({
    where: { id: sessionId },
    data: { logoutAt, lastSeenAt: logoutAt, durationSeconds },
  });
};

export const touchLoginSession = (sessionId) => {
  if (!sessionId) return;
  const now = Date.now();
  if (now - (lastWrite.get(sessionId) || 0) < 60_000) return;
  lastWrite.set(sessionId, now);
  prisma.loginSession
    .updateMany({
      where: { id: sessionId, logoutAt: null },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});
};

const startOfToday = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
};

export const listLoginAudit = async ({ page = 1, limit = 20 } = {}) => {
  const take = Math.min(100, Math.max(1, Number(limit) || 20));
  const currentPage = Math.max(1, Number(page) || 1);
  const skip = (currentPage - 1) * take;
  const today = startOfToday();
  const activeSince = new Date(Date.now() - 15 * 60 * 1000);

  const [total, rows, signedInNow, sessionsToday, peopleToday, closed] = await Promise.all([
    prisma.loginSession.count(),
    prisma.loginSession.findMany({
      skip,
      take,
      orderBy: { loginAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.loginSession.count({
      where: { logoutAt: null, lastSeenAt: { gte: activeSince } },
    }),
    prisma.loginSession.count({ where: { loginAt: { gte: today } } }),
    prisma.loginSession.findMany({
      where: { loginAt: { gte: today } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.loginSession.aggregate({
      where: { durationSeconds: { not: null } },
      _avg: { durationSeconds: true },
    }),
  ]);

  return {
    summary: {
      signedInNow,
      sessionsToday,
      peopleToday: peopleToday.length,
      averageStaySeconds:
        closed._avg.durationSeconds == null ? null : Math.round(closed._avg.durationSeconds),
    },
    data: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.user?.name || "Unknown",
      email: row.user?.email || null,
      role: row.user?.role || null,
      loginAt: row.loginAt,
      logoutAt: row.logoutAt,
      lastSeenAt: row.lastSeenAt,
      durationSeconds: row.logoutAt
        ? row.durationSeconds
        : Math.max(0, Math.round((Date.now() - row.loginAt.getTime()) / 1000)),
      stillSignedIn: !row.logoutAt,
      ipAddress: row.ipAddress,
      location: row.location,
      osName: row.osName,
      osVersion: row.osVersion,
      deviceType: row.deviceType,
      browserName: row.browserName,
      browserVersion: row.browserVersion,
    })),
    meta: { page: currentPage, limit: take, total, totalPages: Math.ceil(total / take) || 1 },
  };
};
