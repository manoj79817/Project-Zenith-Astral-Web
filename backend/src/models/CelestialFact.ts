import mongoose, { Schema, Document } from 'mongoose';

export interface ICelestialFact extends Document {
  objectId: string;
  objectName: string;
  objectType: 'planet' | 'star' | 'constellation' | 'satellite' | 'moon' | 'sun';
  facts: string[];
  description: string;
  magnitude?: number;
  icon: string;
  color: string;
}

const CelestialFactSchema = new Schema<ICelestialFact>(
  {
    objectId: { type: String, required: true, unique: true, index: true },
    objectName: { type: String, required: true },
    objectType: {
      type: String,
      required: true,
      enum: ['planet', 'star', 'constellation', 'satellite', 'moon', 'sun'],
    },
    facts: [{ type: String }],
    description: { type: String, required: true },
    magnitude: { type: Number },
    icon: { type: String, default: '✨' },
    color: { type: String, default: '#ffffff' },
  },
  { timestamps: true }
);

export const CelestialFact = mongoose.model<ICelestialFact>('CelestialFact', CelestialFactSchema);
