/**
 * EditFormSkeleton — field-aware placeholder for EditFormTab while its lazy
 * chunk and/or data is loading. Mirrors the grouped layout that DynamicForm
 * will eventually render so cold load → real form swap looks structurally
 * continuous (same number of groups, same number of inputs, same horizontal/
 * vertical column arrangement).
 *
 * Eagerly loaded (not in any lazy chunk) so it can be used as a Suspense
 * fallback for EditFormTab — the fallback fires during chunk download when
 * the heavy form code isn't available yet.
 */
import { useFormFieldGrouping } from "@/components/edit/useFormFieldGrouping";

interface FieldLikeConfig {
  order?: number;
  sortOrder?: number;
  group?: string;
  groupLayout?: "horizontal" | "vertical";
  fullWidth?: string | boolean;
  hidden?: boolean;
}

interface EditFormSkeletonProps {
  fields?: Record<string, FieldLikeConfig> | null;
}

function FieldPlaceholder({ fullWidth }: { fullWidth?: boolean }) {
  // pt-7 reserves vertical space for the real Label (text-base + mb-1 ≈ 28px)
  // and pb-6 reserves space for the helper/error slot (h-5 + mt-1 = 24px) so
  // the skeleton occupies the same height as the rendered FormField and
  // doesn't shift when the real form swaps in.
  return (
    <div className={`pt-7 pb-6 ${fullWidth ? "sm:col-span-2" : ""}`}>
      <div className="h-9 w-full rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
    </div>
  );
}

function GroupSkeleton({
  label,
  layout,
  fields,
}: {
  label: string | null;
  layout: "horizontal" | "vertical";
  fields: Array<[string, FieldLikeConfig]>;
}) {
  const visibleFields = fields.filter(([, f]) => !f.hidden);
  if (visibleFields.length === 0) return null;

  const fullWidthFields = visibleFields.filter(
    ([, f]) => f.fullWidth === true || f.fullWidth === "true",
  );
  const regularFields = visibleFields.filter(
    ([, f]) => !(f.fullWidth === true || f.fullWidth === "true"),
  );

  return (
    <div className="mb-4">
      {label && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 px-4 sm:px-6 py-2 mb-4 h-[46px] animate-pulse" />
      )}

      {fullWidthFields.map(([fieldId]) => (
        <FieldPlaceholder key={fieldId} fullWidth />
      ))}

      {regularFields.length > 0 && (
        layout === "horizontal" ? (
          <div className="sm:grid sm:grid-cols-2 sm:gap-x-3 gap-y-1">
            {regularFields.map(([fieldId]) => (
              <FieldPlaceholder key={fieldId} />
            ))}
          </div>
        ) : (
          <div className="sm:grid sm:grid-cols-2 sm:gap-x-3">
            <div className="space-y-1">
              {regularFields
                .slice(0, Math.ceil(regularFields.length / 2))
                .map(([fieldId]) => (
                  <FieldPlaceholder key={fieldId} />
                ))}
            </div>
            <div className="space-y-1">
              {regularFields
                .slice(Math.ceil(regularFields.length / 2))
                .map(([fieldId]) => (
                  <FieldPlaceholder key={fieldId} />
                ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export function EditFormSkeleton({ fields }: EditFormSkeletonProps) {
  const groups = useFormFieldGrouping(fields);

  if (groups.length === 0) {
    return (
      <div>
        {Array.from({ length: 6 }).map((_, i) => (
          <FieldPlaceholder key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="px-1">
      {groups.map((group, idx) => (
        <GroupSkeleton
          key={group.label ?? `group-${idx}`}
          label={group.label}
          layout={group.layout}
          fields={group.fields as Array<[string, FieldLikeConfig]>}
        />
      ))}
    </div>
  );
}
