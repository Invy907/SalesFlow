type FlowWordmarkProps = {
  prefix: string;
  mark: string;
  accent: string;
  accentEnd: string;
  className?: string;
};

type FlowMarkProps = {
  mark: string;
  accent: string;
  accentEnd: string;
  className?: string;
};

export function FlowMark({
  mark,
  accent,
  accentEnd,
  className = "h-9 w-9 text-[12px]",
}: FlowMarkProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border font-extrabold tracking-tight text-white ${className}`}
      style={{
        background: `linear-gradient(135deg, ${accent}, ${accentEnd})`,
        borderColor: `${accent}26`,
      }}
    >
      {mark}
    </span>
  );
}

export function FlowWordmark({
  prefix,
  mark,
  accent,
  accentEnd,
  className = "",
}: FlowWordmarkProps) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <FlowMark mark={mark} accent={accent} accentEnd={accentEnd} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-lg font-bold tracking-tight text-slate-900">
          {prefix}
          <span style={{ color: accentEnd }}>Flow</span>
        </span>
      </span>
    </div>
  );
}
