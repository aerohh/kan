import type { ChangeEvent, KeyboardEvent, TextareaHTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";

interface QuickAddCardInputProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "onChange" | "onKeyDown" | "onSubmit"
  > {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  focusCount: number;
  placeholder?: string;
}

const QuickAddCardInput = forwardRef<HTMLTextAreaElement, QuickAddCardInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onCancel,
      focusCount,
      placeholder,
      disabled,
      className,
      ...rest
    },
    forwardedRef,
  ) => {
    const [isComposing, setIsComposing] = useState(false);
    const internalRef = useRef<HTMLTextAreaElement>(null);

    const textareaRef = (el: HTMLTextAreaElement | null) => {
      internalRef.current = el;
      if (typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (forwardedRef) {
        forwardedRef.current = el;
      }
    };

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
      },
      [onChange],
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        } else if (e.key === "Escape") {
          onCancel();
        }
      },
      [onSubmit, onCancel, isComposing],
    );

    useEffect(() => {
      if (internalRef.current) {
        requestAnimationFrame(() => {
          if (internalRef.current) {
            internalRef.current.focus();
            internalRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
      }
    });

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={placeholder ?? t`Card title...`}
        rows={1}
        disabled={disabled}
        className={
          className ??
          "block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm text-neutral-900 placeholder:text-light-700 focus:ring-0 dark:text-dark-1000 dark:placeholder:text-dark-700"
        }
        {...rest}
      />
    );
  },
);

QuickAddCardInput.displayName = "QuickAddCardInput";

export { QuickAddCardInput };
export type { QuickAddCardInputProps };
