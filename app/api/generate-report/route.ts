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
    const participantListPdfBuffers: Buffer[] = [];
    const feedbackPdfBuffers: Buffer[] = [];
    const feedbackWordTexts: Array<{ filename: string; text: string }> = [];

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
        } catch {
          console.warn("Invalid customConfig JSON provided");
        }
      }

      // Helper: convert binary File to base64 data URL
      const fileToDataUrl = async (file: File): Promise<string> => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mime = file.type || "image/jpeg";
        return `data:${mime};base64,${buffer.toString("base64")}`;
      };

      // Event photographs
      const photoFiles = formData.getAll("photographs") as File[];
      const photographs: string[] = [];
      for (const file of photoFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          photographs.push(await fileToDataUrl(file));
        }
      }

      // Brochure images
      const brochureFiles = formData.getAll("brochureImages") as File[];
      const brochureImages: string[] = [];
      for (const file of brochureFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          brochureImages.push(await fileToDataUrl(file));
        }
      }

      // Participant list images
      const participantFiles = formData.getAll(
        "participantListImages"
      ) as File[];
      const participantListImages: string[] = [];
      for (const file of participantFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          participantListImages.push(await fileToDataUrl(file));
        }
      }

      // Participant list PDF files (direct multipart upload)
      const participantPdfFiles = formData.getAll(
        "participantListPdfFiles"
      ) as File[];
      for (const file of participantPdfFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          try {
            participantListPdfBuffers.push(
              Buffer.from(await file.arrayBuffer())
            );
          } catch (e) {
            console.warn("Could not read participant list PDF buffer:", e);
          }
        }
      }

      // Feedback form images
      const feedbackImageFiles = formData.getAll(
        "feedbackFormImages"
      ) as File[];
      const feedbackFormImages: string[] = [];
      for (const file of feedbackImageFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          feedbackFormImages.push(await fileToDataUrl(file));
        }
      }

      // Feedback PDF files (direct multipart upload)
      const feedbackPdfFiles = formData.getAll("feedbackPdfFiles") as File[];
      for (const file of feedbackPdfFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          try {
            feedbackPdfBuffers.push(Buffer.from(await file.arrayBuffer()));
          } catch (e) {
            console.warn("Could not read feedback PDF buffer:", e);
          }
        }
      }

      // Feedback Word docx files (direct multipart upload)
      const feedbackDocxFiles = formData.getAll("feedbackDocxFiles") as File[];
      for (const file of feedbackDocxFiles) {
        if (file && typeof file === "object" && file.size > 0) {
          try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({ buffer });
            feedbackWordTexts.push({
              filename: file.name || "feedback-document.docx",
              text: result.value,
            });
          } catch (e) {
            console.warn("Could not process Word doc:", e);
          }
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

    // Merge custom branding config
    const config: InstitutionConfig = {
      ...defaultInstitutionConfig,
      ...customConfig,
    };

    // Server-side validation
    const errors: Record<string, string> = {};
    if (!eventData.eventName?.trim()) errors.eventName = "Event Name is required.";
    if (!eventData.eventDate?.trim()) errors.eventDate = "Event Date is required.";
    if (!eventData.eventVenue?.trim()) errors.eventVenue = "Event Venue is required.";
    if (!eventData.eventCoordinator?.trim())
      errors.eventCoordinator = "Event Coordinator is required.";
    if (!eventData.facultyEmail?.trim()) {
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
    if (!eventData.objectives?.trim())
      errors.objectives = "Objectives of the Event are required.";
    if (!eventData.detailedReport?.trim())
      errors.detailedReport = "Detailed Event Report is required.";
    if (!eventData.programOutcomes?.trim())
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

    // Merge any uploaded Participant List PDFs or Feedback PDFs using pdf-lib
    if (participantListPdfBuffers.length > 0 || feedbackPdfBuffers.length > 0) {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const mainDoc = await PDFDocument.load(pdfBuffer);
      const boldFont = await mainDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await mainDoc.embedFont(StandardFonts.Helvetica);
      const darkBlue = rgb(0.059, 0.173, 0.349);
      const grey = rgb(0.4, 0.4, 0.4);

      // 1. Participant List PDFs
      if (participantListPdfBuffers.length > 0) {
        const partSeparatorPage = mainDoc.addPage([595.28, 841.89]);
        partSeparatorPage.drawText("PARTICIPANT LIST / ATTENDANCE SHEET", {
          x: 50,
          y: 780,
          size: 18,
          font: boldFont,
          color: darkBlue,
        });
        partSeparatorPage.drawLine({
          start: { x: 50, y: 770 },
          end: { x: 545, y: 770 },
          thickness: 1,
          color: darkBlue,
        });
        partSeparatorPage.drawText(
          `Participant attendance document(s) submitted for: ${eventData.eventName}`,
          { x: 50, y: 748, size: 11, font: regularFont, color: grey }
        );
        partSeparatorPage.drawText(
          `Total participant list document(s) attached: ${participantListPdfBuffers.length} (${eventData.numberOfParticipants} Participants)`,
          { x: 50, y: 728, size: 11, font: regularFont, color: grey }
        );

        for (const pdfBuf of participantListPdfBuffers) {
          try {
            const partDoc = await PDFDocument.load(pdfBuf);
            const copiedPages = await mainDoc.copyPages(
              partDoc,
              partDoc.getPageIndices()
            );
            copiedPages.forEach((page) => mainDoc.addPage(page));
          } catch (e) {
            console.warn("Could not merge a participant list PDF page:", e);
          }
        }
      }

      // 2. Feedback Form PDFs
      if (feedbackPdfBuffers.length > 0) {
        const separatorPage = mainDoc.addPage([595.28, 841.89]);
        separatorPage.drawText("FEEDBACK FORMS", {
          x: 50,
          y: 780,
          size: 20,
          font: boldFont,
          color: darkBlue,
        });
        separatorPage.drawLine({
          start: { x: 50, y: 770 },
          end: { x: 545, y: 770 },
          thickness: 1,
          color: darkBlue,
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
            const copiedPages = await mainDoc.copyPages(
              feedbackDoc,
              feedbackDoc.getPageIndices()
            );
            copiedPages.forEach((page) => mainDoc.addPage(page));
          } catch (e) {
            console.warn("Could not merge a feedback PDF page:", e);
          }
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

    // Send emails
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
