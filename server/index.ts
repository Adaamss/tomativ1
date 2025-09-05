import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Environment validation for production deployment
function validateEnvironment() {
  const requiredVars = [];
  const warnings = [];
  
  // Check JWT_SECRET - critical for authentication
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      requiredVars.push('JWT_SECRET');
    } else {
      warnings.push('JWT_SECRET not set, using fallback (not recommended for production)');
    }
  }
  
  // Check database connection
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      requiredVars.push('DATABASE_URL');
    } else {
      warnings.push('DATABASE_URL not set, database operations may fail');
    }
  }
  
  // Log warnings
  if (warnings.length > 0) {
    log('Environment warnings:');
    warnings.forEach(warning => log(`  - ${warning}`));
  }
  
  // Fail for missing required vars in production
  if (requiredVars.length > 0) {
    const missingVars = requiredVars.join(', ');
    throw new Error(`Missing required environment variables: ${missingVars}. Please configure these in your deployment settings.`);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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
    // Validate environment variables before starting
    log('Validating environment configuration...');
    validateEnvironment();
    log('Environment validation passed');

    // Register routes and initialize server
    log('Initializing server and registering routes...');
    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      // Don't throw error in production to prevent crashes
      if (process.env.NODE_ENV !== 'production') {
        throw err;
      } else {
        console.error('Application error:', err);
      }
    });

    // Setup development or production serving
    if (app.get("env") === "development") {
      log('Setting up Vite development server...');
      await setupVite(app, server);
    } else {
      log('Setting up static file serving for production...');
      serveStatic(app);
    }

    // Start the server
    const port = parseInt(process.env.PORT || '5000', 10);
    log(`Starting server on port ${port}...`);
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`✅ Server successfully started and serving on port ${port}`);
    });

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    console.error('Please check your environment configuration and try again.');
    
    // Graceful shutdown
    if (process.env.NODE_ENV === 'production') {
      console.error('Application will exit due to critical startup error.');
      process.exit(1);
    } else {
      // In development, don't exit so developer can fix the issue
      console.error('Fix the above error and restart the application.');
    }
  }
})();
