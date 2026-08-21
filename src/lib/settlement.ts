import { Expense, MemberName, MEMBERS, SettlementResult } from '@/types';

export function computeSettlement(expenses: Expense[]): SettlementResult {
  const active = expenses.filter((e) => !e.deleted_at);
  const totalExpenses = active.reduce((sum, e) => sum + e.amount, 0);
  const perMemberShare = totalExpenses / MEMBERS.length;

  const paidByMember = {} as Record<MemberName, number>;
  MEMBERS.forEach((m) => (paidByMember[m] = 0));
  active.forEach((e) => {
    paidByMember[e.paid_by] += e.amount;
  });

  const netByMember = {} as Record<MemberName, number>;
  MEMBERS.forEach((m) => {
    netByMember[m] = paidByMember[m] - perMemberShare;
  });

  // Greedy settlement: debtors pay receivers, minimizing transfers
  const creditors = MEMBERS.filter((m) => netByMember[m] > 0.005)
    .map((m) => ({ name: m, amount: netByMember[m] }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = MEMBERS.filter((m) => netByMember[m] < -0.005)
    .map((m) => ({ name: m, amount: -netByMember[m] }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SettlementResult['transfers'] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({
      from: debtors[i].name,
      to: creditors[j].name,
      amount: Math.round(pay * 100) / 100,
    });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < 0.005) i++;
    if (creditors[j].amount < 0.005) j++;
  }

  return { totalExpenses, perMemberShare, paidByMember, netByMember, transfers };
}
