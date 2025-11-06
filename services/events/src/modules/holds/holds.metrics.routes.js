import { Router } from 'express';
import { getMetrics } from '../../metrics/metrics.js';

export const holdsMetricsRouter = Router();

holdsMetricsRouter.get('/debug/metrics/holds', async (req, res) => {
  const names = ['create:ok', 'create:conflict', 'create:retry', 'create:tx_failed'];
  const data = await getMetrics(names);
  res.json(data);
});
