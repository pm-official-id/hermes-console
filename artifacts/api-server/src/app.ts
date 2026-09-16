import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve static frontend assets
app.use(express.static(path.join(process.cwd(), "public")));

// Serve index.html for SPA routing (must be after API routes)
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api") && req.accepts("html")) {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  } else {
    next();
  }
});

export default app;
