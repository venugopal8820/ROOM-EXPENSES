import { Expense, MemberName, MEMBERS, SettlementResult } from '@/types';
import { computeSettlement } from '@/lib/settlement';
import { formatCurrency } from '@/lib/format';
import { X, ArrowRight, TrendingUp, TrendingDown, Wallet, Users } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
}

export default function SettlementView({ open, onClose, expenses }: Props) {
  if (!open) return null;
  const s = computeSettlement(expenses);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">Settlement Summary</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Total */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-blue-600 text-xs font-semibold uppercase">
                <Wallet className="w-3.5 h-3.5" /> Total Expenses
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(s.totalExpenses)}</p>
            </div>
            <div className="bg-orange-50 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-orange-600 text-xs font-semibold uppercase">
                <Users className="w-3.5 h-3.5" /> Per Member
              </div>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(s.perMemberShare)}</p>
            </div>
          </div>

          {/* Per member breakdown */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Member Breakdown</h3>
            <div className="space-y-2">
              {MEMBERS.map((m) => {
                const paid = s.paidByMember[m];
                const net = s.netByMember[m];
                const owes = net < -0.005;
                const receives = net > 0.005;
                return (
                  <div key={m} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{m}</p>
                      <p className="text-xs text-gray-500">Paid {formatCurrency(paid)}</p>
                    </div>
                    <div className="text-right">
                      {owes ? (
                        <span className="text-sm font-semibold text-orange-600 flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" /> Owes {formatCurrency(-net)}
                        </span>
                      ) : receives ? (
                        <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Gets {formatCurrency(net)}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-400">Settled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transfers */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggested Settlement</h3>
            {s.transfers.length === 0 ? (
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-green-700 font-medium">All settled up! No transfers needed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {s.transfers.map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-orange-600">{t.from}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-green-600">{t.to}</span>
                    </div>
                    <span className="font-bold text-gray-800">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
