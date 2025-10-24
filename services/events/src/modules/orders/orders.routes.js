import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard.js";
import { checkout } from "./orders.controller.js";

const r = Router();
r.post('/checkout', authGuard, checkout); // Thanh Toan

export default r;