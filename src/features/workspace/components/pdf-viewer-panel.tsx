"use client";

import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { Viewer, Worker } from "@react-pdf-viewer/core";

interface PdfViewerPanelProps {
    fileUrl: string;
    fullHeight?: boolean;
}

export function PdfViewerPanel({ fileUrl, fullHeight = false }: PdfViewerPanelProps) {
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    const viewerHeight = fullHeight ? "100%" : 560;

    return (
        <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${fullHeight ? "h-full" : ""}`}>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Trình xem PDF trực tuyến</h3>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    Xem tài liệu
                </span>
            </div>

            <div className={`overflow-hidden rounded-2xl border border-slate-200 ${fullHeight ? "h-[calc(100%-52px)]" : ""}`}>
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <div style={{ height: viewerHeight }}>
                        <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} />
                    </div>
                </Worker>
            </div>
        </section>
    );
}
