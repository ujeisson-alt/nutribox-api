import mongoose, { Schema, Document } from 'mongoose';

export const ACTIVITY_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'ORDER_CREATED',
  'LOGIN_FAILED',
  'PROFILE_UPDATED',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface IActivityLog extends Document {
  userId: number; // referencia al id de MySQL
  action: ActivityAction;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  userId: { type: Number, required: true, index: true },
  action: { type: String, required: true, enum: ACTIVITY_ACTIONS },
  timestamp: { type: Date, default: Date.now },
  details: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String },
});

// TTL Index: elimina logs automáticamente después de 90 días
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
