import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

interface CampaignReportProps {
  orgName: string;
  orgLogo: string | null;
  orgEmail: string | null;
  orgColour: string | null;
  currency: string;
  clientName: string;
  clientColour: string;
  clientBgColour: string;
  campaignName: string;
  campaignType: string;
  startDate: string | null;
  dueDate: string | null;
  outreachSent: number;
  replyRate: number;
  coverageCount: number;
  totalMediaValue: number;
  coverages: {
    publication: string;
    date: string;
    type: string;
    mediaValue: number | null;
    url: string | null;
    contactName: string | null;
    attachmentUrl: string | null;
  }[];
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    paddingBottom: 60,
  },
  headerBar: {
    padding: "24px 32px",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#ffffffcc",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  clientName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    fontWeight: 700,
    marginBottom: 4,
  },
  campaignName: {
    fontSize: 13,
    color: "#444444",
    marginBottom: 2,
  },
  campaignMeta: {
    fontSize: 10,
    color: "#888888",
    marginBottom: 2,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    padding: "12px 14px",
  },
  metricValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 9,
    color: "#888888",
  },
  coverageSection: {
    paddingHorizontal: 32,
  },
  coverageTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    fontWeight: 700,
    marginBottom: 10,
    color: "#1a1a1a",
  },
  coverageCard: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderStyle: "solid",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 8,
  },
  coverageCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coveragePublication: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    fontWeight: 700,
    color: "#1a1a1a",
    flex: 1,
  },
  coverageTypeBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    fontWeight: 600,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
    color: "#666666",
  },
  coverageDate: {
    fontSize: 9,
    color: "#999999",
  },
  coverageDetail: {
    fontSize: 9,
    color: "#666666",
    marginTop: 4,
  },
  coverageValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    fontWeight: 700,
    color: "#15803D",
    marginTop: 4,
  },
  coverageLink: {
    fontSize: 8,
    color: "#2563EB",
    marginTop: 3,
  },
  coverageImage: {
    width: 100,
    height: 80,
    objectFit: "cover" as const,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderStyle: "solid" as const,
  },
  coverageCardWithImage: {
    flexDirection: "row" as const,
    gap: 12,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    borderTopStyle: "solid",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#aaaaaa",
  },
});

export function CampaignReport(props: CampaignReportProps) {
  const accentColour = props.orgColour || "#2563EB";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header bar */}
        <View style={[styles.headerBar, { backgroundColor: accentColour }]}>
          <Text style={styles.headerTitle}>{props.orgName}</Text>
          <Text style={styles.headerSubtitle}>
            Campaign Report — {formatDate(new Date().toISOString())}
          </Text>
        </View>

        {/* Campaign section */}
        <View style={styles.section}>
          <Text style={[styles.clientName, { color: props.clientColour || "#1a1a1a" }]}>
            {props.clientName}
          </Text>
          <Text style={styles.campaignName}>{props.campaignName}</Text>
          <Text style={styles.campaignMeta}>
            Type: {props.campaignType.charAt(0).toUpperCase() + props.campaignType.slice(1)}
          </Text>
          <Text style={styles.campaignMeta}>
            {props.startDate || props.dueDate
              ? `${formatDate(props.startDate)} — ${formatDate(props.dueDate)}`
              : "No dates set"}
          </Text>
        </View>

        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{props.outreachSent}</Text>
            <Text style={styles.metricLabel}>Outreach sent</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{props.replyRate}%</Text>
            <Text style={styles.metricLabel}>Reply rate</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{props.coverageCount}</Text>
            <Text style={styles.metricLabel}>Coverage hits</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {formatCurrency(props.totalMediaValue, props.currency)}
            </Text>
            <Text style={styles.metricLabel}>Media value</Text>
          </View>
        </View>

        {/* Coverage cards */}
        {props.coverages.length > 0 && (
          <View style={styles.coverageSection}>
            <Text style={styles.coverageTitle}>Coverage</Text>

            {props.coverages.map((cov, i) => {
              const typeLabel = cov.type.charAt(0).toUpperCase() + cov.type.slice(1);
              const hasImage = cov.attachmentUrl && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(cov.attachmentUrl);

              return (
                <View key={i} style={[styles.coverageCard, hasImage ? styles.coverageCardWithImage : {}]}>
                  {/* Clipping image */}
                  {hasImage && (
                    <Image src={cov.attachmentUrl!} style={styles.coverageImage} />
                  )}

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    {/* Row 1: publication + type badge + date */}
                    <View style={styles.coverageCardRow}>
                      <Text style={styles.coveragePublication}>{cov.publication}</Text>
                      <Text style={styles.coverageTypeBadge}>{typeLabel}</Text>
                      <Text style={styles.coverageDate}>{formatDate(cov.date)}</Text>
                    </View>

                    {/* Contact */}
                    {cov.contactName && (
                      <Text style={styles.coverageDetail}>Contact: {cov.contactName}</Text>
                    )}

                    {/* Value */}
                    {cov.mediaValue != null && (
                      <Text style={styles.coverageValue}>
                        {formatCurrency(cov.mediaValue, props.currency)}
                      </Text>
                    )}

                    {/* Link */}
                    {cov.url && (
                      <Text style={styles.coverageLink}>{cov.url}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Prepared by {props.orgName}</Text>
          {props.orgEmail && <Text style={styles.footerText}>{props.orgEmail}</Text>}
        </View>
      </Page>
    </Document>
  );
}
