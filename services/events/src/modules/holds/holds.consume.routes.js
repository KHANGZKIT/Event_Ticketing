import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { consumeHoldController } from './holds.consume.controller.js';

export const holdsConsumeRouter = Router();

holdsConsumeRouter.post('/:id/consume', authGuard, consumeHoldController);
