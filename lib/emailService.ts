import nodemailer from "nodemailer";
import { InstitutionConfig } from "@/config/institutionConfig";
import { EventReportData } from "@/lib/pdfGenerator";

export interface SendReportEmailParams {
  data: EventReportData;
  config: InstitutionConfig;
  pdfBuffer: Buffer;
  filename: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  officeEmailSent: boolean;
  facultyEmailSent: boolean;
  simulated: boolean;
  message: string;
}

export async function sendEventReportEmails({
  data,
  config,
  pdfBuffer,
  filename,
}: SendReportEmailParams): Promise<EmailDeliveryResult> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom =
    process.env.SMTP_FROM ||
    `"${config.collegeName} NAAC Portal" <no-reply@${config.collegeWebsite.replace(/^www\./, "")}>`;

  // Format Email Subjects
  const officeSubject = config.emailSubjectOffice.replace(
    "{Event_Name}",
    data.eventName
  );
  const facultySubject = config.emailSubjectFaculty.replace(
    "{Event_Name}",
    data.eventName
  );

  // Format Email Bodies
  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{Event_Name}/g, data.eventName)
      .replace(/{Event_Date}/g, data.eventDate)
      .replace(/{Event_Coordinator}/g, data.eventCoordinator)
      .replace(/{Number_of_Participants}/g, String(data.numberOfParticipants));
  };

  const officeBodyText = replacePlaceholders(config.emailBodyOffice);
  const facultyBodyText = replacePlaceholders(config.emailBodyFaculty);

  // HTML Email Layout Builder
  const buildHtmlEmail = (
    recipientType: "office" | "faculty",
    bodyText: string
  ) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { background-color: ${config.primaryColor}; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 30px; }
          .badge { display: inline-block; background-color: #f1f5f9; color: ${config.primaryColor}; font-weight: 600; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-bottom: 16px; border-left: 3px solid ${config.secondaryColor}; }
          .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0; }
          .details-table { width: 100%; border-collapse: collapse; }
          .details-table td { padding: 8px 4px; font-size: 14px; }
          .details-table td.label { font-weight: 600; color: #475569; width: 40%; }
          .details-table td.value { color: #0f172a; }
          .footer { background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .attachment-notice { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 12px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; margin-top: 20px; display: flex; align-items: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.collegeName}</h1>
            <p>${config.departmentName}</p>
          </div>
          <div class="content">
            <div class="badge">${recipientType === "office" ? "OFFICE COPY" : "FACULTY COPY"} — NAAC DOCUMENTATION</div>
            <p style="font-size: 15px; line-height: 1.6; whitespace: pre-line;">${bodyText.replace(/\n/g, "<br>")}</p>
            
            <div class="details-card">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; color: ${config.primaryColor};">Event Quick Summary</h3>
              <table class="details-table">
                <tr><td class="label">Event Name:</td><td class="value"><strong>${data.eventName}</strong></td></tr>
                <tr><td class="label">Date:</td><td class="value">${data.eventDate}</td></tr>
                <tr><td class="label">Venue:</td><td class="value">${data.eventVenue}</td></tr>
                <tr><td class="label">Coordinator:</td><td class="value">${data.eventCoordinator}</td></tr>
                <tr><td class="label">Participants:</td><td class="value">${data.numberOfParticipants}</td></tr>
              </table>
            </div>

            <div class="attachment-notice">
              📎 <strong>Attached Document:</strong> ${filename}
            </div>
          </div>
          <div class="footer">
            ${config.collegeName} &bull; ${config.naacAccreditation}<br>
            Official Automated Report Generator
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // If SMTP details are not configured, perform clean simulation fallback
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("--------------------------------------------------");
    console.log("✉️ [EMAIL SERVICE SIMULATION MODE ACTIVE]");
    console.log(`[Office Email] To: ${config.officeEmail}`);
    console.log(`Subject: ${officeSubject}`);
    console.log(`Attachment: ${filename} (${pdfBuffer.length} bytes)`);
    console.log("--------------------------------------------------");
    console.log(`[Faculty Email] To: ${data.facultyEmail}`);
    console.log(`Subject: ${facultySubject}`);
    console.log(`Attachment: ${filename} (${pdfBuffer.length} bytes)`);
    console.log("--------------------------------------------------");

    return {
      success: true,
      officeEmailSent: true,
      facultyEmailSent: true,
      simulated: true,
      message:
        "Report generated and simulated email dispatch completed successfully.",
    };
  }

  // Real SMTP Transport dispatch
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const attachment = {
      filename,
      content: pdfBuffer,
      contentType: "application/pdf",
    };

    // Send to College Office Email
    const officePromise = transporter.sendMail({
      from: smtpFrom,
      to: config.officeEmail,
      subject: officeSubject,
      text: officeBodyText,
      html: buildHtmlEmail("office", officeBodyText),
      attachments: [attachment],
    });

    // Send to Faculty Email
    const facultyPromise = transporter.sendMail({
      from: smtpFrom,
      to: data.facultyEmail,
      subject: facultySubject,
      text: facultyBodyText,
      html: buildHtmlEmail("faculty", facultyBodyText),
      attachments: [attachment],
    });

    await Promise.all([officePromise, facultyPromise]);

    return {
      success: true,
      officeEmailSent: true,
      facultyEmailSent: true,
      simulated: false,
      message: `Event report emailed successfully to ${config.officeEmail} and ${data.facultyEmail}`,
    };
  } catch (error: any) {
    console.error("❌ Email Dispatch Failure:", error);
    return {
      success: false,
      officeEmailSent: false,
      facultyEmailSent: false,
      simulated: false,
      message:
        error?.message || "Failed to send report emails via SMTP transport.",
    };
  }
}
