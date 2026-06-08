'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TokenRegenButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function regen() {
    if (!confirm('Regenerate token? Your current subscription URL will stop working.')) return;
    setLoading(true);
    await fetch('/api/token/regen', { method: 'POST' });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={regen}
      disabled={loading}
      className="text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
    >
      {loading ? 'Regenerating…' : 'Regenerate token'}
    </button>
  );
}
