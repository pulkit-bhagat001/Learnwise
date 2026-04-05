import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import subjectsRouter from "./subjects.js";
import materialsRouter from "./materials.js";
import assignmentsRouter from "./assignments.js";
import attendanceRouter from "./attendance.js";
import pomodoroRouter from "./pomodoro.js";
import plannerRouter from "./planner.js";
import dashboardRouter from "./dashboard.js";
import rewardsRouter from "./rewards.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/subjects", subjectsRouter);
router.use("/materials", materialsRouter);
router.use("/assignments", assignmentsRouter);
router.use("/attendance", attendanceRouter);
router.use("/pomodoro", pomodoroRouter);
router.use("/planner", plannerRouter);
router.use("/dashboard", dashboardRouter);
router.use("/rewards", rewardsRouter);

export default router;
