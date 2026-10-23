import { Response, NextFunction } from 'express';
import { ClaimRequest } from './claim.model';
import { Business } from '../businesses/business.model';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AuditService } from '../../services/audit.service';

export class ClaimController {
  static async submitClaim(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { businessEmail, phone, notes, verificationDocuments } = req.body;

      const business = await Business.findById(id);
      if (!business) {
        res.status(404).json({ success: false, message: 'Business not found.' });
        return;
      }

      if (business.ownerId && business.verificationStatus === 'verified') {
        res.status(400).json({
          success: false,
          message: 'This business has already been claimed and verified by its registered owner.',
        });
        return;
      }

      // Check for existing pending claim by this user
      const existing = await ClaimRequest.findOne({
        businessId: id,
        claimantId: user._id,
        status: 'pending',
      });
      if (existing) {
        res.status(400).json({
          success: false,
          message: 'You already have a pending claim request for this listing.',
        });
        return;
      }

      const claim = await ClaimRequest.create({
        businessId: id,
        claimantId: user._id,
        businessEmail,
        phone,
        notes,
        verificationDocuments: verificationDocuments || [],
        status: 'pending',
      });

      await AuditService.log('claim_submitted', 'claim', claim._id.toString(), {
        businessId: id,
      }, user._id, req.ip);

      res.status(201).json({
        success: true,
        message: 'Claim request submitted. Our team will verify ownership documents within 2 business days.',
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyClaims(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user!;
      const claims = await ClaimRequest.find({ claimantId: user._id })
        .populate('businessId', 'name slug verificationStatus')
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        data: claims,
      });
    } catch (err) {
      next(err);
    }
  }
}
