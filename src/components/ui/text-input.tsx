"use client";

import {
  forwardRef,
  type CSSProperties,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

const baseInputStyle: CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  border: "none",
  backgroundColor: "var(--surface-container-low)",
  color: "var(--text-primary)",
  outline: "none",
};

const baseTextareaStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  border: "none",
  backgroundColor: "var(--surface-container-low)",
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
