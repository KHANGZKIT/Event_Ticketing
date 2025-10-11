import { Router } from 'express';
import { login, register, me } from './auth.controller.js';
import { authGuard } from '../../middlewares/authGuard.js';
const r = Router();

r.post('/register', register);
r.post('/login', login);
r.get('/me', authGuard, me);

export default r;
