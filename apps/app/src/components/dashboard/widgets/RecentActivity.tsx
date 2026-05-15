import {
  FileText,
  HeartPulse,
  MessageCircle,
  PawPrint,
  Users,
} from "lucide-react";
import type { ActivityEntry } from "../mock-data";

interface RecentActivityProps {
  entries: ActivityEntry[];
}

const KIND_ICON = {
  note: FileText,
  pet: PawPrint,
  litter: Users,
  health: HeartPulse,
  message: MessageCircle,
} as const;

function formatRelative(when: Date): string {
  const diffMs = Date.now() - when.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? "" : "s"} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  if (diffD < 7) return `${diffD} days ago`;
  return when.toLocaleDateString();
}

export function RecentActivity({ entries }: RecentActivityProps) {
  return (
    <section
      aria-label="Recent activity"
      className="rounded-2xl border border-primary-100/70 bg-white p-5 shadow-[0_1px_1px_rgba(17,17,26,0.04),0_2px_6px_rgba(17,17,26,0.03)]"
    >
      <ol className="space-y-4">
        {entries.map((entry, idx) => {
          const Icon = KIND_ICON[entry.kind];
          const isLast = idx === entries.length - 1;
          return (
            <li key={entry.id} className="relative flex gap-3">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[18px] top-9 h-[calc(100%-12px)] w-px bg-primary-100"
                />
              )}
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {formatRelative(entry.occurredAt)}
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {entry.title}
                </p>
                {entry.body && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {entry.body}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
