"use client";

import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { ScrollMode, Viewer, Worker } from "@react-pdf-viewer/core";

interface PdfViewerPanelProps {
    fileUrl: string;
    fullHeight?: boolean;
}

export function PdfViewerPanel({ fileUrl, fullHeight = false }: PdfViewerPanelProps) {
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    const viewerHeight = fullHeight ? "100%" : 560;

    return (
        <section
            className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${
                fullHeight ? "flex h-full min-h-0 flex-col" : ""
            }`}
        >
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Trình xem PDF trực tuyến</h3>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    Xem tài liệu
                </span>
            </div>

            <div
                className={`overflow-hidden rounded-2xl border border-slate-200 ${
                    fullHeight ? "min-h-0 flex-1" : ""
                }`}
            >
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <div className={fullHeight ? "h-full min-h-0" : ""} style={{ height: viewerHeight }}>
                        <Viewer
                            fileUrl={fileUrl}
                            plugins={[defaultLayoutPluginInstance]}
                            scrollMode={ScrollMode.Vertical}
                            pageLayout={{
                                buildPageStyles: () => ({
                                    margin: "0 auto 16px",
                                    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                }),
                            }}
                        />
                    </div>
                </Worker>
            </div>
        </section>
    );
}
