export interface LoginApiResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    permissions: number;
  };
}

export interface ProfileResponse {
  username: string;
  email: string;
  created_at: string;
  permissions: number;
  xp?: number;
  level?: number;
}