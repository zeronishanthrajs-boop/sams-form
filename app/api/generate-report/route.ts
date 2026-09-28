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
    const contentType = req.headers.get("content-type") || "";

    let eventData: EventReportData;
    let customConfig: Partial<InstitutionConfig> = {};
    let feedbackPdfBuffers: Buffer[] = []; // hoisted for pdf-lib merge step

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const eventName = (formData.get("eventName") as string) || "";
      const eventDate = (formData.get("eventDate") as string) || "";
      const eventVenue = (formData.get("eventVenue") as string) || "";
      const eventCoordinator =
        (formData.get("eventCoordinator") as string) || "";
      const facultyEmail = (formData.get("facultyEmail") as string) || "";
      const numberOfParticipants = parseInt(
        (formData.get("numberOfParticipants") as string) || "0",
        10
      );
      const objectives = (formData.get("objectives") as string) || "";
      const detailedReport = (formData.get("detailedReport") as string) || "";
      const programOutcomes = (formData.get("programOutcomes") as string) || "";
      const additionalInfo = (formData.get("additionalInfo") as string) || "";
      const customConfigJson = (formData.get("customConfig") as string) || "";

      if (customConfigJson) {
        try {
          customConfig = JSON.parse(customConfigJson);
        } catch (e) {
          console.warn("Invalid customConfig JSON provided");
        }
      }

      // Handle photos from multipart form data
      const photoFiles = formData.getAll("photographs") as File[];
      const photographs: string[] = [];

      for (const file of photoFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const mimeType = file.type || "image/jpeg";
          photographs.push(`data:${mimeType};base64,${buffer.toString("base64")}`);
        }
      }

      // Handle brochure images from multipart form data
      const brochureFiles = formData.getAll("brochureImages") as File[];
      const brochureImages: string[] = [];

      for (const file of brochureFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const mimeType = file.type || "image/jpeg";
          brochureImages.push(`data:${mimeType};base64,${buffer.toString("base64")}`);
        }
      }

      // Handle participant list images from multipart form data
      const participantFiles = formData.getAll("participantListImages") as File[];
      const participantListImages: string[] = [];

      for (const file of participantFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const mimeType = file.type || "image/jpeg";
          participantListImages.push(`data:${mimeType};base64,${buffer.toString("base64")}`);
        }
      }

      // Handle feedback files from multipart form data (image / PDF / Word)
      const feedbackFiles = formData.getAll("feedbackFormImages") as File[];
      const feedbackFormImages: string[] = [];
      // feedbackPdfBuffers is declared in outer scope for pdf-lib access after if/else
      const feedbackWordTexts: Array<{ filename: string; text: string }> = [];

      for (const file of feedbackFiles) {
        if (!file || typeof file !== "object" || file.size === 0) continue;

        if (file.type.startsWith("image/")) {
          // Images → base64 for embedding in PDF
          const buffer = Buffer.from(await file.arrayBuffer());
          feedbackFormImages.push(`data:${file.type};base64,${buffer.toString("base64")}`);

        } else if (file.type === "application/pdf") {
          // PDFs → keep as raw buffer for pdf-lib merging later
          feedbackPdfBuffers.push(Buffer.from(await file.arrayBuffer()));

        } else if (
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.toLowerCase().endsWith(".docx")
        ) {
          // Word .docx → extract text via mammoth
          const mammoth = await import("mammoth");
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = await mammoth.extractRawText({ buffer });
          feedbackWordTexts.push({ filename: file.name, text: result.value });
        }
      }

      eventData = {
        eventName,
        eventDate,
        eventVenue,
        eventCoordinator,
        facultyEmail,
        numberOfParticipants,
        objectives,
        detailedReport,
        programOutcomes,
        additionalInfo,
        photographs,
        brochureImages,
        participantListImages,
        feedbackFormImages,
        feedbackWordTexts,
      };
    } else {
      const body = await req.json();
      eventData = body.eventData;
      if (body.customConfig) {
        customConfig = body.customConfig;
      }
    }

    // Merge custom branding config if provided
    const config: InstitutionConfig = {
      ...defaultInstitutionConfig,
      ...customConfig,
    };

    // Server-side Form Validation
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
    if (
      isNaN(eventData.numberOfParticipants) ||
      eventData.numberOfParticipants <= 0
    ) {
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

    // Generate main PDF Buffer
    let pdfBuffer = await generateEventReportPdfBuffer(eventData, config);

    // Merge any uploaded feedback PDFs using pdf-lib
    if (feedbackPdfBuffers.length > 0) {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const mainDoc = await PDFDocument.load(pdfBuffer);

      // Insert a clearly labeled separator page before the appended PDF pages
      const separatorPage = mainDoc.addPage([595.28, 841.89]); // A4 size
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

      // Append each feedback PDF's pages after the separator
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


    // Generate filename
    const filename = formatFilename(
      config.pdfFilenameFormat,
      eventData.eventName,
      eventData.eventDate
    );

    // Send emails to office & faculty
    const emailResult = await sendEventReportEmails({
      data: eventData,
      config,
      pdfBuffer,
      filename,
    });

    const pdfBase64 = pdfBuffer.toString("base64");

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
