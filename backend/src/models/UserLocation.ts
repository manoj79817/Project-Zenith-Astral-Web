import mongoose, { Schema, Document } from 'mongoose';

export interface IUserLocation extends Document {
  name: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

const UserLocationSchema = new Schema<IUserLocation>(
  {
    name: { type: String, required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { timestamps: true }
);

export const UserLocation = mongoose.model<IUserLocation>('UserLocation', UserLocationSchema);
