import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { cn } from "@ui/lib/utils";

interface ContactJudgeTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for ContactJudgeTab.
 *
 * Mirrors the judge tree table: real headers (Competition / Inter.
 * judgment), then placeholder rows with chevron + indented name bars
 * to suggest the auto-expanded BIS root with children. Heights driven
 * by the same text-base scale the real component uses.
 */
export function ContactJudgeTabSkeleton({
  isFullscreen = false,
}: ContactJudgeTabSkeletonProps) {
  // Mimic the auto-expanded BIS root (level 0) + 4–6 group rows
  // (level 1) the real tab shows on first paint.
  const rowCount = isFullscreen ? 8 : 5;

  return (
    <div className="cursor-default" aria-busy="true" aria-live="polite">
      <div className="border border-border rounded-lg overflow-hidden">
        <Table className="text-base">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="py-3 pl-4 text-base">Competition</TableHead>
              <TableHead className="w-32 text-center py-3 text-base">
                Inter. judgment
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, index) => {
              // First row is the auto-expanded root (level 0), rest are
              // level-1 children.
              const level = index === 0 ? 0 : 1;
              const indentPx = level * 24;
              const isRoot = level === 0;

              return (
                <TableRow
                  key={`judge-${index}`}
                  className="hover:bg-muted/50"
                >
                  <TableCell className="py-2 text-base">
                    <div
                      className="flex items-center"
                      style={{ paddingLeft: indentPx }}
                    >
                      {/* Chevron placeholder — same 6x6 box as real */}
                      <span className="w-6 h-6 flex items-center justify-center mr-1">
                        <span className="size-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      </span>
                      {/* Competition name */}
                      <span
                        className={cn(
                          "relative",
                          isRoot && "font-medium",
                        )}
                      >
                        <span className="invisible">{"\u00A0"}</span>
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse",
                            isRoot ? "w-12" : "w-32",
                          )}
                        />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-32 text-center py-2 text-base">
                    {/* Empty centred cell — real uses Check/Minus icon
                        only when hasEntry; skeleton leaves it empty to
                        match the most-common state. */}
                    <span className="invisible">{"\u00A0"}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
