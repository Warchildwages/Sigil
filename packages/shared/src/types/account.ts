/**
 * Account Dashboard Types
 *
 * Used by /api/account/dashboard and the /account page.
 */

export interface AccountDashboardData {
  entityId: string;
  entityName: string;
  entityType: string;
  walletAddress: string | null;
  documentCount: number;
  attestationCount: number;
  recentDocuments: DocumentSummary[];
}

export interface DocumentSummary {
  id: string;
  title: string;
  status: string;
  attestedAt: string | null;
}
