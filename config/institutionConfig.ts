export interface InstitutionConfig {
  collegeName: string;
  collegeAddress: string;
  collegeAffiliation: string;
  naacAccreditation: string;
  departmentName: string;
  academicYear: string;
  officeEmail: string;
  collegeWebsite: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  pdfFilenameFormat: string; // e.g. "Event_Report_{Event_Name}_{Event_Date}.pdf"
  emailSubjectOffice: string;
  emailSubjectFaculty: string;
  emailBodyOffice: string;
  emailBodyFaculty: string;
  signatureTitles: {
    coordinator: string;
    hod: string;
    principal: string;
  };
}

export const defaultInstitutionConfig: InstitutionConfig = {
  collegeName: process.env.NEXT_PUBLIC_COLLEGE_NAME || "Sambhram Academy of Management Studies",
  collegeAddress: process.env.NEXT_PUBLIC_COLLEGE_ADDRESS || "M.S. Palya, Jalahalli East, Bangalore – 560097, Karnataka, India",
  collegeAffiliation: process.env.NEXT_PUBLIC_COLLEGE_AFFILIATION || "Affiliated to Bengaluru City University (BCU) | Recognized by Govt. of Karnataka",
  naacAccreditation: process.env.NEXT_PUBLIC_NAAC_ACCREDITATION || "Accredited by NAAC | Affiliated to Bengaluru City University (BCU) | Recognized by Govt. of Karnataka",
  departmentName: process.env.NEXT_PUBLIC_DEPARTMENT_NAME || "Department of Computer Applications (BCA)",
  academicYear: process.env.NEXT_PUBLIC_ACADEMIC_YEAR || "2025–2026",
  officeEmail: process.env.OFFICE_EMAIL || process.env.NEXT_PUBLIC_OFFICE_EMAIL || "sams@sambhram.org",
  collegeWebsite: process.env.NEXT_PUBLIC_COLLEGE_WEBSITE || "www.sambhram.org",
  logoUrl: process.env.NEXT_PUBLIC_COLLEGE_LOGO || "/images.jpg",
  primaryColor: "#0F2C59",
  secondaryColor: "#D4AF37",
  pdfFilenameFormat: "Event_Report_{Event_Name}_{Event_Date}.pdf",
  emailSubjectOffice: "New NAAC Event Report Submission — {Event_Name}",
  emailSubjectFaculty: "Submission Confirmation: NAAC Event Report — {Event_Name}",
  emailBodyOffice: "A new event report has been successfully generated and submitted.\n\nEvent Name: {Event_Name}\nEvent Date: {Event_Date}\nCoordinator: {Event_Coordinator}\nParticipants: {Number_of_Participants}\n\nThe detailed event report is attached to this email.",
  emailBodyFaculty: "Dear Faculty / Event Coordinator,\n\nYour event report has been successfully generated and submitted to the college office.\n\nEvent Name: {Event_Name}\nEvent Date: {Event_Date}\nCoordinator: {Event_Coordinator}\n\nA copy of the official PDF report is attached for your reference.\n\nThank you for contributing to institutional documentation.",
  signatureTitles: {
    coordinator: "Event Coordinator",
    hod: "Head of Department",
    principal: "Principal / Authorized Signatory",
  },
};

export function formatFilename(template: string, eventName: string, eventDate: string): string {
  const sanitizedEventName = eventName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 50);
  const sanitizedDate = eventDate.replace(/[^0-9-]/g, "");

  return template
    .replace("{Event_Name}", sanitizedEventName || "Event")
    .replace("{Event_Date}", sanitizedDate || "Date");
}
