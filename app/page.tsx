"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { EventReportForm } from "@/components/EventReportForm";
import { ConfigModal } from "@/components/ConfigModal";
import { PdfPreviewModal } from "@/components/PdfPreviewModal";
import {
  defaultInstitutionConfig,
  InstitutionConfig,
} from "@/config/institutionConfig";
import {
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  RotateCcw,
  Sparkles,
  MailCheck,
  ShieldCheck,
} from "lucide-react";

export default function Home() {
  const [config, setConfig] = useState<InstitutionConfig>(
    defaultInstitutionConfig
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Success state after report generation
  const [submissionResult, setSubmissionResult] = useState<{
    pdfBase64: string;
    filename: string;
    message: string;
    simulated: boolean;
  } | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleConfigSave = (updated: InstitutionConfig) => {
    setConfig(updated);
  };

  const handleConfigReset = () => {
    setConfig(defaultInstitutionConfig);
  };

  const handleFormSuccess = (result: {
    pdfBase64: string;
    filename: string;
    message: string;
    simulated: boolean;
  }) => {
    setSubmissionResult(result);
    // Scroll to top to view success banner
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownload = () => {
    if (!submissionResult) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${submissionResult.pdfBase64}`;
    link.download = submissionResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateNewReport = () => {
    setSubmissionResult(null);
    setIsPreviewOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        {/* Institutional Branding Header */}
        <Header config={config} onOpenConfig={() => setIsConfigOpen(true)} />

        {/* Main Content Area */}
        <main className="py-6">
          {submissionResult ? (
            /* Success Feedback Banner & Action Screen */
            <div className="max-w-3xl mx-auto my-8 px-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-center p-8 sm:p-12 relative">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-6 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Submission Completed
                </span>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                  Event Report Generated Successfully
                </h2>

                <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed mb-6">
                  {submissionResult.message}
                </p>

                {submissionResult.simulated && (
                  <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3.5 rounded-xl max-w-md mx-auto flex items-center justify-center gap-2">
                    <MailCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Simulation Mode: Dual email dispatch logged to server console. PDF file is ready for download below.
                    </span>
                  </div>
                )}

                {/* PDF Filename Badge */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto mb-8 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {submissionResult.filename}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Official NAAC Document
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                  <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Preview Document</span>
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button
                    onClick={handleCreateNewReport}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Create Another Event Report</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Main Form View */
            <EventReportForm config={config} onSuccess={handleFormSuccess} />
          )}
        </main>
      </div>

      {/* Institutional Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 px-4 border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="font-bold text-white mb-1">{config.collegeName}</p>
            <p>{config.collegeAddress}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-slate-400 text-[11px]">
            <span>{config.naacAccreditation}</span>
            <span className="hidden sm:inline">&bull;</span>
            <span>Event Report Generator</span>
          </div>
        </div>
      </footer>

      {/* Configuration & Branding Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={handleConfigSave}
        onReset={handleConfigReset}
      />

      {/* PDF Visual Preview Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfBase64={submissionResult?.pdfBase64 || null}
        filename={submissionResult?.filename || "Event_Report.pdf"}
      />
    </div>
  );
}
