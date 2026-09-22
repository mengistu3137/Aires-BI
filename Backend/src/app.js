import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import ApiError from "./utils/api-error.js";
import globalErrorHandler from "./middlewares/error.middleware.js";

// Aires-BI Route Modules
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import competitorRoutes from "./modules/competitors/competitor.routes.js";
import surveyRoutes from "./modules/surveys/survey.routes.js";
import biRoutes from "./modules/bi/bi.routes.js";
import storeRoutes from "./modules/stores/stores.routes.js";
import periodRoutes from "./modules/period/period.routes.js";
import assignmentRoutes from "./modules/assignment/assignment.routes.js";

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Serve public uploads if photos/signatures are captured
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    app: "Aires-BI",
    version: "1.0.0",
    message: "Aires-BI API engine is operational",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// REGISTER SYSTEM ROUTES
// ==========================================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/competitors", competitorRoutes);
app.use("/api/v1/surveys", surveyRoutes);
app.use("/api/v1/bi", biRoutes);
app.use("/api/v1/stores", storeRoutes);
app.use("/api/v1/survey-periods", periodRoutes);
app.use("/api/v1/assignments", assignmentRoutes);

// ==========================================
// 404 CATCH-ALL (Express 4 & 5 Compatible)
// ==========================================
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found on Aires-BI`));
});

// GLOBAL ERROR MIDDLEWARE
app.use(globalErrorHandler);

export default app;