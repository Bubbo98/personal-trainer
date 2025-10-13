// Dashboard Types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface Video {
  id: number;
  title: string;
  description: string;
  filePath: string;
  signedUrl?: string;
  duration: number;
  thumbnailPath?: string;
  category: string;
  createdAt: string;
  grantedAt: string;
  expiresAt?: string;
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