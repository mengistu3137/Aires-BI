import { authService } from "./auth.service.js";

export const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.status(200).json({
      status: "success",
      message: "Login successful",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const authController = {
  login,
  getMe,
};