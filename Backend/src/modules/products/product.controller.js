import { productService } from "./product.service.js";

export const getAll = async (req, res, next) => {
  try {
    const products = await productService.getAll(req.query);
    res.status(200).json({
      status: "success",
      results: products.length,
      data: { products },
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const product = await productService.getById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const product = await productService.create(req.body);
    res.status(201).json({
      status: "success",
      message: "Product created successfully",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message: "Product updated successfully",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await productService.remove(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Product removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const productController = {
  getAll,
  getById,
  create,
  update,
  remove,
};