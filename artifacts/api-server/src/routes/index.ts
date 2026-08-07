import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sheetsRouter from "./sheets";
import votesRouter from "./votes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sheetsRouter);
router.use(votesRouter);

export default router;
