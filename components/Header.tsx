"use client";

import React from "react";
import { InstitutionConfig } from "@/config/institutionConfig";
import { Award, Building2, Settings2, Sparkles } from "lucide-react";

interface HeaderProps {
  config: InstitutionConfig;
  onOpenConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({ config, onOpenConfig }) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 transition-all">
      {/* Top accreditation bar */}
      <div className="bg-slate-900 text-slate-100 text-xs py-1.5 px-4 sm:px-8 flex flex-col sm:flex-row justify-between items-center gap-1">
        <div className="flex items-center gap-2 font-medium">
          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{config.naacAccreditation}</span>
        </div>
        <div className="flex items-center gap-4 text-slate-300 text-[11px]">
          <span>AY: {config.academicYear}</span>
          <span className="hidden md:inline">&bull;</span>
          <span className="hidden md:inline">{config.collegeWebsite}</span>
        </div>
      </div>

      {/* Main Institution Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center md:text-left">
          {/* Logo Badge */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-1 border border-slate-200 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src={config.logoUrl || "/logo.jpg"}
              alt={config.collegeName}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                if (target.parentElement) {
                  target.parentElement.innerText = config.collegeName.substring(0, 2).toUpperCase();
                  target.parentElement.className =
                    "w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md shrink-0 border border-slate-700";
                }
              }}
            />
          </div>

          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {config.collegeName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {config.collegeAddress}
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <Building2 className="w-3 h-3" />
                {config.departmentName}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">&bull;</span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                NAAC Portal
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenConfig}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-300 shadow-xs"
            title="Configure College Branding & Settings"
          >
            <Settings2 className="w-4 h-4 text-slate-600" />
            <span>Branding Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
