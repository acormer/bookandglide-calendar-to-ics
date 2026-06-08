'use client';

import { useState } from 'react';

export function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="text-xs rounded-md bg-gray-100 hover:bg-gray-200 px-3 py-1.5 font-medium transition-colors"
    >
      {copied ? 'Copied!' : 'Copy subscription URL'}
    </button>
  );
}
