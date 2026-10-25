// src/modules/products/product.controller.js
import { productService } from "./product.service.js";

export const bulkCreate = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items;
    const result = await productService.bulkImportItemMaster(items);
    res.status(200).json({
      status: "success",
      message: `Successfully processed ${result.totalProcessed} items (${result.insertedCount} inserted, ${result.skippedCount} skipped/duplicates).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

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
    res.status(200).json({ status: "success", data: { product } });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const product = await productService.create(req.body);
    res.status(201).json({
      status: "success",
      message: "Product created with benchmark price",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const addPriceRecord = async (req, res, next) => {
  try {
    const priceRecord = await productService.addPriceRecord(
      req.params.id,
      req.body,
    );
    res.status(201).json({
      status: "success",
      message: "New Queens price benchmark logged",
      data: { priceRecord },
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
      message: "Product updated",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await productService.remove(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Product deleted",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const productController = {
  getAll,
  getById,
  create,
  addPriceRecord,
  update,
  remove,
  bulkCreate,
};