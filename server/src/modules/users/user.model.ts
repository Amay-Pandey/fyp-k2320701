import mongoose, { Schema } from 'mongoose';

export interface MatchHistoryEntry {
  opponent: string;
  teammate?: string;
  isWin: boolean;
  eloBefore: number;
  eloAfter: number;
  matchDate: Date;
}

export interface UserRecord {
  username: string;
  password: string;
  age?: number;
  level?: string;
  rating: number;
  rd: number;
  vol: number;
  matchHistory: MatchHistoryEntry[];
}

export type UserDocument = mongoose.HydratedDocument<UserRecord>;

const matchHistorySchema = new Schema<MatchHistoryEntry>({
  opponent: { type: String, required: true },
  teammate: String,
  isWin: { type: Boolean, required: true },
  eloBefore: { type: Number, required: true },
  eloAfter: { type: Number, required: true },
  matchDate: { type: Date, default: Date.now },
});

const userSchema = new Schema<UserRecord>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: Number,
  level: String,
  rating: { type: Number, default: 1500 },
  rd: { type: Number, default: 350 },
  vol: { type: Number, default: 0.06 },
  matchHistory: { type: [matchHistorySchema], default: [] },
});

const User = mongoose.model<UserRecord>('User', userSchema);
export default User;