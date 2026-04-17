"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { updateAISettings, updateOrganizationSettings, updateUserProfile } from "@/actions/settings-actions";
import { type AIProvider, PROVIDER_INFO, DEFAULT_MODELS } from "@/lib/ai/provider";
import { LogoUpload } from "@/components/shared/logo-upload";

interface SettingsClientProps {
  org: {
    name: string;
    currency: string;
    logo: string | null;
    aiProvider: string | null;
    aiModel: string | null;
  };
  apiKeyStatus: {
    anthropic: boolean;
    openai: boolean;
    openrouter: boolean;
    minimax: boolean;
  };
  currentUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  users: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    createdAt: string;
  }[];
  emailAccount?: {
    id: string;
    email: string;
    provider: string;
    createdAt: string;
  } | null;
}

const PROVIDERS: AIProvider[] = ["anthropic", "openai", "openrouter", "minimax"];

export function SettingsClient({ org, currentUser, users, apiKeyStatus, emailAccount }: SettingsClientProps) {
  const router = useRouter();
  const [profileName, setProfileName] = useState(currentUser?.name ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(
    (org.aiProvider as AIProvider) ?? "anthropic"
  );
  const [model, setModel] = useState(org.aiModel ?? DEFAULT_MODELS[selectedProvider]);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  const [orgName, setOrgName] = useState(org.name);
  const [orgLogo, setOrgLogo] = useState<string | null>(org.logo ?? null);
  const [currency, setCurrency] = useState(org.currency);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  function handleProviderChange(provider: AIProvider) {
    setSelectedProvider(provider);
    setModel(DEFAULT_MODELS[provider]);
    setAiSaved(false);
  }

  async function handleSaveProfile() {
    if (!currentUser) return;
    setProfileSaving(true);
    setProfileSaved(false);
    const formData = new FormData();
    formData.set("name", profileName);
    await updateUserProfile(currentUser.id, formData);
    setProfileSaving(false);
    setProfileSaved(true);
    router.refresh();
  }

  async function handleSaveAI() {
    setAiSaving(true);
    setAiSaved(false);
    const formData = new FormData();
    formData.set("aiProvider", selectedProvider);
    formData.set("aiModel", model);
    await updateAISettings(formData);
    setAiSaving(false);
    setAiSaved(true);
    router.refresh();
  }

  async function handleSaveOrg() {
    setOrgSaving(true);
    setOrgSaved(false);
    const formData = new FormData();
    formData.set("name", orgName);
    formData.set("currency", currency);
    formData.set("logo", orgLogo ?? "");
    await updateOrganizationSettings(formData);
    setOrgSaving(false);
    setOrgSaved(true);
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6">
      {/* Profile section */}
      {currentUser && (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <h2
            className="text-[16px] font-bold"
            style={{ color: "var(--text-primary)", marginBottom: 4 }}
          >
            Your Profile
          </h2>
          <p className="text-[12px]" style={{ color: "var(--text-sub)", marginBottom: 16 }}>
            {currentUser.email}
          </p>
          <div style={{ marginBottom: 16 }}>
            <label
              className="block text-[12px] font-medium"
              style={{ color: "var(--text-sub)", marginBottom: 4 }}
            >
              Display name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => { setProfileName(e.target.value); setProfileSaved(false); }}
              placeholder="Your name"
              className="w-full rounded-[7px] px-[10px] py-[6px] text-[13px] outline-none"
              style={{
                border: "1px solid var(--border-custom)",
                backgroundColor: "var(--page-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div className="flex items-center gap-[8px]">
            <Button variant="primary" size="sm" onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save"}
            </Button>
            {profileSaved && (
              <span className="text-[12px]" style={{ color: "var(--green)" }}>Saved</span>
            )}
          </div>
        </Card>
      )}

      {/* Users section */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h2
          className="text-[16px] font-bold"
          style={{ color: "var(--text-primary)", marginBottom: 4 }}
        >
          Team Members
        </h2>
        <p className="text-[12px]" style={{ color: "var(--text-sub)", marginBottom: 16 }}>
          People with access to this organization
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border-custom)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "#EC4899",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {(u.name || u.email || "?").split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  {u.name || u.email?.split("@")[0] || "Unknown"}
                  {u.id === currentUser?.id && (
                    <span style={{ fontSize: 11, color: "var(--text-muted-custom)", marginLeft: 6 }}>you</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-sub)" }}>{u.email}</div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "var(--text-muted-custom)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {u.role}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-muted-custom)", marginTop: 12 }}>
          Anyone who signs in with a magic link is automatically added to this organization.
        </p>
      </Card>

      {/* AI Provider section */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h2
          className="text-[16px] font-bold"
          style={{ color: "var(--text-primary)", marginBottom: 4 }}
        >
          AI Provider
        </h2>
        <p
          className="text-[12px]"
          style={{ color: "var(--text-sub)", marginBottom: 16 }}
        >
          Select which AI model to use for pitch generation
        </p>

        {/* Provider cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px]" style={{ marginBottom: 16 }}>
          {PROVIDERS.map((provider) => {
            const isSelected = provider === selectedProvider;
            const hasKey = apiKeyStatus[provider];
            return (
              <button
                key={provider}
                type="button"
                onClick={() => handleProviderChange(provider)}
                className="flex items-start gap-[10px] rounded-[8px] p-3 text-left cursor-pointer transition-colors"
                style={{
                  border: `1.5px solid ${isSelected ? "var(--accent-custom)" : "var(--border-custom)"}`,
                  backgroundColor: isSelected ? "var(--accent-bg)" : "var(--page-bg)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {PROVIDER_INFO[provider].name}
                  </div>
                  <div
                    className="text-[11px] mt-[2px]"
                    style={{ color: "var(--text-sub)" }}
                  >
                    {isSelected && model ? model : DEFAULT_MODELS[provider]}
                  </div>
                </div>
                <div className="flex items-center gap-[4px] shrink-0 mt-[2px]">
                  <span
                    className="block rounded-full"
                    style={{
                      width: 7,
                      height: 7,
                      backgroundColor: hasKey ? "var(--green)" : "var(--red, #ef4444)",
                    }}
                  />
                  <span className="text-[10px]" style={{ color: "var(--text-muted-custom)" }}>
                    {hasKey ? "Key set" : "No key"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Model input */}
        <div style={{ marginBottom: 16 }}>
          <label
            className="block text-[12px] font-medium"
            style={{ color: "var(--text-sub)", marginBottom: 4 }}
          >
            Model
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setAiSaved(false);
            }}
            className="w-full rounded-[7px] px-[10px] py-[6px] text-[13px] outline-none"
            style={{
              border: "1px solid var(--border-custom)",
              backgroundColor: "var(--page-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="flex items-center gap-[8px]">
          <Button variant="primary" size="sm" onClick={handleSaveAI} disabled={aiSaving}>
            {aiSaving ? "Saving..." : "Save"}
          </Button>
          {aiSaved && (
            <span className="text-[12px]" style={{ color: "var(--green)" }}>
              Saved
            </span>
          )}
        </div>
      </Card>

      {/* Email Account section */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h2
          className="text-[16px] font-bold"
          style={{ color: "var(--text-primary)", marginBottom: 4 }}
        >
          Email Account
        </h2>
        <p
          className="text-[12px]"
          style={{ color: "var(--text-sub)", marginBottom: 16 }}
        >
          Connect Outlook or Gmail to send pitches directly
        </p>

        {emailAccount ? (
          <div>
            <div
              className="text-[13px] font-medium"
              style={{ color: "var(--text-primary)", marginBottom: 4 }}
            >
              {emailAccount.email}
            </div>
            <div className="text-[12px]" style={{ color: "var(--text-sub)", marginBottom: 2 }}>
              {emailAccount.provider === "google" ? "Google Gmail" : "Microsoft Outlook"}
            </div>
            <div className="text-[12px]" style={{ color: "var(--text-muted-custom)", marginBottom: 12 }}>
              Connected{" "}
              {new Date(emailAccount.createdAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              style={{ color: "var(--red, #ef4444)" }}
              onClick={async () => {
                await fetch("/api/email/disconnect", { method: "POST" });
                window.location.reload();
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <a
                href="/api/email/connect"
                className="inline-flex items-center justify-center rounded-[7px] font-medium whitespace-nowrap cursor-pointer transition-opacity hover:opacity-80 h-[30px] px-[10px] text-[12px] gap-[5px]"
                style={{
                  backgroundColor: "var(--accent-custom)",
                  color: "#fff",
                  border: "1px solid var(--accent-custom)",
                  textDecoration: "none",
                }}
              >
                <Icon name="mail" size={13} />
                Connect Outlook
              </a>
              <a
                href="/api/email/google/connect"
                className="inline-flex items-center justify-center rounded-[7px] font-medium whitespace-nowrap cursor-pointer transition-opacity hover:opacity-80 h-[30px] px-[10px] text-[12px] gap-[5px]"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-custom, #d1d5db)",
                  textDecoration: "none",
                }}
              >
                <Icon name="mail" size={13} />
                Connect Gmail
              </a>
            </div>
            <div className="text-[12px]" style={{ color: "var(--text-muted-custom)", marginTop: 8 }}>
              Pitches are sent from your connected mailbox.
            </div>
          </div>
        )}
      </Card>

      {/* Organization section */}
      <Card style={{ padding: 20 }}>
        <h2
          className="text-[16px] font-bold"
          style={{ color: "var(--text-primary)", marginBottom: 16 }}
        >
          Organization
        </h2>

        <div style={{ marginBottom: 16 }}>
          <LogoUpload
            currentLogo={orgLogo}
            onUpload={(url) => { setOrgLogo(url || null); setOrgSaved(false); }}
            label="Organization logo"
          />
        </div>

        <div className="flex flex-col gap-[12px]" style={{ marginBottom: 16 }}>
          <div>
            <label
              className="block text-[12px] font-medium"
              style={{ color: "var(--text-sub)", marginBottom: 4 }}
            >
              Organization name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                setOrgSaved(false);
              }}
              className="w-full rounded-[7px] px-[10px] py-[6px] text-[13px] outline-none"
              style={{
                border: "1px solid var(--border-custom)",
                backgroundColor: "var(--page-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-[12px] font-medium"
              style={{ color: "var(--text-sub)", marginBottom: 4 }}
            >
              Currency
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setOrgSaved(false);
              }}
              className="w-full rounded-[7px] px-[10px] py-[6px] text-[13px] outline-none"
              style={{
                border: "1px solid var(--border-custom)",
                backgroundColor: "var(--page-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-[8px]">
          <Button variant="primary" size="sm" onClick={handleSaveOrg} disabled={orgSaving}>
            {orgSaving ? "Saving..." : "Save"}
          </Button>
          {orgSaved && (
            <span className="text-[12px]" style={{ color: "var(--green)" }}>
              Saved
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
