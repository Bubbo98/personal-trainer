// Dashboard Types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  trainerId?: number;
}

export interface TechniqueVideo {
  id: number;
  title: string;
  description: string;
  signedUrl: string | null;
  thumbnailKey?: string | null;
}

export interface Video {
  id: number;
  title: string;
  description: string;
  filePath: string;
  signedUrl?: string;
  duration: number;
  thumbnailKey?: string | null;
  category: string;
  createdAt: string;
  grantedAt?: string;
  addedAt?: string;
  expiresAt?: string;
  techniques?: TechniqueVideo[];
  groupId?: number | null;
  groupLabel?: string | null;
  /** Id of the video's assignment to a training day (training-days API only). */
  assignmentId?: number;
  /** Training-plan exercise this day video belongs to; null = extra video of the day. */
  exerciseId?: number | null;
}

export interface Category {
  name: string;
  videoCount: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface VideoState {
  videos: Video[];
  categories: Category[];
  selectedCategory: string | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

export interface Review {
  id: number;
  rating: number;
  title: string;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFormData {
  rating: number;
  title: string;
  comment: string;
}