import React from "react";
import fs from "fs";
import path from "path";
import {
  Document as PdfDocument,
  Page as PdfPage,
  Text as PdfText,
  View as PdfView,
  Image as PdfImage,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { InstitutionConfig } from "@/config/institutionConfig";

export interface EventReportData {
  eventName: string;
  eventDate: string;
  eventVenue: string;
  eventCoordinator: string;
  facultyEmail: string;
  numberOfParticipants: number;
  objectives: string;
  detailedReport: string;
  programOutcomes: string;
  additionalInfo?: string;
  photographs?: string[]; // Base64 data URLs or http URLs
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 45,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1E293B",
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: "#0F2C59",
    paddingBottom: 10,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
    objectFit: "contain",
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    marginRight: 15,
    backgroundColor: "#0F2C59",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  collegeTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F2C59",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  collegeSubText: {
    fontSize: 8,
    color: "#475569",
    textAlign: "center",
    marginBottom: 2,
  },
  naacBadge: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#B45309",
    textAlign: "center",
    marginBottom: 2,
  },
  deptTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1E3E62",
    textAlign: "center",
    marginTop: 4,
    textTransform: "uppercase",
    backgroundColor: "#F1F5F9",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  reportBanner: {
    backgroundColor: "#0F2C59",
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    paddingVertical: 5,
    marginVertical: 10,
    borderRadius: 2,
    letterSpacing: 1,
  },
  tableGrid: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableRowLast: {
    flexDirection: "row",
  },
  tableCellLabel: {
    width: "30%",
    backgroundColor: "#F8FAFC",
    padding: 6,
    fontWeight: "bold",
    color: "#0F2C59",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    fontSize: 9,
  },
  tableCellValue: {
    width: "70%",
    padding: 6,
    color: "#334155",
    fontSize: 9.5,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: "#0F2C59",
    borderLeftWidth: 3,
    borderLeftColor: "#D4AF37",
    paddingLeft: 6,
    marginBottom: 5,
    backgroundColor: "#F8FAFC",
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  sectionBody: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: "#334155",
    textAlign: "justify",
    paddingHorizontal: 4,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  photoCard: {
    width: "48%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 4,
    backgroundColor: "#FAFAFA",
  },
  photoImg: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    borderRadius: 2,
  },
  photoCaption: {
    fontSize: 7.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  signatureContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    paddingTop: 10,
    wrap: false,
  },
  signatureBox: {
    width: "30%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#94A3B8",
    marginBottom: 4,
  },
  signatureTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#0F2C59",
    textAlign: "center",
  },
  signatureDept: {
    fontSize: 7.5,
    color: "#64748B",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#94A3B8",
  },
});

function getResolvedLogoUrl(logoUrl?: string): string | undefined {
  const url = logoUrl || "/logo.jpg";

  if (url.startsWith("data:")) {
    return url;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (typeof window !== "undefined") {
    if (url.startsWith("/")) {
      return window.location.origin + url;
    }
    return url;
  }

  try {
    const cleanPath = url.startsWith("/") ? url.slice(1) : url;
    const candidatePaths = [
      path.join(process.cwd(), "public", cleanPath),
      path.join(process.cwd(), cleanPath),
      path.join(process.cwd(), "public", "logo.png"),
      path.join(process.cwd(), "public", "logo.jpg"),
      path.join(process.cwd(), "logo.png"),
      path.join(process.cwd(), "logo.jpg"),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const buffer = fs.readFileSync(p);
        const isPng =
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47;
        const mime = isPng ? "image/png" : "image/jpeg";
        return `data:${mime};base64,${buffer.toString("base64")}`;
      }
    }
  } catch (e) {
    console.error("Error resolving logo image for PDF:", e);
  }

  return url;
}

export interface PdfDocumentProps {
  data: EventReportData;
  config: InstitutionConfig;
}

export const EventReportPdfDocument: React.FC<PdfDocumentProps> = ({
  data,
  config,
}) => {
  const logoSrc = getResolvedLogoUrl(config.logoUrl);

  return (
    <PdfDocument title={`Event Report - ${data.eventName}`}>
      <PdfPage size="A4" style={styles.page}>
        {/* Institutional Header */}
        <PdfView style={styles.headerContainer}>
          {logoSrc ? (
            <PdfImage style={styles.logo} src={logoSrc} />
          ) : (
            <PdfView style={styles.logoPlaceholder}>
              <PdfText style={styles.logoText}>
                {config.collegeName.substring(0, 2).toUpperCase()}
              </PdfText>
            </PdfView>
          )}

          <PdfView style={styles.headerTextContainer}>
            <PdfText style={styles.collegeTitle}>{config.collegeName}</PdfText>
            <PdfText style={styles.collegeSubText}>{config.collegeAddress}</PdfText>
            <PdfText style={styles.collegeSubText}>
              {config.collegeAffiliation}
            </PdfText>
            <PdfText style={styles.naacBadge}>{config.naacAccreditation}</PdfText>
          </PdfView>
        </PdfView>

        {/* Department & Academic Year Header */}
        <PdfText style={styles.deptTitle}>
          {config.departmentName} | Academic Year: {config.academicYear}
        </PdfText>

        {/* Report Banner */}
        <PdfText style={styles.reportBanner}>EVENT COMPLETION REPORT</PdfText>

        {/* Event Key Details Table */}
        <PdfView style={styles.tableGrid}>
          <PdfView style={styles.tableRow}>
            <PdfText style={styles.tableCellLabel}>Event Name</PdfText>
            <PdfText style={styles.tableCellValue}>{data.eventName}</PdfText>
          </PdfView>
          <PdfView style={styles.tableRow}>
            <PdfText style={styles.tableCellLabel}>Event Date</PdfText>
            <PdfText style={styles.tableCellValue}>{data.eventDate}</PdfText>
          </PdfView>
          <PdfView style={styles.tableRow}>
            <PdfText style={styles.tableCellLabel}>Venue / Platform</PdfText>
            <PdfText style={styles.tableCellValue}>{data.eventVenue}</PdfText>
          </PdfView>
          <PdfView style={styles.tableRow}>
            <PdfText style={styles.tableCellLabel}>Event Coordinator</PdfText>
            <PdfText style={styles.tableCellValue}>
              {data.eventCoordinator} ({data.facultyEmail})
            </PdfText>
          </PdfView>
          <PdfView style={styles.tableRowLast}>
            <PdfText style={styles.tableCellLabel}>No. of Participants</PdfText>
            <PdfText style={styles.tableCellValue}>
              {data.numberOfParticipants} Participants
            </PdfText>
          </PdfView>
        </PdfView>

        {/* Section 1: Objectives */}
        <PdfView style={styles.section}>
          <PdfText style={styles.sectionTitle}>1. OBJECTIVES OF THE EVENT</PdfText>
          <PdfText style={styles.sectionBody}>{data.objectives}</PdfText>
        </PdfView>

        {/* Section 2: Detailed Event Report */}
        <PdfView style={styles.section}>
          <PdfText style={styles.sectionTitle}>2. DETAILED EVENT REPORT</PdfText>
          <PdfText style={styles.sectionBody}>{data.detailedReport}</PdfText>
        </PdfView>

        {/* Section 3: Program Outcomes */}
        <PdfView style={styles.section}>
          <PdfText style={styles.sectionTitle}>3. PROGRAM OUTCOMES</PdfText>
          <PdfText style={styles.sectionBody}>{data.programOutcomes}</PdfText>
        </PdfView>

        {/* Section 4: Event Photographs (If provided) */}
        {data.photographs && data.photographs.length > 0 && (
          <PdfView style={styles.section} wrap={false}>
            <PdfText style={styles.sectionTitle}>4. EVENT PHOTOGRAPHS</PdfText>
            <PdfView style={styles.photoGrid}>
              {data.photographs.map((photo, index) => (
                <PdfView key={index} style={styles.photoCard}>
                  <PdfImage style={styles.photoImg} src={photo} />
                  <PdfText style={styles.photoCaption}>
                    Figure {index + 1}: Event Highlight - {data.eventName}
                  </PdfText>
                </PdfView>
              ))}
            </PdfView>
          </PdfView>
        )}

        {/* Section 5: Additional Information (If provided) */}
        {data.additionalInfo && data.additionalInfo.trim().length > 0 && (
          <PdfView style={styles.section}>
            <PdfText style={styles.sectionTitle}>5. ADDITIONAL INFORMATION</PdfText>
            <PdfText style={styles.sectionBody}>{data.additionalInfo}</PdfText>
          </PdfView>
        )}

        {/* Signature Block */}
        <PdfView style={styles.signatureContainer} wrap={false}>
          <PdfView style={styles.signatureBox}>
            <PdfView style={styles.signatureLine} />
            <PdfText style={styles.signatureTitle}>
              {config.signatureTitles.coordinator}
            </PdfText>
            <PdfText style={styles.signatureDept}>{data.eventCoordinator}</PdfText>
          </PdfView>
          <PdfView style={styles.signatureBox}>
            <PdfView style={styles.signatureLine} />
            <PdfText style={styles.signatureTitle}>
              {config.signatureTitles.hod}
            </PdfText>
            <PdfText style={styles.signatureDept}>{config.departmentName}</PdfText>
          </PdfView>
          <PdfView style={styles.signatureBox}>
            <PdfView style={styles.signatureLine} />
            <PdfText style={styles.signatureTitle}>
              {config.signatureTitles.principal}
            </PdfText>
            <PdfText style={styles.signatureDept}>{config.collegeName}</PdfText>
          </PdfView>
        </PdfView>

        {/* Footer */}
        <PdfView style={styles.footer} fixed>
          <PdfText>{config.collegeName} — NAAC Documentation Portal</PdfText>
          <PdfText
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </PdfView>
      </PdfPage>
    </PdfDocument>
  );
};

export async function generateEventReportPdfBuffer(
  data: EventReportData,
  config: InstitutionConfig
): Promise<Buffer> {
  const doc = <EventReportPdfDocument data={data} config={config} />;
  const stream: any = await pdf(doc).toBuffer();

  if (Buffer.isBuffer(stream)) {
    return stream;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
