import { useState, useEffect } from 'react';
import { LocalExpense, MemberName, MEMBERS } from '@/types';
import { todayStr } from '@/lib/format';
import { X, Save, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  editing?: LocalExpense | null;
  defaultPaidBy?: MemberName;
  onClose: () => void;
  onSave: (input: { description: string; amount: number; paid_by: MemberName; date: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function ExpenseModal({ open, editing, defaultPaidBy, onClose, onSave, onDelete }: Props) {
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<MemberName>(defaultPaidBy || 'Venu');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editing) {
        setDate(editing.date);
        setAmount(String(editing.amount));
        setPaidBy(editing.paid_by);
        setDescription(editing.description);
      } else {
        setDate(todayStr());
        setAmount('');
        setPaidBy(defaultPaidBy || 'Venu');
        setDescription('');
      }
      setError('');
    }
  }, [open, editing, defaultPaidBy]);

  if (!open) return null;

  const perMember = (parseFloat(amount) || 0) / MEMBERS.length;

  const save = async () => {
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      setError('Enter a description.');
      return;
    }
    setBusy(true);
    try {
      await onSave({ description: description.trim(), amount: amt, paid_by: paidBy, date });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!editing || !onDelete) return;
    setBusy(true);
    try {
      await onDelete(editing.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-gray-800 text-lg font-semibold"
              />
            </div>
            {perMember > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                Each member's share: <span className="font-semibold text-gray-700">₹{perMember.toFixed(2)}</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid By</label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {MEMBERS.map((m) => (
                <button
                  key={m}
                  onClick={() => setPaidBy(m)}
                  className={`py-2 rounded-xl text-sm font-medium transition ${
                    paidBy === m
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Groceries, Electricity bill"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {editing && onDelete && (
            <button
              onClick={del}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {busy ? 'Saving...' : editing ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
