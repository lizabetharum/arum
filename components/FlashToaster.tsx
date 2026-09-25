"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { Flash } from "@/lib/flash";

// A page can re-render with the same flash before the cleared cookie reaches
// the server, so each message is shown once by id, not once per render.
const shown = new Set<string>();

export function FlashToaster({ flash }: { flash: Flash | null }) {
  useEffect(() => {
    if (!flash || shown.has(flash.id)) return;
    shown.add(flash.id);
    (flash.kind === "error" ? toast.error : toast.success)(flash.message);
    document.cookie = "flash=; path=/; max-age=0; samesite=lax";
  }, [flash]);

  return <Toaster position="bottom-right" />;
}
