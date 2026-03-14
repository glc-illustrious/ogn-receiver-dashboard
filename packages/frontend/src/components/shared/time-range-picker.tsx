interface TimeRangePickerProps {
  options: string[];
  value: string;
  onChange: (range: string) => void;
}

export function TimeRangePicker({ options, value, onChange }: TimeRangePickerProps) {
  return (
    <div className="flex gap-1 mb-5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
            value === opt
              ? 'bg-white/[0.08] text-white/90 border-white/[0.12]'
              : 'bg-transparent text-white/50 border-white/[0.08] hover:bg-white/[0.07] hover:text-white/90'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
