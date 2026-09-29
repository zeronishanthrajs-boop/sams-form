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

export const maxDuration = 60; // 60s max execution time

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let eventData: EventReportData;
    let customConfig: Partial<InstitutionConfig> = {};
    let feedbackPdfBuffers: Buffer[] = [];

    if (contentType.includes("multipart/form-data")) {
      // ── Primary path: multipart FormData with compressed images ────────────
      const formData = await req.formData();

      const eventName        = (formData.get("eventName")        as string) || "";
      const eventDate        = (formData.get("eventDate")        as string) || "";
      const eventVenue       = (formData.get("eventVenue")       as string) || "";
      const eventCoordinator = (formData.get("eventCoordinator") as string) || "";
      const facultyEmail     = (formData.get("facultyEmail")     as string) || "";
      const numberOfParticipants = parseInt(
        (formData.get("numberOfParticipants") as string) || "0", 10
      );
      const objectives      = (formData.get("objectives")      as string) || "";
      const detailedReport  = (formData.get("detailedReport")  as string) || "";
      const programOutcomes = (formData.get("programOutcomes") as string) || "";
      const additionalInfo  = (formData.get("additionalInfo")  as string) || "";
      const customConfigJson = (formData.get("customConfig")   as string) || "";

      if (customConfigJson) {
        try { customConfig = JSON.parse(customConfigJson); } catch {}
      }

      // Helper: binary file → base64 data URL
      const fileToDataUrl = async (file: File): Promise<string> => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
      };

      // Event photographs (compressed images from client)
      const photographs: string[] = [];
      for (const file of formData.getAll("photographs") as File[]) {
        if (file && file.size > 0) photographs.push(await fileToDataUrl(file));
      }

      // Brochure images
      const brochureImages: string[] = [];
      for (const file of formData.getAll("brochureImages") as File[]) {
        if (file && file.size > 0) brochureImages.push(await fileToDataUrl(file));
      }

      // Participant list images
      const participantListImages: string[] = [];
      for (const file of formData.getAll("participantListImages") as File[]) {
        if (file && file.size > 0) participantListImages.push(await fileToDataUrl(file));
      }

      // Feedback: images (compressed, sent as binary)
      const feedbackFormImages: string[] = [];
      for (const file of formData.getAll("feedbackFormImages") as File[]) {
        if (file && file.size > 0) feedbackFormImages.push(await fileToDataUrl(file));
      }

      // Feedback: PDF files uploaded via Vercel Blob (optional — blob URL strings)
      for (const pdfUrl of formData.getAll("feedbackPdfUrls") as string[]) {
        if (!pdfUrl) continue;
        try {
          const resp = await fetch(pdfUrl);
          feedbackPdfBuffers.push(Buffer.from(await resp.arrayBuffer()));
        } catch (e) {
          console.warn("Could not fetch feedback PDF from blob:", e);
        }
      }

      // Feedback: Word docs uploaded via Vercel Blob (optional — blob URL strings)
      const feedbackWordTexts: Array<{ filename: string; text: string }> = [];
      const docxUrls  = formData.getAll("feedbackDocxUrls")  as string[];
      const docxNames = formData.getAll("feedbackDocxNames") as string[];
      for (let i = 0; i < docxUrls.length; i++) {
        if (!docxUrls[i]) continue;
        try {
          const resp = await fetch(docxUrls[i]);
          const buffer = Buffer.from(await resp.arrayBuffer());
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          feedbackWordTexts.push({ filename: docxNames[i] || "document.docx", text: result.value });
        } catch (e) {
          console.warn("Could not process Word doc from blob:", e);
        }
      }

      eventData = {
        eventName, eventDate, eventVenue, eventCoordinator, facultyEmail,
        numberOfParticipants, objectives, detailedReport, programOutcomes,
        additionalInfo, photographs, brochureImages, participantListImages,
        feedbackFormImages, feedbackWordTexts,
      };

    } else {
      // ── Secondary path: JSON body with Vercel Blob URLs ────────────────────
      const body = await req.json();
      const {
        eventName = "", eventDate = "", eventVenue = "", eventCoordinator = "",
        facultyEmail = "", numberOfParticipants = 0, objectives = "",
        detailedReport = "", programOutcomes = "", additionalInfo = "",
        photographs = [], brochureImages = [], participantListImages = [],
        feedbackImageUrls = [], feedbackPdfUrls = [], feedbackDocxEntries = [],
        blobUrlsToClean = [],
        customConfig: customConfigRaw = {},
      } = body;

      customConfig = customConfigRaw || {};

      // Fetch feedback PDF buffers from blob URLs
      for (const pdfUrl of feedbackPdfUrls as string[]) {
        if (!pdfUrl) continue;
        try {
          const resp = await fetch(pdfUrl);
          feedbackPdfBuffers.push(Buffer.from(await resp.arrayBuffer()));
        } catch (e) {
          console.warn("Could not fetch feedback PDF:", e);
        }
      }

      const feedbackWordTexts: Array<{ filename: string; text: string }> = [];
      for (const entry of feedbackDocxEntries as Array<{ url: string; filename: string }>) {
        if (!entry?.url) continue;
        try {
          const resp = await fetch(entry.url);
          const buffer = Buffer.from(await resp.arrayBuffer());
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          feedbackWordTexts.push({ filename: entry.filename, text: result.value });
        } catch (e) {
          console.warn("Could not extract Word doc text:", e);
        }
      }

      eventData = {
        eventName: String(eventName), eventDate: String(eventDate),
        eventVenue: String(eventVenue), eventCoordinator: String(eventCoordinator),
        facultyEmail: String(facultyEmail),
        numberOfParticipants: parseInt(String(numberOfParticipants), 10) || 0,
        objectives: String(objectives), detailedReport: String(detailedReport),
        programOutcomes: String(programOutcomes), additionalInfo: String(additionalInfo),
        photographs: (photographs as string[]).filter(Boolean),
        brochureImages: (brochureImages as string[]).filter(Boolean),
        participantListImages: (participantListImages as string[]).filter(Boolean),
        feedbackFormImages: (feedbackImageUrls as string[]).filter(Boolean),
        feedbackWordTexts,
      };

      // Cleanup blobs after use
      if ((blobUrlsToClean as string[]).length > 0) {
        try {
          const { del } = await import("@vercel/blob");
          await del(blobUrlsToClean as string[]);
        } catch (e) {
          console.warn("Could not clean up blobs:", e);
        }
      }
    }

    // ── Merge config ─────────────────────────────────────────────────────────
    const config: InstitutionConfig = { ...defaultInstitutionConfig, ...customConfig };

    // ── Server-side validation ────────────────────────────────────────────────
    const errors: Record<string, string> = {};
    if (!eventData.eventName.trim()) errors.eventName = "Event Name is required.";
    if (!eventData.eventDate.trim()) errors.eventDate = "Event Date is required.";
    if (!eventData.eventVenue.trim()) errors.eventVenue = "Event Venue is required.";
    if (!eventData.eventCoordinator.trim()) errors.eventCoordinator = "Event Coordinator is required.";
    if (!eventData.facultyEmail.trim()) {
      errors.facultyEmail = "Faculty Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eventData.facultyEmail.trim())) {
      errors.facultyEmail = "Please enter a valid faculty email address.";
    }
    if (isNaN(eventData.numberOfParticipants) || eventData.numberOfParticipants <= 0) {
      errors.numberOfParticipants = "Participants must be a positive number.";
    }
    if (!eventData.objectives.trim()) errors.objectives = "Objectives of the Event are required.";
    if (!eventData.detailedReport.trim()) errors.detailedReport = "Detailed Event Report is required.";
    if (!eventData.programOutcomes.trim()) errors.programOutcomes = "Program Outcomes are required.";

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Validation failed. Please correct the highlighted errors.", errors },
        { status: 400 }
      );
    }

    // ── Generate main PDF ─────────────────────────────────────────────────────
    let pdfBuffer = await generateEventReportPdfBuffer(eventData, config);

    // ── Merge feedback PDFs with separator page ───────────────────────────────
    if (feedbackPdfBuffers.length > 0) {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const mainDoc = await PDFDocument.load(pdfBuffer);

      const separatorPage = mainDoc.addPage([595.28, 841.89]);
      const boldFont    = await mainDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await mainDoc.embedFont(StandardFonts.Helvetica);
      const darkBlue = rgb(0.059, 0.173, 0.349);
      const grey     = rgb(0.4, 0.4, 0.4);

      separatorPage.drawText("FEEDBACK FORMS", { x: 50, y: 780, size: 20, font: boldFont, color: darkBlue });
      separatorPage.drawLine({ start: { x: 50, y: 770 }, end: { x: 545, y: 770 }, thickness: 1, color: darkBlue });
      separatorPage.drawText(`Feedback document(s) submitted for: ${eventData.eventName}`,
        { x: 50, y: 748, size: 11, font: regularFont, color: grey });
      separatorPage.drawText(`Total feedback files attached: ${feedbackPdfBuffers.length}`,
        { x: 50, y: 728, size: 11, font: regularFont, color: grey });

      for (const pdfBuf of feedbackPdfBuffers) {
        try {
          const feedbackDoc = await PDFDocument.load(pdfBuf);
          const copiedPages = await mainDoc.copyPages(feedbackDoc, feedbackDoc.getPageIndices());
          copiedPages.forEach((page) => mainDoc.addPage(page));
        } catch (e) {
          console.warn("Could not merge a feedback PDF page:", e);
        }
      }

      pdfBuffer = Buffer.from(await mainDoc.save());
    }

    // ── Generate filename & send emails ───────────────────────────────────────
    const filename = formatFilename(config.pdfFilenameFormat, eventData.eventName, eventData.eventDate);
    const emailResult = await sendEventReportEmails({ data: eventData, config, pdfBuffer, filename });

    return NextResponse.json({
      success: true,
      message: "Event report generated successfully. A PDF copy has been sent to the college office and your email address.",
      filename,
      pdfBase64: pdfBuffer.toString("base64"),
      emailResult,
    });
  } catch (error: any) {
    console.error("Error generating NAAC event report:", error);
    return NextResponse.json(
      { success: false, message: "The report could not be generated. Please try again or contact system support." },
      { status: 500 }
    );
  }
}
