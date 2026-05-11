import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import servicesRouter from "./services";
import availabilityRouter from "./availability";
import bookingsRouter from "./bookings";
import reviewsRouter from "./reviews";
import providerRouter from "./provider";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(servicesRouter);
router.use(availabilityRouter);
router.use(bookingsRouter);
router.use(reviewsRouter);
router.use(providerRouter);
router.use(notificationsRouter);

export default router;
