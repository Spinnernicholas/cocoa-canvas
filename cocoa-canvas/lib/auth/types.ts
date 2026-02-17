// Authentication types

export interface AuthPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface UserWithPassword {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  isActive: boolean;
}
