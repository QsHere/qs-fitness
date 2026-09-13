import { CALENDAR_LEGEND } from "@/lib/constants";

export function Legend() {
  return (
    <div className="flex gap-3 overflow-x-auto px-5 pb-1 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {CALENDAR_LEGEND.map((item) => (
        <div
          key={item.label}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-soft"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs font-medium text-ink-soft">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
