export type AuthRole = 'ADMIN' | 'CUSTOMER';

export type AuthUser = {
  id: string;
  email: string;
  role: AuthRole;
  name: string | null;
};
