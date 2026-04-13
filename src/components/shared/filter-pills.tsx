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
            className="rounded-full px-[10px] py-[4px] text-[11px] font-medium shrink-0 cursor-pointer border"
            style={{
              backgroundColor: isActive ? "var(--text-primary)" : "transparent",
              color: isActive ? "var(--card-bg)" : "var(--text-sub)",
              borderColor: isActive
                ? "var(--text-primary)"
                : "var(--border-custom)",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
