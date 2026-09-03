export interface User {
  id: string;
  name: string;
  uuid: string;
  uuid_hash?: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}
