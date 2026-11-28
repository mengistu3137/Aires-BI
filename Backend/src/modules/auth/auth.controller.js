import { authService } from "./auth.service.js";
import { describeClient } from "./client-info.js";

export const login = async (req, res, next) => {
  try {
    const client = await describeClient(req);
    const data = await authService.login(req.body, client);
    res.status(200).json({
      status: "success",
      message: "Login successful",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id, req.user.sessionId);
    res.status(200).json({
      status: "success",
      message: "Logout successful. Session cleared.",
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

export const changePassword = async (req, res, next) => {
  try {
    const user = await authService.changePassword(req.user.id, req.body);
    res.status(200).json({
      status: "success",
      message: "Password updated",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const listLoginAudit = async (req, res, next) => {
  try {
    const data = await authService.listLoginAudit(req.query);
    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const impersonate = async (req, res, next) => {
  try {
    const data = await authService.impersonateUser(req.params.userId, req.user);
    res.status(200).json({
      status: "success",
      message: `Signed in on behalf of ${data.user.name}`,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const authController = {
  login,
  logout,
  getMe,
  changePassword,
  listLoginAudit,
  impersonate,
};