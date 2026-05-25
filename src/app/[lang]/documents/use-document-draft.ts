"use client";

import { useEffect, useRef } from "react";

type DraftRecord = Record<string, string | boolean>;

function readDraft(storageKey: string): DraftRecord {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as DraftRecord) : {};
  } catch {
    return {};
  }
}

function writeDraft(storageKey: string, nextDraft: DraftRecord) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(nextDraft));
}

function collectDraft(root: HTMLElement) {
  const nextDraft: DraftRecord = {};
  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input[name], textarea[name], select[name]",
  );

  fields.forEach((field) => {
    if (field instanceof HTMLInputElement && field.type === "radio") {
      if (field.checked) {
        nextDraft[field.name] = field.value;
      }
      return;
    }

    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      nextDraft[field.name] = field.checked;
      return;
    }

    nextDraft[field.name] = field.value;
  });

  return nextDraft;
}

function applyDraft(root: HTMLElement, draft: DraftRecord) {
  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input[name], textarea[name], select[name]",
  );

  fields.forEach((field) => {
    const nextValue = draft[field.name];
    if (nextValue === undefined) {
      return;
    }

    if (field instanceof HTMLInputElement && field.type === "radio") {
      field.checked = String(nextValue) === field.value;
      return;
    }

    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      field.checked = Boolean(nextValue);
      return;
    }

    field.value = String(nextValue);
  });
}

export function readDocumentDraftValue(storageKey: string, field: string, fallback = "") {
  const draft = readDraft(storageKey);
  const value = draft[field];
  return typeof value === "string" ? value : fallback;
}

export function writeDocumentDraftValue(storageKey: string, field: string, value: string | boolean) {
  const draft = readDraft(storageKey);
  draft[field] = value;
  writeDraft(storageKey, draft);
}

export function useDocumentDraftPersistence(storageKey: string, watchKey: string) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    applyDraft(root, readDraft(storageKey));

    const syncDraft = () => {
      writeDraft(storageKey, {
        ...readDraft(storageKey),
        ...collectDraft(root),
      });
    };

    root.addEventListener("input", syncDraft);
    root.addEventListener("change", syncDraft);

    return () => {
      root.removeEventListener("input", syncDraft);
      root.removeEventListener("change", syncDraft);
    };
  }, [storageKey, watchKey]);

  return rootRef;
}
