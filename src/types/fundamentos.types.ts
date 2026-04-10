import { Timestamp } from 'firebase/firestore';

export type FundamentosLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export interface FundamentosVideo {
  id: string;
  moduleId: string;
  subcategory: string;
  title: string;
  description: string;
  execution: string;
  commonErrors: string[];
  level: FundamentosLevel;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
  createdBy: string;
  isPublished: boolean;
  order: number;
  tags: string[];
}

export interface FundamentosModule {
  id: string;
  title: string;
  emoji: string;
  description: string;
  order: number;
  createdAt?: any;
  createdBy?: string;
  // Legacy static fields (kept for backward compat)
  content?: {
    title: string;
    description: string;
    execution: string;
    errors: string;
    combinations?: string;
  }[];
  videoTags?: string[];
}


export interface FundamentosUserProgress {
  userId: string;
  videoId: string;
  completed: boolean;
  watchedAt: Timestamp | any;
}
