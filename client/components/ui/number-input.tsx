"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

export interface NumberInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "onFocus" | "onBlur"
  > {
  value?: number | string | null;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
}

export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  integer,
  className,
  ...rest
}: NumberInputProps) {
  const lastSyncedRef = useRef<number | string | null | undefined>(value);
  const [text, setText] = useState<string>(
    value == null || value === "" ? "" : String(value)
  );

  useEffect(() => {
    if (value !== lastSyncedRef.current) {
      lastSyncedRef.current = value;
      setText(value == null || value === "" ? "" : String(value));
    }
  }, [value]);

  const handleChange = (raw: string) => {
    if (raw === "") {
      setText("");
      return;
    }
    let n = Number(raw);
    if (!Number.isFinite(n)) {
      return;
    }
    if (integer) {
      n = Math.floor(n);
    }
    if (min != null && n < min) {
      n = min;
    }
    if (max != null && n > max) {
      n = max;
    }
    setText(String(n));
    lastSyncedRef.current = n;
    onValueChange?.(n);
  };

  return (
    <Input
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      min={min}
      max={max}
      className={className}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => handleChange(e.target.value)}
      {...rest}
    />
  );
}
