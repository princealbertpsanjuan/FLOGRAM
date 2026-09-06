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
 * PAYMONGO RAW BODY HANDLING
 * =========================================================
 *
 * PayMongo webhook signatures must be verified against
 * the EXACT bytes received from PayMongo.
 *
 * Only these two routes use express.raw().
 *
 * All other FLOGRAM routes continue using express.json().
 * =========================================================
 */

const payMongoWebhookPaths = [
  "/api/v1/payments/webhook/paymongo",
  "/api/v1/checkout/webhook/paymongo",
];

/*
 * IMPORTANT:
 *
 * type: () => true
 *
 * forces Express to preserve the request as a Buffer
 * regardless of PayMongo's Content-Type header.
 *
 * This is safe here because this parser is only executed
 * for the two exact webhook paths above.
 */
const payMongoRawParser =
  express.raw({
    type: () => true,
    limit: "10mb",
  });

const normalJsonParser =
  express.json({
    limit: "10mb",
  });

app.use(
  (
    req,
    res,
    next
  ) => {
    const requestPath =
      String(
        req.originalUrl || ""
      ).split("?")[0];

    const isPayMongoWebhook =
      payMongoWebhookPaths.includes(
        requestPath
      );

    if (
      isPayMongoWebhook
    ) {
      return payMongoRawParser(
        req,
        res,
        (
          error
        ) => {
          if (error) {
            return next(
              error
            );
          }

          /*
           * express.raw() should now make
           * req.body a Buffer.
           */
          if (
            Buffer.isBuffer(
              req.body
            )
          ) {
            req.rawBody =
              Buffer.from(
                req.body
              );
          }

          return next();
        }
      );
    }

    return normalJsonParser(
      req,
      res,
      next
    );
  }
);

/*
 * =========================================================
 * URL ENCODED BODY
 * =========================================================
 */

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/*
 * =========================================================
 * COOKIES
 * =========================================================
 */

app.use(
  cookieParser()
);

/*
 * =========================================================
 * SERVE UPLOADED FILES
 * =========================================================
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
 * =========================================================
 * ROOT
 * =========================================================
 */

app.get(
  "/",
  (
    req,
    res
  ) => {
    return res
      .status(200)
      .json({
        success: true,

        message:
          "Welcome to the FLOGRAM API.",
      });
  }
);

/*
 * =========================================================
 * API
 * =========================================================
 */

app.use(
  "/api/v1",
  apiRouter
);

/*
 * =========================================================
 * ERROR HANDLING
 * =========================================================
 */

app.use(
  notFound
);

app.use(
  errorHandler
);

export default app;