import { Router } from 'express';
import * as ctrl from './coupons.controller.js';
import { authGuard } from '../../middlewares/authGuard.js';
import { requireRole } from '../../middlewares/requireRole.js';


const r = Router();

// Public coupon validation (requires auth but not admin)
r.get('/validate/:code', authGuard, ctrl.validateCoupon);

// Admin-only routes
r.get('/', authGuard, requireRole('admin'), ctrl.listCoupons);
r.post('/', authGuard, requireRole('admin'), ctrl.createCoupon);
r.get('/:id', authGuard, requireRole('admin'), ctrl.getCoupon);
r.patch('/:id', authGuard, requireRole('admin'), ctrl.updateCoupon);
r.delete('/:id', authGuard, requireRole('admin'), ctrl.deleteCoupon);

export default r;
