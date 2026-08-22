"use client";

import { useState } from "react";

/**
 * Copies a link to the clipboard and says so.
 *
 * `path` rather than a whole URL: the page is rendered on the server, which
 * does not know which domain the reader is on (www.arum.solutions, the
 * vercel.app one, or localhost). Resolving it in the browser means the link
 * copied is always on the same site the person is already looking at.
 */
export function CopyLink({ path, label = "Copy link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (an insecure origin, or a browser
      // setting). Falling back to a prompt still lets them copy it by hand
      // rather than leaving the button silently doing nothing.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-stone-500"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
