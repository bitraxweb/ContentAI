"use client";

import { useState } from "react";

export function InviteLink({
  token,
}: {
  token: string;
}) {
  const [copied, setCopied] = useState(false);

  const relativePath = `/invite/${token}`;

  async function copyLink() {
    const url = `${window.location.origin}${relativePath}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <div className="space-y-3">
      <div className="break-all rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200">
        {relativePath}
      </div>

      <button
        type="button"
        onClick={copyLink}
        className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        {copied ? "Enlace copiado" : "Copiar enlace completo"}
      </button>
    </div>
  );
}