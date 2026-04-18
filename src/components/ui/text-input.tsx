"use client";

import {
  forwardRef,
  type CSSProperties,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

const baseInputStyle: CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  fontSize: 13,
  borderRadius: 7,
  border: "1px solid var(--border-custom)",
  backgroundColor: "var(--page-bg)",
  color: "var(--text-primary)",
  outline: "none",
};

const baseTextareaStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  borderRadius: 7,
  border: "1px solid var(--border-custom)",
  backgroundColor: "var(--page-bg)",
  color: "var(--text-primary)",
  outline: "none",
  resize: "vertical",
  fontFamily: "inherit",
};

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ style, type = "text", ...props }, ref) {
    return <input ref={ref} type={type} style={{ ...baseInputStyle, ...style }} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ style, rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} style={{ ...baseTextareaStyle, ...style }} {...props} />;
  }
);

export { baseInputStyle as textInputBaseStyle };
