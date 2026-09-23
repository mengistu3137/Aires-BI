import { dashboardService } from "./dashboard.service.js";

export const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await dashboardService.getDashboardData({
      user: req.user,
      query: req.query,
    });

    res.status(200).json({
      status: "success",
      message: "Dashboard metrics retrieved successfully",
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

export const dashboardController = {
  getDashboard,
};
