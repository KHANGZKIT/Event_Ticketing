/**
 * Waitlist Routes
 */

import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import * as ctrl from './waitlist.controller.js';

const router = Router();

// Tất cả routes đều cần auth
router.use(requireAuth);

// Join waitlist
router.post('/', ctrl.joinWaitlist);

// Leave waitlist  
router.delete('/:showId', ctrl.leaveWaitlist);

// Get my position
router.get('/:showId/position', ctrl.getPosition);

// Accept offer
router.post('/:showId/accept', ctrl.acceptOffer);

// Decline offer
router.post('/:showId/decline', ctrl.declineOffer);

// Admin: Get waitlist for a show
router.get('/:showId/admin', ctrl.getShowWaitlist);

export default router;
