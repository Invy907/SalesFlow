"use client";

export const STATUS_MAX_LENGTH = 16;

export function StatusAddInlineForm({
  placeholder,
  cancelLabel,
  addLabel,
  value,
  onChange,
  onCancel,
  onSubmit,
}: {
  placeholder: string;
  cancelLabel: string;
  addLabel: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const canSubmit = value.trim().length > 0;

  return (
    <div className="space-y-2 py-1">
      <input
        className="field w-full border-cyan-500 ring-1 ring-cyan-500"
        placeholder={placeholder}
        maxLength={STATUS_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoFocus
        onKeyDown={(event) => {
          if (event.key === "Enter" && canSubmit) {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <p className="text-right text-xs text-slate-400">
        {value.length}/{STATUS_MAX_LENGTH}
      </p>
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-[14px] text-slate-500 hover:text-slate-700"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded bg-[#94a3b8] px-5 py-1.5 text-[14px] font-medium text-white transition hover:bg-[#7c8da5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
