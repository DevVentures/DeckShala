import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { initializeWebSocketServer, cleanupWebSocketServer } from "./src/server/websocket-yjs";
import { logger } from "./src/lib/logger";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error("Error handling request", err as Error, {
        url: req.url,
        method: req.method,
      });
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize WebSocket server
  const io = initializeWebSocketServer(httpServer);

  httpServer
    .once("error", (err) => {
      logger.error("Failed to start server", err);
      process.exit(1);
    })
    .listen(port, () => {
      logger.info(`Server ready`, {
        url: `http://${hostname}:${port}`,
        env: process.env.NODE_ENV,
      });
    });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);

    try {
      // Cleanup WebSocket connections
      await cleanupWebSocketServer(io);

      // Close HTTP server
      httpServer.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 30000);
    } catch (error) {
      logger.error("Error during shutdown", error as Error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
});
