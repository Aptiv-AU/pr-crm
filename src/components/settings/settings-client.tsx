"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { TextInput } from "@/components/ui/text-input";
import { Badge } from "@/components/ui/badge";
import {
  updateAISettings,
  updateOrganizationSettings,
  updateUserProfile,
} from "@/actions/settings-actions";
import { type AIProvider, PROVIDER_INFO, DEFAULT_MODELS } from "@/lib/ai/provider";
import { LogoUpload } from "@/components/shared/logo-upload";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { SettingsRow } from "./settings-row";

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

const TEAL = "#006C49";
const PROVIDERS: AIProvider[] = ["anthropic", "openai", "openrouter", "minimax"];

type SectionKey =
  | "profile"
  | "workspace"
  | "team"
  | "ai"
  | "email"
  | "advanced";

interface SectionDef {
  k: SectionKey;
  label: string;
  icon: IconName;
}

const SECTIONS: SectionDef[] = [
  { k: "profile", label: "Profile", icon: "contacts" },
  { k: "workspace", label: "Workspace", icon: "workspace" },
  { k: "team", label: "Team", icon: "suppliers" },
  { k: "ai", label: "AI Provider", icon: "sparkle" },
  { k: "email", label: "Email", icon: "mail" },
  { k: "advanced", label: "Advanced", icon: "settings" },
];

export function SettingsClient({
  org,
  currentUser,
  users,
  apiKeyStatus,
  emailAccount,
}: SettingsClientProps) {
  const router = useRouter();
  const [section, setSection] = useState<SectionKey>("profile");

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
    await updateUserProfile(formData);
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

  const userInitials =
    (currentUser?.name || currentUser?.email || "?")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="You"
        title="Settings"
        subtitle="Workspace, team and the way things look."
        meta={[
          { label: "Team", value: String(users.length) },
          { label: "Currency", value: org.currency },
          {
            label: "Email",
            value: emailAccount ? "Connected" : "Not connected",
          },
        ]}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <nav
          aria-label="Settings sections"
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {SECTIONS.map((s) => {
            const on = section === s.k;
            return (
              <button
                key={s.k}
                type="button"
                onClick={() => setSection(s.k)}
                aria-current={on ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: on ? "var(--active-bg)" : "transparent",
                  color: on ? TEAL : "var(--text-sub)",
                  fontSize: 13,
                  fontWeight: on ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <Icon
                  name={s.icon}
                  size={14}
                  color={on ? TEAL : "var(--text-sub)"}
                />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {section === "profile" && currentUser && (
            <Card style={{ padding: 0 }}>
              <div
                style={{
                  padding: "20px 20px 16px",
                  borderBottom: "1px solid var(--border-custom)",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: TEAL,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {userInitials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {currentUser.name || "Unnamed"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-sub)",
                      fontStyle: "italic",
                      fontWeight: 500,
                    }}
                  >
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <SettingsRow
                label="Display name"
                hint="Shown across the app and on outgoing pitches."
              >
                <TextInput
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value);
                    setProfileSaved(false);
                  }}
                  placeholder="Your name"
                  style={{ width: 240 }}
                />
              </SettingsRow>
              <SettingsRow label="Email" hint="Sign-in address for magic links." last>
                <span style={{ fontSize: 13, color: "var(--text-sub)" }}>
                  {currentUser.email}
                </span>
              </SettingsRow>

              <SaveBar
                saving={profileSaving}
                saved={profileSaved}
                onSave={handleSaveProfile}
              />
            </Card>
          )}

          {section === "workspace" && (
            <>
              <Card style={{ padding: 0 }}>
                <div
                  style={{
                    padding: "20px 20px 16px",
                    borderBottom: "1px solid var(--border-custom)",
                  }}
                >
                  <LogoUpload
                    currentLogo={orgLogo}
                    onUpload={(url) => {
                      setOrgLogo(url || null);
                      setOrgSaved(false);
                    }}
                    label="Organization logo"
                  />
                </div>
                <SettingsRow
                  label="Workspace name"
                  hint="Shown on invoices, exports and the login screen."
                >
                  <TextInput
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      setOrgSaved(false);
                    }}
                    style={{ width: 240 }}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Currency"
                  hint="AUD is the default for Australian workspaces."
                  last
                >
                  <TextInput
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setOrgSaved(false);
                    }}
                    style={{ width: 180 }}
                  />
                </SettingsRow>
                <SaveBar saving={orgSaving} saved={orgSaved} onSave={handleSaveOrg} />
              </Card>
            </>
          )}

          {section === "team" && (
            <Card style={{ padding: 0 }}>
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border-custom)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "var(--text-muted-custom)",
                    }}
                  >
                    Team members
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-sub)",
                      marginTop: 4,
                      fontStyle: "italic",
                      fontWeight: 500,
                    }}
                  >
                    Anyone who signs in with a magic link joins this workspace.
                  </div>
                </div>
                <Badge variant="cool">
                  {users.length} {users.length === 1 ? "member" : "members"}
                </Badge>
              </div>
              {users.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 20px",
                    borderBottom:
                      i === users.length - 1
                        ? "none"
                        : "1px solid var(--border-custom)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: TEAL,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {(u.name || u.email || "?")
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {u.name || u.email?.split("@")[0] || "Unknown"}
                      {u.id === currentUser?.id && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted-custom)",
                            marginLeft: 8,
                            fontWeight: 500,
                          }}
                        >
                          you
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-sub)",
                        fontWeight: 500,
                      }}
                    >
                      {u.email}
                    </div>
                  </div>
                  <Badge variant={u.role === "admin" ? "accent" : "cool"}>
                    {u.role}
                  </Badge>
                </div>
              ))}
            </Card>
          )}

          {section === "ai" && (
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "18px 20px" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--text-muted-custom)",
                    marginBottom: 12,
                  }}
                >
                  Provider
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {PROVIDERS.map((provider) => {
                    const isSelected = provider === selectedProvider;
                    const hasKey = apiKeyStatus[provider];
                    return (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => handleProviderChange(provider)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          borderRadius: 10,
                          padding: 12,
                          textAlign: "left",
                          cursor: "pointer",
                          border: `1.5px solid ${
                            isSelected ? "var(--accent-custom)" : "var(--border-custom)"
                          }`,
                          background: isSelected
                            ? "var(--accent-bg)"
                            : "var(--page-bg)",
                          transition: "background-color 160ms ease",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "var(--text-primary)",
                            }}
                          >
                            {PROVIDER_INFO[provider].name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-sub)",
                              marginTop: 2,
                              fontWeight: 500,
                            }}
                          >
                            {isSelected && model ? model : DEFAULT_MODELS[provider]}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 999,
                              background: hasKey
                                ? "var(--green)"
                                : "var(--red, #ef4444)",
                            }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted-custom)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {hasKey ? "Key set" : "No key"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-custom)" }} />

              <SettingsRow
                label="Model"
                hint="Override the default model for this provider."
                last
              >
                <TextInput
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setAiSaved(false);
                  }}
                  style={{ width: 260 }}
                />
              </SettingsRow>

              <SaveBar saving={aiSaving} saved={aiSaved} onSave={handleSaveAI} />
            </Card>
          )}

          {section === "email" && (
            <Card style={{ padding: 0 }}>
              {emailAccount ? (
                <>
                  <SettingsRow
                    label={emailAccount.email}
                    hint={
                      emailAccount.provider === "google"
                        ? "Google Gmail — pitches sent from this mailbox."
                        : "Microsoft Outlook — pitches sent from this mailbox."
                    }
                  >
                    <Badge variant="active">Connected</Badge>
                  </SettingsRow>
                  <SettingsRow
                    label="Connected on"
                    hint="Disconnecting will stop outbound sends."
                    last
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                        {new Date(emailAccount.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={async () => {
                          await fetch("/api/email/disconnect", { method: "POST" });
                          window.location.reload();
                        }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </SettingsRow>
                </>
              ) : (
                <>
                  <SettingsRow
                    label="Microsoft Outlook"
                    hint="Send pitches from an Outlook or Microsoft 365 mailbox."
                  >
                    <a
                      href="/api/email/connect"
                      className="inline-flex items-center justify-center rounded-full whitespace-nowrap cursor-pointer transition-opacity hover:opacity-90 h-[32px] px-4 text-[12px] font-bold gap-[5px]"
                      style={{
                        background: "var(--accent-custom)",
                        color: "#fff",
                        textDecoration: "none",
                      }}
                    >
                      <Icon name="mail" size={13} />
                      Connect Outlook
                    </a>
                  </SettingsRow>
                  <SettingsRow
                    label="Google Gmail"
                    hint="Send pitches from a Gmail or Google Workspace mailbox."
                    last
                  >
                    <a
                      href="/api/email/google/connect"
                      className="inline-flex items-center justify-center rounded-full whitespace-nowrap cursor-pointer transition-opacity hover:opacity-90 h-[32px] px-4 text-[12px] font-bold gap-[5px]"
                      style={{
                        background: "transparent",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-custom)",
                        textDecoration: "none",
                      }}
                    >
                      <Icon name="mail" size={13} />
                      Connect Gmail
                    </a>
                  </SettingsRow>
                </>
              )}
            </Card>
          )}

          {section === "advanced" && (
            <Card style={{ padding: 0 }}>
              <AdvancedLink
                href="/settings/email"
                label="Email style"
                hint="Signature, quote formatting and other send-time defaults."
              />
              <AdvancedLink
                href="/settings/templates"
                label="Pitch templates"
                hint="Reusable structures for common campaign types."
              />
              <AdvancedLink
                href="/settings/suppressions"
                label="Suppressions"
                hint="Email addresses and domains excluded from outreach."
                last
              />
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function SaveBar({
  saving,
  saved,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div
      style={{
        padding: "14px 20px",
        borderTop: "1px solid var(--border-custom)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--surface-container-low)",
      }}
    >
      <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save changes"}
      </Button>
      {saved && (
        <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
          Saved
        </span>
      )}
    </div>
  );
}

function AdvancedLink({
  href,
  label,
  hint,
  last,
}: {
  href: string;
  label: string;
  hint: string;
  last?: boolean;
}): ReactNode {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "16px 20px",
        borderBottom: last ? "none" : "1px solid var(--border-custom)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted-custom)",
            marginTop: 3,
            fontWeight: 500,
          }}
        >
          {hint}
        </div>
      </div>
      <Icon name="chevronR" size={14} color="var(--text-sub)" />
    </Link>
  );
}
