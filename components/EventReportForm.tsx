"use client";

import React, { useState } from "react";
import { InstitutionConfig } from "@/config/institutionConfig";
import { EventReportData } from "@/lib/pdfGenerator";
import {
  Calendar,
  MapPin,
  User,
  Mail,
  Users,
  Target,
  FileText,
  CheckCircle,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  Sparkles,
  Info,
} from "lucide-react";

interface EventReportFormProps {
  config: InstitutionConfig;
  onSuccess: (result: {
    pdfBase64: string;
    filename: string;
    message: string;
    simulated: boolean;
  }) => void;
}

export const EventReportForm: React.FC<EventReportFormProps> = ({
  config,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<
    Omit<EventReportData, "photographs" | "brochureImages" | "participantListImages">
  >({
    eventName: "",
    eventDate: new Date().toISOString().split("T")[0],
    eventVenue: "",
    eventCoordinator: "",
    facultyEmail: "",
    numberOfParticipants: 0,
    objectives: "",
    detailedReport: "",
    programOutcomes: "",
    additionalInfo: "",
  });

  const [photos, setPhotos] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [brochures, setBrochures] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [participantLists, setParticipantLists] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Field change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "numberOfParticipants" ? parseInt(value, 10) || 0 : value,
    }));

    // Clear error for field on edit
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  // Image Upload Handler
  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;

    const newPhotos: { id: string; file: File; preview: string }[] = [];
    const photoErrors: string[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        photoErrors.push(`${file.name} is not a valid image file.`);
        return;
      }

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        photoErrors.push(`${file.name} exceeds 5MB size limit.`);
        return;
      }

      const id = Math.random().toString(36).substring(2, 9);
      const preview = URL.createObjectURL(file);
      newPhotos.push({ id, file, preview });
    });

    if (photoErrors.length > 0) {
      setErrors((prev) => ({ ...prev, photographs: photoErrors.join(" ") }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.photographs;
        return copy;
      });
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Brochure Upload Handler
  const handleBrochureUpload = (files: FileList | null) => {
    if (!files) return;

    const newBrochures: { id: string; file: File; preview: string }[] = [];
    const itemErrors: string[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        itemErrors.push(`${file.name} is not a valid image file.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        itemErrors.push(`${file.name} exceeds 5MB size limit.`);
        return;
      }

      const id = Math.random().toString(36).substring(2, 9);
      const preview = URL.createObjectURL(file);
      newBrochures.push({ id, file, preview });
    });

    if (itemErrors.length > 0) {
      setErrors((prev) => ({ ...prev, brochureImages: itemErrors.join(" ") }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.brochureImages;
        return copy;
      });
    }

    setBrochures((prev) => [...prev, ...newBrochures]);
  };

  const removeBrochure = (id: string) => {
    setBrochures((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Participant List Upload Handler
  const handleParticipantListUpload = (files: FileList | null) => {
    if (!files) return;

    const newLists: { id: string; file: File; preview: string }[] = [];
    const itemErrors: string[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        itemErrors.push(`${file.name} is not a valid image file.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        itemErrors.push(`${file.name} exceeds 5MB size limit.`);
        return;
      }

      const id = Math.random().toString(36).substring(2, 9);
      const preview = URL.createObjectURL(file);
      newLists.push({ id, file, preview });
    });

    if (itemErrors.length > 0) {
      setErrors((prev) => ({ ...prev, participantListImages: itemErrors.join(" ") }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.participantListImages;
        return copy;
      });
    }

    setParticipantLists((prev) => [...prev, ...newLists]);
  };

  const removeParticipantList = (id: string) => {
    setParticipantLists((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Client Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.eventName.trim()) {
      newErrors.eventName = "Please enter the Event Name.";
    }
    if (!formData.eventDate.trim()) {
      newErrors.eventDate = "Please select the Event Date.";
    }
    if (!formData.eventVenue.trim()) {
      newErrors.eventVenue = "Please enter the Event Venue.";
    }
    if (!formData.eventCoordinator.trim()) {
      newErrors.eventCoordinator = "Please enter the Event Coordinator name.";
    }
    if (!formData.facultyEmail.trim()) {
      newErrors.facultyEmail = "Please enter your Faculty Email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.facultyEmail.trim())
    ) {
      newErrors.facultyEmail = "Please enter a valid email address.";
    }
    if (formData.numberOfParticipants <= 0) {
      newErrors.numberOfParticipants =
        "Please enter a valid positive number of participants.";
    }
    if (!formData.objectives.trim()) {
      newErrors.objectives = "Please describe the Objectives of the Event.";
    }
    if (!formData.detailedReport.trim()) {
      newErrors.detailedReport = "Please enter the Detailed Event Report.";
    }
    if (!formData.programOutcomes.trim()) {
      newErrors.programOutcomes = "Please enter the Program Outcomes.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.getElementsByName(firstErrorKey)[0];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("eventName", formData.eventName.trim());
      payload.append("eventDate", formData.eventDate.trim());
      payload.append("eventVenue", formData.eventVenue.trim());
      payload.append("eventCoordinator", formData.eventCoordinator.trim());
      payload.append("facultyEmail", formData.facultyEmail.trim());
      payload.append(
        "numberOfParticipants",
        String(formData.numberOfParticipants)
      );
      payload.append("objectives", formData.objectives.trim());
      payload.append("detailedReport", formData.detailedReport.trim());
      payload.append("programOutcomes", formData.programOutcomes.trim());
      payload.append("additionalInfo", formData.additionalInfo?.trim() || "");

      // Send current custom config
      payload.append("customConfig", JSON.stringify(config));

      // Append photographs
      photos.forEach((photoObj) => {
        payload.append("photographs", photoObj.file);
      });

      // Append brochure images
      brochures.forEach((item) => {
        payload.append("brochureImages", item.file);
      });

      // Append participant list images
      participantLists.forEach((item) => {
        payload.append("participantListImages", item.file);
      });

      const res = await fetch("/api/generate-report", {
        method: "POST",
        body: payload,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setErrors(data.errors);
        }
        throw new Error(data.message || "Failed to generate event report.");
      }

      onSuccess({
        pdfBase64: data.pdfBase64,
        filename: data.filename,
        message: data.message,
        simulated: data.emailResult?.simulated ?? true,
      });
    } catch (err: any) {
      setServerError(
        err.message || "The report could not be generated. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 px-4">
      {/* Intro Instruction Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start gap-4 relative z-10">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shrink-0 hidden sm:block">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">
              Standardized Event Completion Report
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Enter the details of the recently conducted event. After submission, the system will automatically generate the official NAAC event report PDF and dispatch copy attachments to the college office (
              <span className="font-semibold text-amber-300">{config.officeEmail}</span>) and your email address.
            </p>
          </div>
        </div>
      </div>

      {/* Global Server Error Alert */}
      {serverError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Submission Failed</p>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-8"
        noValidate
      >
        {/* SECTION 1: Key Event Parameters */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              Event Primary Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Event Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  placeholder="e.g. National Seminar on Artificial Intelligence & Ethics"
                  className={`w-full px-4 py-3 text-sm rounded-xl border ${
                    errors.eventName
                      ? "border-red-400 bg-red-50/30"
                      : "border-slate-300 focus:border-blue-600"
                  } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.eventName && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.eventName}
                </p>
              )}
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-700" />
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  errors.eventDate
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-blue-600"
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                disabled={isSubmitting}
              />
              {errors.eventDate && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.eventDate}
                </p>
              )}
            </div>

            {/* Event Venue */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-blue-700" />
                Event Venue <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="eventVenue"
                value={formData.eventVenue}
                onChange={handleChange}
                placeholder="e.g. Main Auditorium / Online Google Meet"
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  errors.eventVenue
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-blue-600"
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                disabled={isSubmitting}
              />
              {errors.eventVenue && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.eventVenue}
                </p>
              )}
            </div>

            {/* Event Coordinator */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <User className="w-4 h-4 text-blue-700" />
                Event Coordinator Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="eventCoordinator"
                value={formData.eventCoordinator}
                onChange={handleChange}
                placeholder="e.g. Dr. Rajesh Kumar, Associate Professor"
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  errors.eventCoordinator
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-blue-600"
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                disabled={isSubmitting}
              />
              {errors.eventCoordinator && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.eventCoordinator}
                </p>
              )}
            </div>

            {/* Faculty Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Mail className="w-4 h-4 text-blue-700" />
                Faculty Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="facultyEmail"
                value={formData.facultyEmail}
                onChange={handleChange}
                placeholder="e.g. rajesh.kumar@college.edu"
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  errors.facultyEmail
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-blue-600"
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                disabled={isSubmitting}
              />
              {errors.facultyEmail && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.facultyEmail}
                </p>
              )}
            </div>

            {/* Number of Participants */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-700" />
                Number of Participants <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="numberOfParticipants"
                value={formData.numberOfParticipants || ""}
                onChange={handleChange}
                min={1}
                placeholder="e.g. 120"
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  errors.numberOfParticipants
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-blue-600"
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                disabled={isSubmitting}
              />
              {errors.numberOfParticipants && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.numberOfParticipants}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Detailed Text Content */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              Objectives, Summary & Outcomes
            </h3>
          </div>

          <div className="space-y-6">
            {/* Objectives */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Target className="w-4 h-4 text-amber-600" />
                Objectives of the Event <span className="text-red-500">*</span>
              </label>
              <textarea
                name="objectives"
                value={formData.objectives}
                onChange={handleChange}
                rows={3}
                placeholder="Briefly state the main goals, scope, and objectives of conducting this event..."
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  errors.objectives
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-blue-600"
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                disabled={isSubmitting}
              />
              {errors.objectives && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.objectives}
                </p>
              )}
            </div>

            {/* Detailed Event Report */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <FileText className="w-4 h-4 text-amber-600" />
                Detailed Event Report <span className="text-red-500">*</span>
              </label>
              <textarea
                name="detailedReport"
                value={formData.detailedReport}
                onChange={handleChange}
                rows={5}
                placeholder="Provide a comprehensive narrative of the program execution, keynote sessions, participant engagement, technical discussions, and schedule..."
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  errors.detailedReport
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-blue-600"
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                disabled={isSubmitting}
              />
              {errors.detailedReport && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.detailedReport}
                </p>
              )}
            </div>

            {/* Program Outcomes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-amber-600" />
                Program Outcomes <span className="text-red-500">*</span>
              </label>
              <textarea
                name="programOutcomes"
                value={formData.programOutcomes}
                onChange={handleChange}
                rows={3}
                placeholder="Highlight the key takeaways, student learning outcomes, skills acquired, or future follow-up initiatives..."
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  errors.programOutcomes
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-blue-600"
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all`}
                disabled={isSubmitting}
              />
              {errors.programOutcomes && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.programOutcomes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Event Documentation, Photographs & Supplemental Info */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              Event Documentation, Photographs & Supplemental Information
            </h3>
          </div>

          <div className="space-y-6">
            {/* 1. Event Brochure / Flyer / Circular */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-700" />
                Event Brochure / Flyer / Circular <span className="text-slate-400 font-normal">(Optional)</span>
              </label>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="brochure-upload"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => handleBrochureUpload(e.target.files)}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="brochure-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload event brochure / circular
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Brochure, invitation, or event poster (PNG, JPG, or WebP up to 5MB)
                    </p>
                  </div>
                </label>
              </div>

              {errors.brochureImages && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.brochureImages}
                </p>
              )}

              {/* Brochure Previews */}
              {brochures.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {brochures.map((item, index) => (
                    <div
                      key={item.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-xs aspect-4/3 bg-slate-900"
                    >
                      <img
                        src={item.preview}
                        alt={`Brochure preview ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <button
                        type="button"
                        onClick={() => removeBrochure(item.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 hover:bg-red-700 transition-all shadow-md"
                        title="Remove brochure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white text-center">
                        Brochure #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Event Photographs */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-700" />
                Event Photographs <span className="text-slate-400 font-normal">(Optional)</span>
              </label>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload event photos
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Geo-tagged / high-res photos (PNG, JPG, or WebP up to 5MB each)
                    </p>
                  </div>
                </label>
              </div>

              {errors.photographs && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.photographs}
                </p>
              )}

              {/* Photo Previews */}
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-xs aspect-4/3 bg-slate-900"
                    >
                      <img
                        src={photo.preview}
                        alt={`Upload preview ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 hover:bg-red-700 transition-all shadow-md"
                        title="Remove photograph"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white text-center">
                        Photo #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Participant List / Attendance Sheet */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-700" />
                Participant List / Attendance Sheet <span className="text-slate-400 font-normal">(Optional)</span>
              </label>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="participant-upload"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => handleParticipantListUpload(e.target.files)}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="participant-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload participant list / attendance sheet
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scanned attendance sheet or attendee roster (PNG, JPG, or WebP up to 5MB)
                    </p>
                  </div>
                </label>
              </div>

              {errors.participantListImages && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.participantListImages}
                </p>
              )}

              {/* Participant List Previews */}
              {participantLists.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {participantLists.map((item, index) => (
                    <div
                      key={item.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-xs aspect-4/3 bg-slate-900"
                    >
                      <img
                        src={item.preview}
                        alt={`Participant list preview ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <button
                        type="button"
                        onClick={() => removeParticipantList(item.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 hover:bg-red-700 transition-all shadow-md"
                        title="Remove participant list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white text-center">
                        Attendance Page #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Additional Information */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Additional Information <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleChange}
                rows={3}
                placeholder="Any chief guest details, media coverage links, sponsor credits, or special notes..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Copies will be sent to <strong>{config.officeEmail}</strong> and your email.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-extrabold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-800 active:scale-98"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span>Generating your event report. Please wait...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>Generate & Submit Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
