import { Schema, model, Document, Types } from 'mongoose';
import { ModerationStatus, MODERATION_STATUSES } from '@bizpockethub/shared';

export interface IReviewDocument extends Document {
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  title: string;
  content: string;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReviewDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    moderationStatus: {
      type: String,
      enum: MODERATION_STATUSES,
      default: 'approved', // Auto-approved in dev/demo or pending for strict moderation
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate review per user on the same business
ReviewSchema.index({ businessId: 1, userId: 1 }, { unique: true });

export const Review = model<IReviewDocument>('Review', ReviewSchema);
