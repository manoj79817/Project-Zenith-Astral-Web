import mongoose, { Schema, Document } from 'mongoose';

export interface ISatellite extends Document {
  noradId: number;
  name: string;
  tleLine1: string;
  tleLine2: string;
  category: string;
  lastUpdated: Date;
}

const SatelliteSchema = new Schema<ISatellite>(
  {
    noradId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    tleLine1: { type: String, required: true },
    tleLine2: { type: String, required: true },
    category: {
      type: String,
      enum: ['station', 'weather', 'communication', 'navigation', 'science', 'debris', 'other'],
      default: 'other',
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Satellite = mongoose.model<ISatellite>('Satellite', SatelliteSchema);
