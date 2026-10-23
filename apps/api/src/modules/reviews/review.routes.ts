import { Router } from 'express';
import { ReviewController } from './review.controller';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { CreateReviewSchema } from '@bizpockethub/shared';

const router = Router();

router.get('/businesses/:id/reviews', ReviewController.listByBusiness);
router.post(
  '/businesses/:id/reviews',
  requireAuth,
  validateBody(CreateReviewSchema),
  ReviewController.create
);
router.delete('/reviews/:id', requireAuth, ReviewController.delete);

export default router;
