export type EntityType =
  | 'individual'
  | 'corporation'
  | 'elected_office'
  | 'department'
  | 'government_agency'
  | 'presidential_office'
  | 'legislature';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  parentEntityId: string | null;
  walletAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}