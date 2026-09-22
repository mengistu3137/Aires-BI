import { userService } from "./user.service.js";

export const getAll = async (req, res, next) => {
  try {
    const users = await userService.getAll(req.query);
    res.status(200).json({ status: "success", results: users.length, data: { users } });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json({ status: "success", message: "User registered", data: { user } });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const user = await userService.update(req.params.id, req.body);
    res.status(200).json({ status: "success", message: "User updated", data: { user } });
  } catch (error) {
    next(error);
  }
};

export const userController = {
  getAll,
  getById,
  create,
  update,
};