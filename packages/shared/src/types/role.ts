export interface Role {
  id: string;
  entityId: string;
  name: string;
  permissions: string[];
}

export interface Officeholder {
  id: string;
  roleId: string;
  walletAddress: string;
  displayName: string;
  termStart: Date;
  termEnd: Date | null;
}