// Natural-language expense parser - runs client-side (no AI API needed).
// Understands: amount, description, paid_by (member name), date (today/yesterday/day-of-week).

import { MemberName, MEMBERS, ParsedExpense } from '@/types';
import { todayStr, toDateStr } from './format';

const NAME_ALIASES: Record<string, MemberName> = {
  venu: 'Venu',
  venkat: 'Venu',
  venugopal: 'Venu',
  bantu: 'Bantu',
  bablu: 'Bablu',
  satish: 'Satish',
  satya: 'Satish',
  i: 'Venu', // placeholder, overwritten by current user if provided
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseAmount(text: string): number | null {
  // Match "500", "₹500", "rs 500", "500 rupees", "1,200"
  const matches = text.match(/(?:₹|rs\.?|rupees?|inr)?\s*₹?\s*(\d[\d,]*\.?\d*)/i);
  if (!matches) return null;
  const num = parseFloat(matches[1].replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

function parseMember(text: string): MemberName | null {
  const lower = text.toLowerCase();
  for (const alias of Object.keys(NAME_ALIASES)) {
    const re = new RegExp(`\\b${alias}\\b`, 'i');
    if (re.test(lower)) return NAME_ALIASES[alias];
  }
  return null;
}

function parseDate(text: string): string {
  const lower = text.toLowerCase();
  if (/\btoday\b|tonight/.test(lower)) return todayStr();
  if (/\byesterday\b/.test(lower)) return toDateStr(new Date(Date.now() - 86400000));
  if (/\bday before yesterday\b/.test(lower)) return toDateStr(new Date(Date.now() - 2 * 86400000));

  // "last monday", "on friday"
  const dayMatch = lower.match(/(?:last\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (dayMatch) {
    const targetDay = DAY_NAMES.indexOf(dayMatch[1]);
    const today = new Date();
    let diff = today.getDay() - targetDay;
    if (lower.includes('last')) {
      if (diff <= 0) diff += 7;
    } else {
      if (diff < 0) diff += 7;
      else if (diff === 0) diff = 7; // "on friday" when today is friday => last friday
    }
    return toDateStr(new Date(today.getTime() - diff * 86400000));
  }

  // "2 days ago", "3 days back"
  const agoMatch = lower.match(/(\d+)\s+days?\s+(?:ago|back)/);
  if (agoMatch) {
    return toDateStr(new Date(Date.now() - parseInt(agoMatch[1]) * 86400000));
  }

  return todayStr();
}

function parseDescription(text: string, amount: number, member: MemberName | null): string {
  let desc = text;
  // Remove amount mentions
  desc = desc.replace(/(?:₹|rs\.?|rupees?|inr)?\s*₹?\s*\d[\d,]*\.?\d*/gi, '');
  // Remove member names
  if (member) {
    const re = new RegExp(`\\b${member}\\b`, 'gi');
    desc = desc.replace(re, '');
  }
  Object.keys(NAME_ALIASES).forEach((alias) => {
    if (alias === 'i') return;
    desc = desc.replace(new RegExp(`\\b${alias}\\b`, 'gi'), '');
  });
  // Remove filler words
  desc = desc.replace(/\b(paid|spent|for|on|bought|bought|the|a|an|of|yesterday|today|tonight|last|ago|back|day before)\b/gi, '');
  desc = desc.replace(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, '');
  desc = desc.replace(/\b(\d+)\s+days?\b/gi, '');
  // Clean up
  desc = desc.replace(/\s+/g, ' ').trim();
  // Capitalize first letter
  if (desc) desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  return desc || 'Expense';
}

export function parseExpenseMessage(
  text: string,
  currentUser?: MemberName
): ParsedExpense {
  const missing: string[] = [];
  const amount = parseAmount(text);
  if (amount === null) missing.push('amount');

  let member = parseMember(text);
  // Handle "I paid" - use current user
  if (!member || (member === 'Venu' && NAME_ALIASES['i'] === 'Venu' && /\bi\b/i.test(text) && currentUser)) {
    if (/\bI\b/i.test(text) && currentUser) {
      member = currentUser;
    }
  }

  if (!member) missing.push('who paid');

  const date = parseDate(text);
  const description = parseDescription(text, amount || 0, member);

  return {
    amount: amount || 0,
    description,
    paid_by: member || ('Venu' as MemberName),
    date,
    confident: missing.length === 0,
    missing,
  };
}
