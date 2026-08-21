import { useState, useRef, useEffect } from 'react';
import { MemberName, MEMBERS, ParsedExpense } from '@/types';
import { parseExpenseMessage } from '@/lib/parseExpense';
import { formatCurrency, relativeDateLabel } from '@/lib/format';
import { X, Send, Sparkles, MessageCircle, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
  parsed?: ParsedExpense;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (p: ParsedExpense) => Promise<void>;
}

export default function AIChat({ open, onClose, onConfirm }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [confirming, setConfirming] = useState<ParsedExpense | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'ai',
          text: `Hi ${user?.name || ''}! Tell me about an expense in your own words. For example: "Bablu paid 1200 for groceries" or "I paid 500 for dinner yesterday".`,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, confirming]);

  if (!open) return null;

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);

    const parsed = parseExpenseMessage(text, user?.name);
    if (!parsed.confident) {
      const missingText = parsed.missing?.map((m) => m).join(' and ');
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: `I couldn't determine the ${missingText}. Could you clarify? For example, include who paid and the amount.`,
        },
      ]);
      return;
    }

    setConfirming(parsed);
  };

  const confirmAdd = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      await onConfirm(confirming);
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: `Added! ${confirming.paid_by} paid ${formatCurrency(confirming.amount)} for ${confirming.description}. Each member owes ${formatCurrency(confirming.amount / MEMBERS.length)}.`,
        },
      ]);
      setConfirming(null);
    } catch (err: any) {
      setMessages((m) => [...m, { role: 'ai', text: `Couldn't add that: ${err.message}` }]);
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  };

  const cancelConfirm = () => setConfirming(null);

  const editParsed = (field: keyof ParsedExpense, value: string) => {
    if (!confirming) return;
    setConfirming({
      ...confirming,
      [field]: field === 'amount' ? parseFloat(value) || 0 : value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">AI Expense Chat</h2>
              <p className="text-xs text-gray-400">Describe expenses in plain words</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white text-gray-700 rounded-bl-md shadow-sm border border-gray-100'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {confirming && (
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Add this expense?</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20 shrink-0">Amount</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                    <input
                      type="number"
                      value={confirming.amount}
                      onChange={(e) => editParsed('amount', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-gray-800 font-semibold"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20 shrink-0">Description</span>
                  <input
                    type="text"
                    value={confirming.description}
                    onChange={(e) => editParsed('description', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-gray-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20 shrink-0">Paid By</span>
                  <select
                    value={confirming.paid_by}
                    onChange={(e) => editParsed('paid_by', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-gray-800 bg-white"
                  >
                    {MEMBERS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20 shrink-0">Date</span>
                  <input
                    type="date"
                    value={confirming.date}
                    onChange={(e) => editParsed('date', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-gray-800"
                  />
                </div>
              </div>
              <p className="text-xs text-orange-600 font-medium bg-orange-50 rounded-lg p-2">
                Every member will be charged {formatCurrency(confirming.amount / MEMBERS.length)}.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={cancelConfirm}
                  disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAdd}
                  disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm flex items-center justify-center gap-1.5"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Add Expense
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !confirming && send()}
              placeholder="Type an expense..."
              disabled={!!confirming}
              className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-800 border border-transparent focus:border-blue-300"
            />
            <button
              onClick={send}
              disabled={!input.trim() || !!confirming}
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-full bg-white text-blue-600 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition border border-gray-100"
      title="AI Expense Chat"
      aria-label="AI Expense Chat"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  );
}
