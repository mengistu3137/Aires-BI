import { queensPriceService } from "./queens-price.service.js";

export const createQueensPrice = async (req, res, next) => {
  try {
    const priceRecord = await queensPriceService.createQueensPrice(req.body);
    res.status(201).json({
      status: "success",
      message: "Queens benchmark price created successfully",
      data: priceRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const getQueensPriceById = async (req, res, next) => {
  try {
    const priceRecord = await queensPriceService.getQueensPriceById(
      req.params.id,
    );
    res.status(200).json({
      status: "success",
      data: priceRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const listQueensPrices = async (req, res, next) => {
  try {
    const result = await queensPriceService.listQueensPrices(req.query);
    res.status(200).json({
      status: "success",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentQueensPrice = async (req, res, next) => {
  try {
    const priceRecord = await queensPriceService.getCurrentQueensPrice(
      req.params.productId,
    );

    if (!priceRecord) {
      return res.status(404).json({
        status: "fail",
        message: `No active benchmark price found for product [${req.params.productId}]`,
      });
    }

    res.status(200).json({
      status: "success",
      data: priceRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const getQueensPriceAtDate = async (req, res, next) => {
  try {
    const priceRecord = await queensPriceService.getQueensPriceAtDate(
      req.params.productId,
      req.query.date,
    );

    if (!priceRecord) {
      return res.status(404).json({
        status: "fail",
        message: `No benchmark price was effective for product [${req.params.productId}] on date [${req.query.date}]`,
      });
    }

    res.status(200).json({
      status: "success",
      data: priceRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductQueensPriceHistory = async (req, res, next) => {
  try {
    const result = await queensPriceService.getProductQueensPriceHistory(
      req.params.productId,
      req.query,
    );

    res.status(200).json({
      status: "success",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const updateQueensPrice = async (req, res, next) => {
  try {
    const updated = await queensPriceService.updateQueensPrice(
      req.params.id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      message: "Queens benchmark price updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQueensPrice = async (req, res, next) => {
  try {
    const result = await queensPriceService.deleteQueensPrice(req.params.id);
    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const queensPriceController = {
  createQueensPrice,
  getQueensPriceById,
  listQueensPrices,
  getCurrentQueensPrice,
  getQueensPriceAtDate,
  getProductQueensPriceHistory,
  updateQueensPrice,
  deleteQueensPrice,
};
