import { LocalExpense, MemberName } from '@/types';
import { formatCurrency, relativeDateLabel } from '@/lib/format';
import { ExpenseSyncDot } from './SyncBadge';
import { Pencil } from 'lucide-react';

interface Props {
  expenses: LocalExpense[];
  onEdit: (e: LocalExpense) => void;
}

export default function ExpenseList({ expenses, onEdit }: Props) {
  // Group by date
  const groups = new Map<string, LocalExpense[]>();
  for (const e of expenses) {
    const arr = groups.get(e.date) || [];
    arr.push(e);
    groups.set(e.date, arr);
  }
  const sortedDates = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto flex items-center justify-center mb-3">
          <span className="text-2xl">🧾</span>
        </div>
        <p className="text-gray-500 font-medium">No expenses yet</p>
        <p className="text-gray-400 text-sm mt-1">Tap + to add one, or use the AI chat.</p>
      </div>
    );
  }

  const memberColor: Record<MemberName, string> = {
    Venu: 'bg-blue-100 text-blue-700',
    Bantu: 'bg-green-100 text-green-700',
    Bablu: 'bg-purple-100 text-purple-700',
    Satish: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => {
        const items = groups.get(date)!;
        const dayTotal = items.reduce((s, e) => s + e.amount, 0);
        return (
          <div key={date}>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{relativeDateLabel(date)}</h3>
              <span className="text-xs font-semibold text-gray-400">{formatCurrency(dayTotal)}</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
              {items.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onEdit(e)}
                  className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 active:bg-gray-100 transition text-left group"
                >
                  <div className={`w-10 h-10 rounded-xl ${memberColor[e.paid_by]} flex items-center justify-center text-sm font-bold shrink-0`}>
                    {e.paid_by.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{e.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                      <span>{e.paid_by}</span>
                      <span>•</span>
                      <ExpenseSyncDot status={e._sync} />
                      <span className="text-gray-400">
                        {e._sync === 'synced' ? 'Synced' : e._sync === 'pending' ? 'Pending' : 'Failed'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="font-bold text-orange-600">{formatCurrency(e.amount)}</span>
                    <Pencil className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
