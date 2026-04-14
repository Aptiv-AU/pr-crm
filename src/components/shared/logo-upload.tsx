"use client";

import { useRef, useState } from "react";

interface LogoUploadProps {
  currentLogo: string | null;
  onUpload: (url: string) => void;
  label?: string;
}

export function LogoUpload({ currentLogo, onUpload, label = "Logo" }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        onUpload(data.url);
      }
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  if (uploading) {
    return (
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-sub)",
            marginBottom: 6,
            display: "block",
          }}
        >
          {label}
        </label>
        <div
          style={{
            height: 64,
            borderRadius: 10,
            border: "1px dashed var(--border-custom)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "var(--text-muted-custom)",
          }}
        >
          Uploading...
        </div>
      </div>
    );
  }

  if (currentLogo) {
    return (
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-sub)",
            marginBottom: 6,
            display: "block",
          }}
        >
          {label}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={currentLogo}
            alt="Logo"
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              objectFit: "cover",
              border: "1px solid var(--border-custom)",
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--accent-custom)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => onUpload("")}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-muted-custom)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  return (
    <div>
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-sub)",
          marginBottom: 6,
          display: "block",
        }}
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          width: "100%",
          height: 64,
          borderRadius: 10,
          border: "1px dashed var(--border-custom)",
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--text-muted-custom)",
          cursor: "pointer",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 3v7M5 5.5L8 3l3 2.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 11v2h10v-2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Upload logo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
