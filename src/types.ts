export type MemberName = 'Venu' | 'Bantu' | 'Bablu' | 'Satish';

export const MEMBERS: MemberName[] = ['Venu', 'Bantu', 'Bablu', 'Satish'];

export interface Member {
  id: string;
  name: MemberName;
  username: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paid_by: MemberName;
  date: string; // YYYY-MM-DD
  created_at: string; // ISO
  updated_at: string; // ISO
  deleted_at: string | null;
}

export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface LocalExpense extends Expense {
  _sync: SyncStatus;
  _dirty: boolean; // local changes not yet synced
}

export interface SettlementResult {
  totalExpenses: number;
  perMemberShare: number;
  paidByMember: Record<MemberName, number>;
  netByMember: Record<MemberName, number>; // positive = should receive, negative = owes
  transfers: { from: MemberName; to: MemberName; amount: number }[];
}

export interface ParsedExpense {
  amount: number;
  description: string;
  paid_by: MemberName;
  date: string; // YYYY-MM-DD
  confident: boolean;
  missing?: string[];
}
