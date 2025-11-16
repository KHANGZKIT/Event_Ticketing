import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard.js";
import { createPayment, handleWebhook, getPaymentStatus, handleReturnCallback } from "./payments.controller.js";

const r = Router();

// Create payment (requires auth)
r.post('/create', authGuard, createPayment);

// Get payment status (requires auth)
r.get('/status/:orderId', authGuard, getPaymentStatus);

// Return callback handlers (GET request from payment gateway redirect)
// No auth required, but signature is verified in service
r.get('/return/:provider', handleReturnCallback);

// Webhook handlers (POST request from payment gateway)
// No auth required, but signature verification in service
r.post('/webhooks/:provider', handleWebhook);

export default r;

