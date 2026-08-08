import { Router } from "express";

import authRouter from "../modules/auth/auth.routes.js";
import healthRouter from "../modules/health/health.routes.js";
import userRouter from "../modules/users/user.routes.js";
import floristRouter from "../modules/florists/florist.routes.js";
import riderRouter from "../modules/riders/rider.routes.js";
import verificationRouter from "../modules/verification/verification.routes.js";
import flowerRouter from "../modules/flowers/flower.routes.js";


const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/florists", floristRouter);
apiRouter.use("/riders", riderRouter);
apiRouter.use("/verification", verificationRouter);
apiRouter.use("/flowers", flowerRouter);

export default apiRouter;