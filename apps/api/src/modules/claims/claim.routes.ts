import { Router } from 'express';
import { ClaimController } from './claim.controller';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { CreateClaimSchema } from '@bizpockethub/shared';

const router = Router();

router.post(
  '/businesses/:id/claim',
  requireAuth,
  validateBody(CreateClaimSchema),
  ClaimController.submitClaim
);
router.get('/owner/claims', requireAuth, ClaimController.getMyClaims);

export default router;
