import express from "express";
import { ApolloServer } from "apollo-server-express";
import { createServer } from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { logger } from "./utils/logger";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import { context } from "./graphql/context";
import { setupRoutes } from "./routes";
import { setupJobs } from "./jobs";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";

dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

async function startServer() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: NODE_ENV === "production" ? undefined : false,
  }));

  app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later.",
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Auth middleware for REST routes
  app.use(authMiddleware);

  // REST API routes
  setupRoutes(app);

  // GraphQL setup
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const apolloServer = new ApolloServer({
    schema,
    context,
    introspection: NODE_ENV !== "production",
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              // Cleanup when server shuts down
            },
          };
        },
      },
    ],
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });

  // Create HTTP server (sans WebSocket pour le moment)
  const httpServer = createServer(app);

  // Error handling
  app.use(errorHandler);

  // Start background jobs
  setupJobs();

  httpServer.listen(PORT, () => {
    logger.info(`🚀 OSINT Master Backend running on port ${PORT}`);
    logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
    logger.info(`🔧 Environment: ${NODE_ENV}`);
    logger.info(`⚠️  WebSocket subscriptions disabled (REST API only)`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    httpServer.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
}

startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
