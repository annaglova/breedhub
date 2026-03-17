/**
 * Shared component map for dynamic form field rendering.
 * Used by EditFormTab, EditChildRecordDialog, and FiltersDialog.
 */
import { PetPickerInput } from "@/components/edit/inputs/PetPickerInput";
import {
  CheckboxInput,
  DateInput,
  DateRangeInput,
  DropdownInput,
  EmailInput,
  FileInput,
  LookupInput,
  NumberInput,
  PasswordInput,
  RadioInput,
  SwitchInput,
  TextInput,
  TextareaInput,
  TimeInput,
} from "@ui/components/form-inputs";

export const FORM_COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  TextInput,
  TextareaInput,
  NumberInput,
  CheckboxInput,
  DateInput,
  DateRangeInput,
  TimeInput,
  DropdownInput,
  LookupInput,
  EmailInput,
  PasswordInput,
  FileInput,
  RadioInput,
  SwitchInput,
  PetPickerInput: PetPickerInput as any,
};
