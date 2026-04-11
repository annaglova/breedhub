/**
 * FormDialog — shared dialog shell for form modals.
 *
 * Handles: dialog open/close, portal dropdown fix, button row (Cancel/Submit).
 * Used by: EditChildRecordDialog, FiltersDialog.
 *
 * EditFormTab doesn't use this — it's a tab, not a dialog.
 */
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  hideSubmit?: boolean;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  children,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitDisabled = false,
  hideSubmit = false,
}: FormDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-portal-dropdown]")) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-portal-dropdown]")) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="modal-card">
            {children}
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className={`small-button bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300${hideSubmit ? " col-start-2" : ""}`}
            >
              {cancelLabel}
            </Button>
            {!hideSubmit && (
              <Button
                type="submit"
                disabled={submitDisabled}
                className="small-button bg-primary-50 dark:bg-primary-300 hover:bg-primary-100 focus:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-200 text-primary dark:text-zinc-900"
              >
                {submitLabel}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
