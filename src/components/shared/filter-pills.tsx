"use client";

interface FilterPillsProps {
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}

export function FilterPills({ options, selected, onChange }: FilterPillsProps) {
  return (
    <div
      className="flex gap-[5px] overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shrink-0 cursor-pointer border transition-colors"
            style={{
              backgroundColor: isActive ? "var(--accent-custom)" : "transparent",
              color: isActive ? "#fff" : "var(--text-sub)",
              borderColor: isActive ? "var(--accent-custom)" : "var(--border-custom)",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
