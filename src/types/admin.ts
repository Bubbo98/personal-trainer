// Admin Types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  videoCount: number;
}

export interface Video {
  id: number;
  title: string;
  description: string;
  filePath: string;
  duration: number;
  thumbnailPath?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

export interface CreateUserForm {
  username: string;
  firstName: string;
  lastName: string;
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