// Admin Types
export interface Trainer {
  id: number;
  name: string;
  email?: string;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  isPaying: boolean;
  trainerId: number;
  trainerName?: string;
  createdAt: string;
  lastLogin?: string;
  videoCount: number;
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
  updatedAt: string;
  userCount: number;
  grantedAt?: string;
  expiresAt?: string;
}

export interface CreateUserForm {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isPaying: boolean;
  trainerId: number;
}

export interface UpdateUserForm {
  firstName?: string;
  lastName?: string;
  email?: string;
  isPaying?: boolean;
  trainerId?: number;
}

export interface CreateVideoForm {
  title: string;
  description: string;
  filePath: string;
  duration: number;
  category: string;
  thumbnailPath: string;
}

export interface Review {
  id: number;
  rating: number;
  title: string;
  comment: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  user: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
}

export interface AdminState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}