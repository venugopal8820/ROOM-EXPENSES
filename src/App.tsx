import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useExpenses, toggleTestMode, isTestingMode, clearTestData } from '@/lib/useExpenses';
import { computeSettlement } from '@/lib/settlement';
import { formatCurrency, todayStr } from '@/lib/format';
import { LocalExpense, MemberName, ParsedExpense, MEMBERS } from '@/types';
import LoginScreen from '@/components/LoginScreen';
import ExpenseList from '@/components/ExpenseList';
import ExpenseModal from '@/components/ExpenseModal';
import AIChat, { ChatButton } from '@/components/AIChat';
import SettlementView from '@/components/SettlementView';
import SyncBadge from '@/components/SyncBadge';
import { LogOut, Plus, BarChart3, FlaskConical, Home, X, AlertCircle } from 'lucide-react';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const {
    expenses,
    loading: dataLoading,
    syncState,
    addExpense,
    updateExpense,
    deleteExpense,
    syncNow,
  } = useExpenses();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocalExpense | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const testing = isTestingMode();

  const settlement = useMemo(() => computeSettlement(expenses), [expenses]);

  // Month-based summary for header
  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses]
  );
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (e: LocalExpense) => {
    setEditing(e);
    setModalOpen(true);
  };

  const handleSave = async (input: { description: string; amount: number; paid_by: MemberName; date: string }) => {
    if (editing) {
      await updateExpense(editing.id, input);
    } else {
      await addExpense(input);
    }
  };

  const handleAIConfirm = async (p: ParsedExpense) => {
    await addExpense({ description: p.description, amount: p.amount, paid_by: p.paid_by, date: p.date });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-gradient-to-b from-blue-600 to-blue-700 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-md mx-auto px-4 pt-4 pb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Room Expenses</h1>
                <p className="text-blue-100 text-xs">{monthLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SyncBadge
                online={syncState.online}
                syncing={syncState.syncing}
                pending={syncState.pending}
                failed={syncState.failed}
                onRetry={syncNow}
              />
              <button
                onClick={signOut}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Income/Expenses/Total card */}
          <div className="grid grid-cols-3 gap-2 mt-3 bg-white/10 rounded-2xl p-3 backdrop-blur">
            <div>
              <p className="text-blue-100 text-[10px] font-medium uppercase">Income</p>
              <p className="text-lg font-bold text-blue-50">{formatCurrency(0)}</p>
            </div>
            <div className="border-l border-white/20 pl-2">
              <p className="text-blue-100 text-[10px] font-medium uppercase">Expenses</p>
              <p className="text-lg font-bold text-orange-200">{formatCurrency(monthTotal)}</p>
            </div>
            <div className="border-l border-white/20 pl-2">
              <p className="text-blue-100 text-[10px] font-medium uppercase">Total</p>
              <p className="text-lg font-bold text-white">-{formatCurrency(monthTotal)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setSettlementOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Settlement
            </button>
            <span className="text-xs text-blue-100 ml-auto">Signed in as {user.name}</span>
          </div>
        </div>
      </header>

      {/* Test mode banner */}
      {testing && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 max-w-md mx-auto">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
            <FlaskConical className="w-4 h-4" />
            <span>Testing Mode — isolated mock data, real data is untouched.</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-md mx-auto px-4 py-4">
        {dataLoading ? (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <ExpenseList expenses={expenses} onEdit={openEdit} />
        )}
      </main>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-md mx-auto px-4 pb-5 pb-safe flex items-end justify-end gap-3">
          <button
            onClick={() => setTestPanelOpen(true)}
            className="pointer-events-auto w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 hover:text-amber-500 transition border border-gray-100"
            title="Testing Mode"
            aria-label="Testing Mode"
          >
            <FlaskConical className="w-5 h-5" />
          </button>
          <ChatButton onClick={() => setChatOpen(true)} />
          <button
            onClick={openAdd}
            className="pointer-events-auto w-14 h-14 rounded-full bg-orange-500 text-white shadow-xl flex items-center justify-center hover:bg-orange-600 hover:scale-105 active:scale-95 transition"
            title="Add Expense"
            aria-label="Add Expense"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      </div>

      <ExpenseModal
        open={modalOpen}
        editing={editing}
        defaultPaidBy={user.name}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={deleteExpense}
      />
      <AIChat open={chatOpen} onClose={() => setChatOpen(false)} onConfirm={handleAIConfirm} />
      <SettlementView open={settlementOpen} onClose={() => setSettlementOpen(false)} expenses={expenses} />

      {/* Testing mode panel */}
      {testPanelOpen && (
        <TestPanel
          onClose={() => setTestPanelOpen(false)}
          testing={testing}
          onToggle={() => toggleTestMode(!testing)}
          onClearTest={() => {
            clearTestData();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function TestPanel({
  onClose,
  testing,
  onToggle,
  onClearTest,
}: {
  onClose: () => void;
  testing: boolean;
  onToggle: () => void;
  onClearTest: () => void;
}) {
  const [seedAmount, setSeedAmount] = useState('500');
  const [seedDesc, setSeedDesc] = useState('Test expense');
  const [seedBy, setSeedBy] = useState<MemberName>('Venu');

  const seedTestData = () => {
    const existing = JSON.parse(localStorage.getItem('room-expenses-test-data') || '[]');
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const seeds = [
      { id: crypto.randomUUID(), description: 'Dinner', amount: 500, paid_by: 'Venu', date: today, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, _sync: 'synced' as const, _dirty: false },
      { id: crypto.randomUUID(), description: 'Groceries', amount: 1200, paid_by: 'Bablu', date: today, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, _sync: 'synced' as const, _dirty: false },
      { id: crypto.randomUUID(), description: 'Electricity Bill', amount: 900, paid_by: 'Satish', date: yesterday, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, _sync: 'synced' as const, _dirty: false },
      { id: crypto.randomUUID(), description: 'Test expense', amount: parseFloat(seedAmount) || 100, paid_by: seedBy, date: yesterday, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, _sync: 'pending' as const, _dirty: true },
    ];
    localStorage.setItem('room-expenses-test-data', JSON.stringify([...existing, ...seeds]));
    window.location.reload();
  };

  const simulateSyncFail = () => {
    // In test mode, flip all synced -> failed to simulate sync failure
    const data: LocalExpense[] = JSON.parse(localStorage.getItem('room-expenses-test-data') || '[]');
    const updated = data.map((e) => ({ ...e, _sync: 'failed' as const }));
    localStorage.setItem('room-expenses-test-data', JSON.stringify(updated));
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-gray-900">Testing Mode</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`rounded-xl p-3 mb-4 text-sm font-medium ${testing ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
          {testing ? (
            <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Test mode is ON. Using isolated data.</span>
          ) : (
            <span>Test mode is OFF. Using real data.</span>
          )}
        </div>

        <button
          onClick={onToggle}
          className={`w-full py-2.5 rounded-xl font-semibold text-sm transition mb-4 ${
            testing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {testing ? 'Exit Testing Mode' : 'Enable Testing Mode'}
        </button>

        {testing && (
          <div className="space-y-3">
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Seed Test Data</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  value={seedAmount}
                  onChange={(e) => setSeedAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  type="text"
                  value={seedDesc}
                  onChange={(e) => setSeedDesc(e.target.value)}
                  placeholder="Description"
                  className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <select
                value={seedBy}
                onChange={(e) => setSeedBy(e.target.value as MemberName)}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm mb-2 bg-white"
              >
                {MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={seedTestData} className="w-full py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold hover:bg-blue-100">
                Seed Sample Expenses
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Simulate</p>
              <button onClick={simulateSyncFail} className="w-full py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 mb-2">
                Simulate Sync Failure
              </button>
              <button onClick={onClearTest} className="w-full py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200">
                Clear All Test Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
