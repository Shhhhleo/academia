"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, X } from "lucide-react";

const inputVariants = cva(
  "flex w-full rounded-ele border border-border bg-field px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm/2 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "border-border",
        destructive: "border-destructive focus-visible:ring-destructive",
        ghost:
          "border-transparent bg-accent focus-visible:bg-field focus-visible:border-border",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-8 px-2 py-1 text-xs",
        lg: "h-10 px-4 py-2",
        xl: "h-12 px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = "text",
      leftIcon,
      rightIcon,
      error,
      clearable,
      onClear,
      value,
      onChange,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");

    // Create internal ref if no ref is provided
    const internalRef = React.useRef<HTMLInputElement>(null);
    const inputRef = ref || internalRef;

    const inputVariant = error ? "destructive" : variant;
    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;

    // Determine if this is a controlled component
    const isControlled = value !== undefined;
    const inputValue = isControlled ? value : internalValue;

    const showClearButton = clearable && inputValue && String(inputValue).length > 0;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const handleClear = () => {
      const inputElement = typeof inputRef === "function" ? null : inputRef?.current;
      if (inputElement) {
        inputElement.value = "";
        inputElement.focus();
      }

      if (!isControlled) {
        setInternalValue("");
      }

      onClear?.();

      if (onChange) {
        const syntheticEvent = {
          target: { value: "" },
          currentTarget: { value: "" },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0 z-10"
          >
            {leftIcon}
          </div>
        )}

        <input
          type={actualType}
          className={cn(
            inputVariants({ variant: inputVariant, size, className }),
            leftIcon && "pl-10",
            (rightIcon || isPassword || showClearButton) && "pr-10",
          )}
          ref={inputRef}
          {...(isControlled ? { value: inputValue } : { defaultValue })}
          aria-invalid={error || props["aria-invalid"] || undefined}
          onChange={handleInputChange}
          {...props}
        />

        {(rightIcon || isPassword || showClearButton) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {rightIcon && (
              <div aria-hidden="true" className="text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
                {rightIcon}
              </div>
            )}

            {showClearButton && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear"
                className="text-muted-foreground hover:text-foreground transition-colors [&_svg]:size-4 [&_svg]:shrink-0"
                tabIndex={-1}
              >
                <X aria-hidden="true" />
              </button>
            )}

            {isPassword && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="text-muted-foreground hover:text-foreground transition-colors [&_svg]:size-4 [&_svg]:shrink-0"
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
