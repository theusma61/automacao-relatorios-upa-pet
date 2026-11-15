import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 bg-[#0D5C56] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#00D296]/40 flex items-center gap-2.5 text-xs font-bold">
      <CheckCircle2 className="w-4 h-4 text-[#00D296] shrink-0" />
      <span>{message}</span>
    </div>
  );
}
