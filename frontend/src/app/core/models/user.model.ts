export interface User {
  _id: string;
  username: string;
  email: string;
  permissions: number;
  xp?: number;
  level?: number;
  google_id?: string;
}