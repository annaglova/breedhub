import React, {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Input, type InputProps } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Clock } from "lucide-react";

interface TimeInputProps extends Omit<InputProps, "value" | "onChange" | "type"> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  /** "HH:MM" string */
  value?: string;
  onValueChange?: (time: string) => void;
  showIcon?: boolean;
  use24Hour?: boolean;
  minTime?: string;
  maxTime?: string;
  /** Minutes step inside the minutes column (default 1) */
  step?: number;
  fieldClassName?: string;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseHHMM(value: string | undefined): { h: number | null; m: number | null } {
  if (!value) return { h: null, m: null };
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { h: null, m: null };
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return { h: null, m: null };
  return { h, m };
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      value,
      onValueChange,
      showIcon = true,
      use24Hour = true,
      minTime,
      maxTime,
      step = 1,
      className,
      fieldClassName,
      disabled,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || "");
    const triggerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const hoursColRef = useRef<HTMLDivElement>(null);
    const minutesColRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

    const { h: selectedH, m: selectedM } = useMemo(() => parseHHMM(inputValue), [inputValue]);

    const hours = use24Hour ? HOURS_24 : HOURS_12;
    const minutes = useMemo(() => {
      const out: number[] = [];
      for (let i = 0; i < 60; i += step) out.push(i);
      return out;
    }, [step]);

    // Sync from prop
    useEffect(() => {
      setInputValue(value || "");
    }, [value]);

    // Outside click
    useEffect(() => {
      if (!isOpen) return;
      const onMouseDown = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t)) return;
        if (popoverRef.current?.contains(t)) return;
        setIsOpen(false);
      };
      document.addEventListener("mousedown", onMouseDown);
      return () => document.removeEventListener("mousedown", onMouseDown);
    }, [isOpen]);

    // Close on outer scroll (but not on column scroll inside the popover)
    useEffect(() => {
      if (!isOpen) return;
      const onScroll = (e: Event) => {
        if (popoverRef.current?.contains(e.target as Node)) return;
        setIsOpen(false);
      };
      window.addEventListener("scroll", onScroll, true);
      return () => window.removeEventListener("scroll", onScroll, true);
    }, [isOpen]);

    const openPopover = useCallback(() => {
      if (disabled) return;
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const popHeight = 240;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < popHeight && rect.top > popHeight;
        setPos({
          top: openUp ? rect.top - popHeight - 4 : rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 160),
        });
      }
      setIsOpen(true);
    }, [disabled]);

    // Lists are tripled so scroll can wrap; on open, position the active item
    // of the *middle* copy at viewport center.
    useLayoutEffect(() => {
      if (!isOpen) return;
      const align = (col: HTMLDivElement | null) => {
        if (!col) return;
        const sectionH = col.scrollHeight / 3;
        const actives = col.querySelectorAll<HTMLButtonElement>("[data-active='true']");
        const center = col.clientHeight / 2;
        if (actives.length >= 2) {
          const mid = actives[1];
          col.scrollTop = mid.offsetTop - center + mid.offsetHeight / 2;
        } else {
          col.scrollTop = sectionH;
        }
      };
      align(hoursColRef.current);
      align(minutesColRef.current);
    }, [isOpen]);

    // Wrap-around: when user scrolls past either edge of the tripled list,
    // jump silently by one copy so the picker feels infinite.
    const handleColumnScroll = (
      e: React.UIEvent<HTMLDivElement>,
    ) => {
      const col = e.currentTarget;
      const sectionH = col.scrollHeight / 3;
      if (sectionH <= 0) return;
      if (col.scrollTop >= sectionH * 2) {
        col.scrollTop -= sectionH;
      } else if (col.scrollTop < sectionH) {
        col.scrollTop += sectionH;
      }
    };

    const emit = (h: number | null, m: number | null) => {
      if (h == null || m == null) return;
      const next = `${pad(h)}:${pad(m)}`;
      // Respect min/max
      if (minTime && next < minTime) return;
      if (maxTime && next > maxTime) return;
      setInputValue(next);
      onValueChange?.(next);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow only digits and a single colon, max length 5 ("HH:MM")
      let cleaned = raw.replace(/[^\d:]/g, "");
      const firstColon = cleaned.indexOf(":");
      if (firstColon !== -1) {
        cleaned =
          cleaned.slice(0, firstColon + 1) +
          cleaned.slice(firstColon + 1).replace(/:/g, "");
      }
      cleaned = cleaned.slice(0, 5);

      // Clamp partial digits as the user types so impossible values can't appear
      // - Hours: first digit 0-2; second digit 0-9 if first <2, else 0-3
      // - Minutes: first digit 0-5; second digit 0-9
      const colonIdx = cleaned.indexOf(":");
      const hPart = colonIdx === -1 ? cleaned : cleaned.slice(0, colonIdx);
      const mPart = colonIdx === -1 ? "" : cleaned.slice(colonIdx + 1);

      let hOut = hPart;
      if (hPart.length === 1 && Number(hPart) > 2) hOut = "";
      else if (hPart.length === 2) {
        const num = Number(hPart);
        if (Number.isNaN(num) || num > 23) hOut = hPart[0];
      }

      let mOut = mPart;
      if (mPart.length === 1 && Number(mPart) > 5) mOut = "";
      else if (mPart.length === 2) {
        const num = Number(mPart);
        if (Number.isNaN(num) || num > 59) mOut = mPart[0];
      }

      const next = colonIdx === -1 ? hOut : `${hOut}:${mOut}`;
      setInputValue(next);

      const re = /^([0-1]\d|2[0-3]):[0-5]\d$/;
      if (re.test(next)) onValueChange?.(next);
    };

    const handleBlur = () => {
      // Reject any partial / invalid value on blur — revert to last valid prop value
      const re = /^([0-1]\d|2[0-3]):[0-5]\d$/;
      if (!re.test(inputValue)) {
        setInputValue(value || "");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      else if (e.key === "Enter") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleHourPick = (h: number) => emit(h, selectedM ?? 0);
    const handleMinutePick = (m: number) => emit(selectedH ?? 0, m);

    const handleNowClick = () => {
      const now = new Date();
      emit(now.getHours(), now.getMinutes());
      setIsOpen(false);
    };

    const inputElement = (
      <div className="relative" ref={triggerRef}>
        <div className="relative">
          {showIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Clock className="h-4 w-4" />
            </div>
          )}
          <Input
            ref={ref}
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={openPopover}
            onClick={openPopover}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "HH:MM"}
            disabled={disabled}
            className={cn(showIcon && "pl-10", className)}
            {...props}
          />
        </div>

        {isOpen && !disabled &&
          createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[9999] bg-white border border-slate-200 rounded-md shadow-lg flex flex-col pt-4"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex">
                <div
                  ref={hoursColRef}
                  onScroll={handleColumnScroll}
                  className="flex-1 max-h-56 overflow-y-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  role="listbox"
                  aria-label="Hours"
                >
                  {[0, 1, 2].flatMap((copy) =>
                    hours.map((h) => {
                      const active = selectedH === h;
                      return (
                        <button
                          key={`${copy}-${h}`}
                          type="button"
                          data-active={active}
                          onClick={() => handleHourPick(h)}
                          className={cn(
                            "w-full px-3 py-1.5 text-center rounded-md focus:outline-none text-sm transition-colors",
                            active
                              ? "bg-primary-50 text-primary-700 font-bold hover:bg-primary-50"
                              : "hover:bg-slate-100 focus:bg-slate-100",
                          )}
                        >
                          {pad(h)}
                        </button>
                      );
                    }),
                  )}
                </div>
                <div
                  ref={minutesColRef}
                  onScroll={handleColumnScroll}
                  className="flex-1 max-h-56 overflow-y-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  role="listbox"
                  aria-label="Minutes"
                >
                  {[0, 1, 2].flatMap((copy) =>
                    minutes.map((m) => {
                      const active = selectedM === m;
                      return (
                        <button
                          key={`${copy}-${m}`}
                          type="button"
                          data-active={active}
                          onClick={() => handleMinutePick(m)}
                          className={cn(
                            "w-full px-3 py-1.5 text-center rounded-md focus:outline-none text-sm transition-colors",
                            active
                              ? "bg-primary-50 text-primary-700 font-bold hover:bg-primary-50"
                              : "hover:bg-slate-100 focus:bg-slate-100",
                          )}
                        >
                          {pad(m)}
                        </button>
                      );
                    }),
                  )}
                </div>
              </div>
              <div className="mt-2 px-4 mb-4">
                <button
                  type="button"
                  onClick={handleNowClick}
                  className="small-button w-full bg-primary-50 hover:bg-primary-100 focus-visible:bg-primary-200 text-primary rounded-md transition-all"
                >
                  Now
                </button>
              </div>
            </div>,
            document.body,
          )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <FormField
          label={label}
          error={error}
          helperText={!error ? helperText : undefined}
          required={required}
          className={fieldClassName}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  },
);

TimeInput.displayName = "TimeInput";
