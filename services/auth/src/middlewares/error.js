import { ZodError } from 'zod';

export function errorHandler(err, _req, res, _next) {
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Validation failed', issues: err.issues }
        });
    }
    const code = err.status || 500;
    res.status(code).json({ error: { code, message: err.message || 'Internal Error' } });
}
