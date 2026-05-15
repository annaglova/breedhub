import {
  ChevronRight,
  FilePlus2,
  HeartPulse,
  PawPrint,
  Sparkles,
} from "lucide-react";

type ActionId = "note" | "pet" | "litter" | "mating";

interface QuickActionsProps {
  onAction?: (id: ActionId) => void;
}

const ACTIONS: { id: ActionId; label: string; icon: typeof PawPrint }[] = [
  { id: "pet", label: "Add pet", icon: PawPrint },
  { id: "litter", label: "Add litter", icon: HeartPulse },
  { id: "note", label: "Add note", icon: FilePlus2 },
  { id: "mating", label: "Plan mating", icon: Sparkles },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <section
      aria-label="Quick actions"
      className="rounded-2xl border border-primary-100/70 bg-white p-5 shadow-[0_1px_1px_rgba(17,17,26,0.04),0_2px_6px_rgba(17,17,26,0.03)]"
    >
      <ul className="space-y-2">
        {ACTIONS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onAction?.(id)}
              className="group flex w-full items-center gap-3 rounded-xl border border-primary-50 bg-primary-50/40 px-3 py-2.5 text-left transition hover:border-primary-100 hover:bg-primary-50"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-white text-primary-700 shadow-[0_1px_1px_rgba(17,17,26,0.05),0_2px_6px_rgba(17,17,26,0.04)]">
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-sm font-bold text-slate-800">
                {label}
              </span>
              <ChevronRight className="size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-700" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
