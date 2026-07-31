"use client";

import React from "react";
import { X, Download, FileCheck, ExternalLink } from "lucide-react";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBase64: string | null;
  filename: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfBase64,
  filename,
}) => {
  if (!isOpen || !pdfBase64) return null;

  const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfDataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold text-sm sm:text-base truncate">
              {filename}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Frame */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 relative">
          <iframe
            src={pdfDataUrl}
            className="w-full h-full rounded-lg border border-slate-300 shadow-inner"
            title="Generated NAAC Event Report PDF"
          />
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Official NAAC Event Completion Document (A4 Standard)</span>
          <a
            href={pdfDataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
          >
            Open in new tab <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
