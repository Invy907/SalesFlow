"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native modal semantics provide focus containment, Escape, and focus restoration. */
export function ModalDialog({ label, onClose, children, feedback, className = "" }: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  feedback?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      // React may remove the dialog before effect cleanup, so restore explicitly.
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className={`no-print m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] min-w-0 overflow-y-auto rounded-2xl border-0 p-0 [overflow-wrap:anywhere] shadow-2xl backdrop:bg-slate-900/40 ${className}`}
    >
      {children}
      {feedback ? <p role="status" className="sticky bottom-0 border-t border-slate-200 bg-slate-900 px-6 py-3 text-sm text-white">{feedback}</p> : null}
    </dialog>
  );
}
