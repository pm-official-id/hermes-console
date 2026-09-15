import { Router, type IRouter } from "express";
import healthRouter from "./health";
import controlPlaneRouter from "./control-plane";

const router: IRouter = Router();

router.use(healthRouter);
router.use(controlPlaneRouter);

export default router;
