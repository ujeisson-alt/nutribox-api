import mongoose, { Schema, Document } from 'mongoose';

export interface IProductReview extends Document {
  productId: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: Date;
}

const ProductReviewSchema = new Schema<IProductReview>({
  productId: { type: Number, required: true, index: true },
  userId: { type: Number, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

// Un usuario solo puede dejar una reseña por producto
ProductReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export const ProductReview = mongoose.model<IProductReview>('ProductReview', ProductReviewSchema);
