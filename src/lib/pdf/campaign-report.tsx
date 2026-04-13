import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

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
  tableSection: {
    paddingHorizontal: 32,
  },
  tableTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    fontWeight: 700,
    marginBottom: 8,
    color: "#1a1a1a",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    padding: "6px 8px",
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    fontWeight: 700,
    color: "#666666",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: "6px 8px",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderBottomStyle: "solid",
  },
  tableCell: {
    fontSize: 9,
    color: "#333333",
  },
  colPublication: { flex: 3 },
  colDate: { flex: 2 },
  colType: { flex: 1.5 },
  colValue: { flex: 2, textAlign: "right" },
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
            Type: {props.campaignType}
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

        {/* Coverage table */}
        {props.coverages.length > 0 && (
          <View style={styles.tableSection}>
            <Text style={styles.tableTitle}>Coverage</Text>

            {/* Header row */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colPublication]}>Publication</Text>
              <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.colType]}>Type</Text>
              <Text style={[styles.tableHeaderText, styles.colValue]}>Value</Text>
            </View>

            {/* Data rows */}
            {props.coverages.map((cov, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colPublication]}>{cov.publication}</Text>
                <Text style={[styles.tableCell, styles.colDate]}>{formatDate(cov.date)}</Text>
                <Text style={[styles.tableCell, styles.colType]}>
                  {cov.type.charAt(0).toUpperCase() + cov.type.slice(1)}
                </Text>
                <Text style={[styles.tableCell, styles.colValue]}>
                  {cov.mediaValue != null ? formatCurrency(cov.mediaValue, props.currency) : "—"}
                </Text>
              </View>
            ))}
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
