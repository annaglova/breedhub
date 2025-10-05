import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ui/components/dialog';
import { Button } from '@ui/components/button';
import { Label } from '@ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import {
  TextInput,
  TextareaInput,
  NumberInput,
  CheckboxInput,
  DateInput,
  TimeInput,
  DropdownInput,
  LookupInput,
  EmailInput,
  PasswordInput,
  FileInput,
  RadioInput,
  SwitchInput,
} from '@ui/components/form-inputs';

export interface FilterConfig {
  id: string;
  label: string;
  placeholder?: string;
  type: 'select' | 'text' | 'date' | 'dateRange' | 'autocomplete';
  options?: { value: string; label: string }[];
  component?: React.ReactNode;
}

export interface FilterFieldConfig {
  id: string;
  displayName: string;
  component: string;
  placeholder?: string;
  fieldType: string;
  required?: boolean;
  operator?: string;
  value?: any;
  validation?: any;
  order: number;
}

interface FiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters?: FilterConfig[];
  filterFields?: FilterFieldConfig[];
  mainFilter?: FilterConfig;
  onApply?: (values: Record<string, any>) => void;
  onCancel?: () => void;
}

// Component mapping для динамічного рендерингу
const componentMap: Record<string, React.ComponentType<any>> = {
  TextInput,
  TextareaInput,
  NumberInput,
  CheckboxInput,
  DateInput,
  TimeInput,
  DropdownInput,
  LookupInput,
  EmailInput,
  PasswordInput,
  FileInput,
  RadioInput,
  SwitchInput,
};

export function FiltersDialog({
  open,
  onOpenChange,
  filters = [],
  filterFields = [],
  mainFilter,
  onApply,
  onCancel,
}: FiltersDialogProps) {
  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: collect form values and call onApply
    onApply?.({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select a filter</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleApply}>
          <div className="my-2 flex flex-col justify-center rounded-lg bg-modal-card-ground p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Dynamic Filter Fields from config */}
              {filterFields.map((field) => {
                const Component = componentMap[field.component];

                if (!Component) {
                  console.warn(`[FiltersDialog] Unknown component: ${field.component}`);
                  return null;
                }

                return (
                  <div key={field.id} className="mt-5 space-y-2">
                    <Component
                      label={field.displayName}
                      placeholder={field.placeholder}
                      required={field.required}
                      id={field.id}
                    />
                  </div>
                );
              })}

              {/* Legacy filters support (fallback) */}
              {filters.length > 0 && filterFields.length === 0 && (
                <>
                  {/* Main Filter */}
                  {mainFilter && !mainFilter.component && (
                    <div className="mt-5 space-y-2">
                      <Label htmlFor={mainFilter.id}>
                        {mainFilter.placeholder || mainFilter.label}
                      </Label>
                      <Select>
                        <SelectTrigger id={mainFilter.id}>
                          <SelectValue placeholder={mainFilter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {mainFilter.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Other Filters */}
                  {filters.map((filter) => (
                    <div key={filter.id} className="mt-5 space-y-2">
                      {filter.component ? (
                        // Custom component for complex filters
                        filter.component
                      ) : filter.type === 'select' ? (
                        <>
                          <Label htmlFor={filter.id}>
                            {filter.placeholder || filter.label}
                          </Label>
                          <Select>
                            <SelectTrigger id={filter.id}>
                              <SelectValue placeholder={filter.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {filter.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        // Placeholder for other input types
                        <div>
                          <Label htmlFor={filter.id}>{filter.label}</Label>
                          <div className="text-sm text-muted-foreground">
                            {filter.type} input - to be implemented
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="mt-10 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-50 dark:text-zinc-900 dark:bg-primary-300 hover:bg-primary-100 focus:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-200"
            >
              Apply filters
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
