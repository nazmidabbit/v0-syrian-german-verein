export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  is_verified: boolean;
  verification_token: string;
  created_at: string;
}
