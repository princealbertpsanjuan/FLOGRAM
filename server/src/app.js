import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";

import apiRouter from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(morgan("dev"));

/*
 * =========================================================
 * JSON BODY PARSER
 * =========================================================
 *
 * IMPORTANT FOR PAYMONGO:
 *
 * PayMongo webhook signatures must be
 * verified against the ORIGINAL raw
 * request body.
 *
 * The verify callback runs before
 * express.json() converts the request
 * into a JavaScript object.
 */
app.use(
  express.json({
    limit: "10mb",

    verify: (
      req,
      res,
      buffer
    ) => {
      /*
       * Only preserve raw bytes for
       * the PayMongo webhook endpoint.
       */
      if (
        req.originalUrl ===
        "/api/v1/payments/webhook/paymongo"
      ) {
        req.rawBody =
          Buffer.from(
            buffer
          );
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(
  cookieParser()
);

/*
 * =========================================================
 * SERVE UPLOADED FILES
 * =========================================================
 *
 * Example:
 *
 * uploads/flowers/example.jpg
 *
 * becomes:
 *
 * http://localhost:5000/uploads/flowers/example.jpg
 */
app.use(
  "/uploads",
  express.static(
    path.join(
      process.cwd(),
      "uploads"
    )
  )
);

/*
 * ROOT
 */
app.get(
  "/",
  (
    req,
    res
  ) => {
    res.status(200).json({
      success: true,
      message:
        "Welcome to the FLOGRAM API.",
    });
  }
);

/*
 * API
 */
app.use(
  "/api/v1",
  apiRouter
);

/*
 * These must stay after
 * all valid routes.
 */
app.use(
  notFound
);

app.use(
  errorHandler
);

export default app;