import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Environment validation for production deployment
function validateEnvironment() {
  const requiredVars = [];
  const warnings = [];

  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
      requiredVars.push("JWT_SECRET");
    } else {
      warnings.push("JWT_SECRET not set, using fallback (not recommended for production)");
    }
  }

  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") {
      requiredVars.push("DATABASE_URL");
    } else {
      warnings.push("DATABASE_URL not set, database operations may fail");
    }
  }

  if (warnings.length > 0) {
    log("Environment warnings:");
    warnings.forEach((warning) => log(`  - ${warning}`));
  }

  if (requiredVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${requiredVars.join(", ")}. Please configure these in your deployment settings.`
    );
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware (unchanged)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Graceful startup with error handling
(async () => {
  try {
    log("Validating environment configuration...");
    validateEnvironment();
    log("Environment validation passed");

    log("Initializing server and registering routes...");
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      if (process.env.NODE_ENV !== "production") {
        throw err;
      } else {
        console.error("Application error:", err);
      }
    });

    if (app.get("env") === "development") {
      log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving for production...");
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.env.HOST || "localhost"; // ✅ safe default

    log(`Starting server on ${host}:${port}...`);
    server.listen(port, host, () => {
      log(`✅ Server successfully started at http://${host}:${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start application:", error);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      console.error("Fix the above error and restart the application.");
    }
  }
})();
