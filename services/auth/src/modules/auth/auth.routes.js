import { Router } from 'express';
import { login, register, me, updateUser, deleteUser } from './auth.controller.js';
import { authGuard } from '../../middlewares/authGuard.js';
const r = Router();

r.post('/register', register);
r.post('/login', login);
r.get('/me', authGuard, me);


r.patch('/users/:id', authGuard, updateUser);
r.delete('/users/:id', authGuard, deleteUser);

export default r;
