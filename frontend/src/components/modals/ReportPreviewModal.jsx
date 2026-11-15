import React from 'react';
import { Download, FileCheck } from 'lucide-react';

export default function ReportPreviewModal({
  report,
  darkMode,
  onClose,
  onToast
}) {
  if (!report) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
          darkMode
            ? 'bg-[#121E28] border-slate-700 text-white'
            : 'bg-white border-slate-200 text-[#0A141D]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#00D296]/15 text-[#00D296]">
              {report.status || 'Concluído'}
            </span>
            <h3 className="text-lg font-extrabold mt-2">{report.title}</h3>
            <p className="text-xs text-slate-400">
              {report.patient} {report.tutor ? `• Tutor: ${report.tutor}` : ''} • {report.date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div
          className={`p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto ${
            darkMode
              ? 'bg-[#0A141D] border-slate-800 text-slate-200'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          {report.summary}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {report.docxUrl && (
            <a
              href={report.docxUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => onToast && onToast('Arquivo Word (.docx) baixado com sucesso!')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition ${
                darkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-200 bg-slate-100 text-[#0A141D] hover:bg-slate-200'
              }`}
            >
              <FileCheck className="w-4 h-4 text-[#00D296]" /> Baixar Word (.docx)
            </a>
          )}

          {report.pdfUrl ? (
            <a
              href={report.pdfUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (onToast) onToast('PDF baixado com sucesso!');
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Baixar PDF
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onToast) onToast('PDF baixado com sucesso!');
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
