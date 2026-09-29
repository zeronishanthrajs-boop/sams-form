import { NextRequest, NextResponse } from "next/server";
import {
  defaultInstitutionConfig,
  formatFilename,
  InstitutionConfig,
} from "@/config/institutionConfig";
import {
  EventReportData,
  generateEventReportPdfBuffer,
} from "@/lib/pdfGenerator";
import { sendEventReportEmails } from "@/lib/emailService";

export const maxDuration = 60; // 60s max execution time for PDF generation & email

export async function POST(req: NextRequest) {
  try {
    // ── Parse request body ──────────────────────────────────────────────────
    // The client now uploads files directly to Vercel Blob and sends only
    // public blob URLs here, so we always expect a JSON body (no binary data).
    const body = await req.json();

    const {
      eventName = "",
      eventDate = "",
      eventVenue = "",
      eventCoordinator = "",
      facultyEmail = "",
      numberOfParticipants = 0,
      objectives = "",
      detailedReport = "",
      programOutcomes = "",
      additionalInfo = "",
      // Image blob URLs — passed directly to @react-pdf/renderer
      photographs = [] as string[],
      brochureImages = [] as string[],
      participantListImages = [] as string[],
      // Feedback file URLs (separated by type)
      feedbackImageUrls = [] as string[],
      feedbackPdfUrls = [] as string[],
      feedbackDocxEntries = [] as Array<{ url: string; filename: string }>,
      // Blob URLs to delete after PDF generation
      blobUrlsToClean = [] as string[],
      // Branding config override
      customConfig: customConfigRaw = {} as Partial<InstitutionConfig>,
    } = body;

    const customConfig: Partial<InstitutionConfig> = customConfigRaw || {};

    // ── Fetch feedback PDF buffers from blob URLs ───────────────────────────
    const feedbackPdfBuffers: Buffer[] = [];
    for (const pdfUrl of feedbackPdfUrls) {
      if (!pdfUrl) continue;
      try {
        const resp = await fetch(pdfUrl);
        feedbackPdfBuffers.push(Buffer.from(await resp.arrayBuffer()));
      } catch (e) {
        console.warn("Could not fetch feedback PDF:", pdfUrl, e);
      }
    }

    // ── Extract text from Word docs fetched from blob URLs ──────────────────
    const feedbackWordTexts: Array<{ filename: string; text: string }> = [];
    for (const entry of feedbackDocxEntries) {
      if (!entry?.url) continue;
      try {
        const resp = await fetch(entry.url);
        const buffer = Buffer.from(await resp.arrayBuffer());
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        feedbackWordTexts.push({ filename: entry.filename, text: result.value });
      } catch (e) {
        console.warn("Could not extract Word doc text:", entry.url, e);
      }
    }

    // ── Assemble eventData ──────────────────────────────────────────────────
    const eventData: EventReportData = {
      eventName: String(eventName),
      eventDate: String(eventDate),
      eventVenue: String(eventVenue),
      eventCoordinator: String(eventCoordinator),
      facultyEmail: String(facultyEmail),
      numberOfParticipants: parseInt(String(numberOfParticipants), 10) || 0,
      objectives: String(objectives),
      detailedReport: String(detailedReport),
      programOutcomes: String(programOutcomes),
      additionalInfo: String(additionalInfo),
      photographs: (photographs as string[]).filter(Boolean),
      brochureImages: (brochureImages as string[]).filter(Boolean),
      participantListImages: (participantListImages as string[]).filter(Boolean),
      feedbackFormImages: (feedbackImageUrls as string[]).filter(Boolean),
      feedbackWordTexts,
    };

    // ── Merge custom branding config ────────────────────────────────────────
    const config: InstitutionConfig = {
      ...defaultInstitutionConfig,
      ...customConfig,
    };

    // ── Server-side validation ──────────────────────────────────────────────
    const errors: Record<string, string> = {};
    if (!eventData.eventName.trim()) errors.eventName = "Event Name is required.";
    if (!eventData.eventDate.trim()) errors.eventDate = "Event Date is required.";
    if (!eventData.eventVenue.trim()) errors.eventVenue = "Event Venue is required.";
    if (!eventData.eventCoordinator.trim())
      errors.eventCoordinator = "Event Coordinator is required.";
    if (!eventData.facultyEmail.trim()) {
      errors.facultyEmail = "Faculty Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eventData.facultyEmail.trim())) {
      errors.facultyEmail = "Please enter a valid faculty email address.";
    }
    if (isNaN(eventData.numberOfParticipants) || eventData.numberOfParticipants <= 0) {
      errors.numberOfParticipants = "Participants must be a positive number.";
    }
    if (!eventData.objectives.trim())
      errors.objectives = "Objectives of the Event are required.";
    if (!eventData.detailedReport.trim())
      errors.detailedReport = "Detailed Event Report is required.";
    if (!eventData.programOutcomes.trim())
      errors.programOutcomes = "Program Outcomes are required.";

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed. Please correct the highlighted errors.",
          errors,
        },
        { status: 400 }
      );
    }

    // ── Generate main PDF ───────────────────────────────────────────────────
    let pdfBuffer = await generateEventReportPdfBuffer(eventData, config);

    // ── Merge uploaded feedback PDFs (with separator page) ──────────────────
    if (feedbackPdfBuffers.length > 0) {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const mainDoc = await PDFDocument.load(pdfBuffer);

      // Labeled separator page
      const separatorPage = mainDoc.addPage([595.28, 841.89]);
      const boldFont = await mainDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await mainDoc.embedFont(StandardFonts.Helvetica);
      const darkBlue = rgb(0.059, 0.173, 0.349);
      const grey = rgb(0.4, 0.4, 0.4);

      separatorPage.drawText("FEEDBACK FORMS", {
        x: 50, y: 780, size: 20, font: boldFont, color: darkBlue,
      });
      separatorPage.drawLine({
        start: { x: 50, y: 770 }, end: { x: 545, y: 770 },
        thickness: 1, color: darkBlue,
      });
      separatorPage.drawText(
        `Feedback document(s) submitted for: ${eventData.eventName}`,
        { x: 50, y: 748, size: 11, font: regularFont, color: grey }
      );
      separatorPage.drawText(
        `Total feedback files attached: ${feedbackPdfBuffers.length}`,
        { x: 50, y: 728, size: 11, font: regularFont, color: grey }
      );

      for (const pdfBuf of feedbackPdfBuffers) {
        try {
          const feedbackDoc = await PDFDocument.load(pdfBuf);
          const copiedPages = await mainDoc.copyPages(feedbackDoc, feedbackDoc.getPageIndices());
          copiedPages.forEach((page) => mainDoc.addPage(page));
        } catch (e) {
          console.warn("Could not merge a feedback PDF page:", e);
        }
      }

      const mergedBytes = await mainDoc.save();
      pdfBuffer = Buffer.from(mergedBytes);
    }

    // ── Generate filename ───────────────────────────────────────────────────
    const filename = formatFilename(
      config.pdfFilenameFormat,
      eventData.eventName,
      eventData.eventDate
    );

    // ── Send emails ─────────────────────────────────────────────────────────
    const emailResult = await sendEventReportEmails({
      data: eventData,
      config,
      pdfBuffer,
      filename,
    });

    const pdfBase64 = pdfBuffer.toString("base64");

    // ── Clean up blobs after use ────────────────────────────────────────────
    if (blobUrlsToClean.length > 0) {
      try {
        const { del } = await import("@vercel/blob");
        await del(blobUrlsToClean as string[]);
      } catch (e) {
        console.warn("Could not clean up blobs:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Event report generated successfully. A PDF copy has been sent to the college office and your email address.",
      filename,
      pdfBase64,
      emailResult,
    });
  } catch (error: any) {
    console.error("Error generating NAAC event report:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "The report could not be generated. Please try again or contact system support.",
      },
      { status: 500 }
    );
  }
}
