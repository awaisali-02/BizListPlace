import { Schema, model, Document, Types } from 'mongoose';
import { ClaimStatus, CLAIM_STATUSES } from '@bizpockethub/shared';

export interface IClaimDocument extends Document {
  businessId: Types.ObjectId;
  claimantId: Types.ObjectId;
  businessEmail: string;
  phone: string;
  verificationDocuments: string[];
  notes?: string;
  status: ClaimStatus;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClaimSchema = new Schema<IClaimDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    claimantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    verificationDocuments: [
      {
        type: String,
      },
    ],
    notes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: CLAIM_STATUSES,
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ClaimRequest = model<IClaimDocument>('ClaimRequest', ClaimSchema);
