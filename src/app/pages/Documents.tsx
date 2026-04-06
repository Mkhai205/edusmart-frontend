"use client";

import React, { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCcw,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { MarkdownPreview } from "@/features/workspace/components/markdown-preview";
import { PdfViewerPanel } from "@/features/workspace/components/pdf-viewer-panel";
import {
  getDocumentDetail,
  getDocumentDownloadUrl,
  getDocumentExtractionStatus,
  getLatestSummaryStatus,
  getSummaryStatus,
  listDocuments,
  queueSummary,
  retryDocumentVectorization,
  uploadDocument,
} from "@/features/workspace/services/documentsService";
import {
  queueFlashcardGeneration,
  queueQuizGeneration,
} from "@/features/workspace/services/learningService";
import type {
  DocumentDetail,
  DocumentExtractionStatusResponse,
  DocumentListItem,
  DocumentSummaryRequest,
  DocumentSummaryStatus,
  SummaryMode,
} from "@/features/workspace/types";
import { ApiError } from "@/libs/apiClient";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtractionStatusLabel(status: DocumentListItem["extraction_status"]): string {
  if (status === "completed") return "Đã trích xuất";
  if (status === "processing") return "Đang xử lý";
  if (status === "failed") return "Thất bại";
  return "Đang chờ";
}

function getSummaryStatusLabel(status: DocumentSummaryStatus["summary_status"]): string {
  if (status === "completed") return "Hoàn thành";
  if (status === "processing") return "Đang tóm tắt";
  if (status === "failed") return "Lỗi";
  return "Đang chờ";
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Documents() {
  const searchParams = useSearchParams();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const [hasAutoOpenedUpload, setHasAutoOpenedUpload] = useState(false);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [previewPaneRatio, setPreviewPaneRatio] = useState(50);

  const [documentDetail, setDocumentDetail] = useState<DocumentDetail | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<DocumentExtractionStatusResponse | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<DocumentSummaryStatus | null>(null);

  const [summaryMode, setSummaryMode] = useState<SummaryMode>("full_map_reduce");
  const [summaryStartPage, setSummaryStartPage] = useState("");
  const [summaryEndPage, setSummaryEndPage] = useState("");
  const [summaryKeywords, setSummaryKeywords] = useState("");
  const [summarySearchLimit, setSummarySearchLimit] = useState("5");
  const [summaryMinSimilarity, setSummaryMinSimilarity] = useState("0.2");

  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [isQueueingSummary, setIsQueueingSummary] = useState(false);
  const [isQueueingQuiz, setIsQueueingQuiz] = useState(false);
  const [isQueueingFlashcard, setIsQueueingFlashcard] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedDocument = useMemo(
    () => documents.find((item) => item.document_id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );
  const previewUrl = documentDetail?.download_url ?? "";
  const isPdfPreviewable = Boolean(previewUrl) && (documentDetail?.content_type ?? "").toLowerCase().includes("pdf");

  const loadDocumentContext = async (documentId: string) => {
    setDocumentDetail(null);
    setExtractionStatus(null);
    setSummaryStatus(null);

    const [detailResult, statusResult, latestSummaryResult] = await Promise.allSettled([
      getDocumentDetail(documentId),
      getDocumentExtractionStatus(documentId),
      getLatestSummaryStatus(documentId),
    ]);

    if (detailResult.status === "fulfilled") {
      setDocumentDetail(detailResult.value);
    }

    if (statusResult.status === "fulfilled") {
      setExtractionStatus(statusResult.value);
    }

    if (latestSummaryResult.status === "fulfilled") {
      setSummaryStatus(latestSummaryResult.value);
      return;
    }

    if (latestSummaryResult.reason instanceof ApiError && latestSummaryResult.reason.status === 404) {
      setSummaryStatus(null);
      return;
    }

    setSummaryStatus(null);
  };

  const loadDocuments = async (preferredId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const items = await listDocuments(100, 0);
      setDocuments(items);

      const preferredExists = preferredId ? items.some((item) => item.document_id === preferredId) : false;
      const selectedExists = selectedDocumentId ? items.some((item) => item.document_id === selectedDocumentId) : false;
      const nextId: string = preferredExists
        ? (preferredId ?? "")
        : selectedExists
          ? selectedDocumentId
          : items[0]?.document_id ?? "";
      setSelectedDocumentId(nextId);

      if (nextId) {
        await loadDocumentContext(nextId);
      } else {
        setDocumentDetail(null);
        setExtractionStatus(null);
        setSummaryStatus(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải dữ liệu tài liệu.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocument = (nextId: string) => {
    setSelectedDocumentId(nextId);
    setError(null);
    setNotice(null);
    void loadDocumentContext(nextId);
  };

  const startResizeMainPanels = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    const container = splitContainerRef.current;
    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const startX = event.clientX;
    const startRatio = previewPaneRatio;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaRatio = (deltaX / containerRect.width) * 100;
      const nextRatio = Math.min(70, Math.max(30, startRatio + deltaRatio));
      setPreviewPaneRatio(nextRatio);
    };

    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  useEffect(() => {
    void loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const shouldOpenUpload = searchParams.get("openUpload") === "1";
    if (!shouldOpenUpload || hasAutoOpenedUpload) {
      return;
    }

    setHasAutoOpenedUpload(true);
    window.setTimeout(() => {
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
        uploadInputRef.current.click();
      }
    }, 0);
  }, [hasAutoOpenedUpload, searchParams]);

  const pollSummaryUntilDone = async (documentId: string, summaryId: string) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const latest = await getSummaryStatus(documentId, summaryId);
      setSummaryStatus(latest);

      if (latest.summary_status === "completed") {
        setNotice("Đã cập nhật bản tóm tắt mới.");
        return;
      }

      if (latest.summary_status === "failed") {
        throw new Error(latest.summary_error ?? "Tạo tóm tắt thất bại.");
      }

      await sleep(1500);
    }

    setNotice("Bản tóm tắt đang tiếp tục xử lý, vui lòng tải lại sau ít phút.");
  };

  const handleUpload = async (fileToUpload?: File) => {

    if (!fileToUpload) {
      setError("Vui lòng chọn tệp trước khi tải lên.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setNotice(null);
      const uploaded = await uploadDocument(fileToUpload);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      setNotice("Tải tài liệu thành công.");
      await loadDocuments(uploaded.document_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tải tài liệu thất bại.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedDocumentId) return;

    try {
      setIsDownloading(true);
      setError(null);
      const payload = await getDocumentDownloadUrl(selectedDocumentId);
      window.open(payload.download_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lấy liên kết tải tài liệu.";
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCheckExtractionStatus = async () => {
    if (!selectedDocumentId) return;

    try {
      setIsCheckingStatus(true);
      setError(null);
      const statusPayload = await getDocumentExtractionStatus(selectedDocumentId);
      setExtractionStatus(statusPayload);
      await loadDocumentContext(selectedDocumentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể kiểm tra trạng thái trích xuất.";
      setError(message);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleRetryVectorize = async () => {
    if (!selectedDocumentId) return;

    try {
      setIsVectorizing(true);
      setError(null);
      setNotice(null);
      const payload = await retryDocumentVectorization(selectedDocumentId);
      setExtractionStatus(payload);
      setNotice("Đã gửi yêu cầu vector hóa lại tài liệu.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể gửi yêu cầu vector hóa lại.";
      setError(message);
    } finally {
      setIsVectorizing(false);
    }
  };

  const handleQueueSummary = async () => {
    if (!selectedDocumentId) return;

    const payload: DocumentSummaryRequest = {
      mode: summaryMode,
    };

    if (summaryMode === "page_range") {
      const start = Number(summaryStartPage);
      const end = Number(summaryEndPage);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0 || start > end) {
        setError("Khoảng trang không hợp lệ. Hãy nhập start/end page hợp lệ.");
        return;
      }
      payload.start_page = start;
      payload.end_page = end;
    }

    if (summaryMode === "keyword_hybrid") {
      const keywords = summaryKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (!keywords.length) {
        setError("Vui lòng nhập ít nhất một từ khóa cho chế độ keyword_hybrid.");
        return;
      }
      payload.keywords = keywords;
      payload.search_limit = Math.max(1, Math.min(30, Number(summarySearchLimit) || 5));
      payload.min_similarity = Math.max(0, Math.min(1, Number(summaryMinSimilarity) || 0.2));
    }

    try {
      setIsQueueingSummary(true);
      setError(null);
      setNotice(null);

      const queued = await queueSummary(selectedDocumentId, payload);
      setSummaryStatus({
        ...queued,
        content_markdown: null,
        summary_error: null,
        share_token: null,
        sources: null,
        completed_at: null,
      });

      await pollSummaryUntilDone(selectedDocumentId, queued.summary_id);
      await loadDocumentContext(selectedDocumentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo tóm tắt.";
      setError(message);
    } finally {
      setIsQueueingSummary(false);
    }
  };

  const handleRefreshLatestSummary = async () => {
    if (!selectedDocumentId) return;

    try {
      setError(null);
      const latest = await getLatestSummaryStatus(selectedDocumentId);
      setSummaryStatus(latest);
      setNotice("Đã tải trạng thái tóm tắt mới nhất.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSummaryStatus(null);
        setNotice("Tài liệu này chưa có bản tóm tắt nào.");
        return;
      }
      const message = err instanceof Error ? err.message : "Không thể tải tóm tắt mới nhất.";
      setError(message);
    }
  };

  const handleQueueQuiz = async () => {
    if (!selectedDocumentId) return;

    try {
      setIsQueueingQuiz(true);
      setError(null);
      await queueQuizGeneration({
        document_id: selectedDocumentId,
        question_count: 10,
        difficulty: "medium",
      });
      setNotice("Đã gửi yêu cầu tạo quiz từ tài liệu.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo quiz.";
      setError(message);
    } finally {
      setIsQueueingQuiz(false);
    }
  };

  const handleQueueFlashcards = async () => {
    if (!selectedDocumentId) return;

    try {
      setIsQueueingFlashcard(true);
      setError(null);
      await queueFlashcardGeneration({
        document_id: selectedDocumentId,
        card_count: 20,
        include_images: true,
      });
      setNotice("Đã gửi yêu cầu tạo flashcard từ tài liệu.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo flashcard.";
      setError(message);
    } finally {
      setIsQueueingFlashcard(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-green-100 pb-3">
        <div>
          <h1 className="text-3xl font-bold text-[#00A651]">Tài liệu & Tóm tắt</h1>
          <p className="mt-1 text-sm text-slate-600">Bố cục làm việc tập trung: đọc tài liệu, tóm tắt AI và tạo bài học trong một màn hình.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (uploadInputRef.current) {
                uploadInputRef.current.value = "";
                uploadInputRef.current.click();
              }
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#00A651]"
          >
            <UploadCloud className="h-4 w-4" />
            Tải tài liệu
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file) {
                void handleUpload(file);
              }
            }}
          />
          {isUploading && <span className="text-xs text-slate-500">Đang tải tệp lên...</span>}
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[#00A651]" />
          Đang tải dữ liệu tài liệu...
        </div>
      )}

      {!loading && !documents.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Chưa có tài liệu nào. Hãy tải tệp để bắt đầu.</p>
        </div>
      )}

      {!loading && !!documents.length && selectedDocument && (
        <>
          <div className="flex flex-col gap-5 xl:flex-row">
            {isSidebarOpen ? (
              <aside className="w-full rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:w-[320px] xl:shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Tài liệu đã upload</h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {documents.length} tệp
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSidebarOpen(false);
                      }}
                      className="hidden rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 xl:inline-flex"
                      title="Thu gọn cột tài liệu"
                      aria-label="Thu gọn cột tài liệu"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
                  {documents.map((item) => {
                    const isActive = item.document_id === selectedDocumentId;

                    return (
                      <button
                        key={item.document_id}
                        type="button"
                        onClick={() => {
                          handleSelectDocument(item.document_id);
                        }}
                        className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                          isActive
                            ? "border-[#00A651] bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-emerald-300"
                        }`}
                      >
                        <p className="truncate font-medium text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{formatBytes(item.file_size)}</span>
                          <span>{getExtractionStatusLabel(item.extraction_status)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>
            ) : (
              <div className="hidden xl:flex xl:w-10 xl:shrink-0 xl:items-start xl:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(true);
                  }}
                  className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50"
                  title="Mở cột tài liệu"
                  aria-label="Mở cột tài liệu"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <section className="min-w-0 flex-1 space-y-4">
              {!isSidebarOpen && (
                <div className="hidden xl:block">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                    Mở danh sách tài liệu
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Trích xuất: {getExtractionStatusLabel(selectedDocument.extraction_status)}
                  </span>

                  <button
                    type="button"
                    onClick={() => void handleCheckExtractionStatus()}
                    disabled={isCheckingStatus}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isCheckingStatus ? "Đang kiểm tra..." : "Kiểm tra trạng thái"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleRetryVectorize()}
                    disabled={isVectorizing}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {isVectorizing ? "Đang gửi..." : "Vectorize lại"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={isDownloading}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      {isDownloading ? "Đang tải..." : "Tải tài liệu"}
                    </span>
                  </button>
                </div>
              </div>

              <div
                ref={splitContainerRef}
                className="flex flex-col gap-5 xl:h-[calc(100vh-70px)] xl:min-h-[620px] xl:flex-row xl:gap-0"
              >
                <article
                  className="flex min-h-[620px] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:h-full xl:min-h-0 xl:rounded-r-none"
                  style={{ width: `min(100%, ${previewPaneRatio}%)` }}
                >
                  <div className="min-h-0 flex-1">
                    {isPdfPreviewable ? (
                      <PdfViewerPanel fileUrl={previewUrl} fullHeight />
                    ) : (
                      <div className="flex h-full flex-col items-start justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm text-slate-600">
                          Tệp hiện tại không phải PDF hoặc chưa có link preview trực tiếp. Bạn vẫn có thể mở/tải tài liệu.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleDownload()}
                          disabled={isDownloading}
                          className="mt-3 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                        >
                          {isDownloading ? "Đang tải..." : "Mở / Tải tài liệu"}
                        </button>
                      </div>
                    )}
                  </div>
                </article>

                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Kéo dãn giữa preview và tóm tắt"
                  onMouseDown={startResizeMainPanels}
                  className="hidden w-3 shrink-0 cursor-col-resize bg-transparent transition hover:bg-slate-200 xl:block"
                />

                <article
                  className="flex min-h-[620px] min-w-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:h-full xl:min-h-0 xl:rounded-l-none"
                  style={{ width: `min(100%, ${100 - previewPaneRatio}%)` }}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#0b63c9]" />
                      <h2 className="text-2xl font-semibold text-slate-900">Tóm tắt AI</h2>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {summaryStatus ? getSummaryStatusLabel(summaryStatus.summary_status) : "Chưa có"}
                    </span>
                  </div>

                  <div className="mb-3 grid grid-cols-1 gap-2">
                    <select
                      value={summaryMode}
                      onChange={(event) => setSummaryMode(event.target.value as SummaryMode)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                    >
                      <option value="full_map_reduce">Tổng hợp toàn văn (full_map_reduce)</option>
                      <option value="page_range">Tóm tắt theo khoảng trang (page_range)</option>
                      <option value="keyword_hybrid">Tóm tắt theo từ khóa (keyword_hybrid)</option>
                    </select>

                    {summaryMode === "page_range" && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={summaryStartPage}
                          onChange={(event) => setSummaryStartPage(event.target.value)}
                          placeholder="Trang bắt đầu"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                        />
                        <input
                          value={summaryEndPage}
                          onChange={(event) => setSummaryEndPage(event.target.value)}
                          placeholder="Trang kết thúc"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                        />
                      </div>
                    )}

                    {summaryMode === "keyword_hybrid" && (
                      <>
                        <input
                          value={summaryKeywords}
                          onChange={(event) => setSummaryKeywords(event.target.value)}
                          placeholder="Từ khóa, ngăn cách bằng dấu phẩy"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={summarySearchLimit}
                            onChange={(event) => setSummarySearchLimit(event.target.value)}
                            placeholder="Số đoạn tìm (1-30)"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                          />
                          <input
                            value={summaryMinSimilarity}
                            onChange={(event) => setSummaryMinSimilarity(event.target.value)}
                            placeholder="Độ tương đồng (0-1)"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleQueueSummary()}
                      disabled={isQueueingSummary}
                      className="rounded-xl bg-[#0b63c9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084e9f] disabled:opacity-50"
                    >
                      {isQueueingSummary ? "Đang xử lý..." : "Tạo tóm tắt"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRefreshLatestSummary()}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <RefreshCcw className="h-4 w-4" />
                        Mới nhất
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleQueueQuiz()}
                      disabled={isQueueingQuiz}
                      className="rounded-xl bg-[#00A651] px-4 py-2 text-sm font-semibold text-white hover:bg-[#008f45] disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <HelpCircle className="h-4 w-4" />
                        {isQueueingQuiz ? "Đang tạo quiz..." : "Tạo Quiz"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleQueueFlashcards()}
                      disabled={isQueueingFlashcard}
                      className="rounded-xl border border-[#00A651] bg-white px-4 py-2 text-sm font-semibold text-[#00A651] hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-4 w-4" />
                        {isQueueingFlashcard ? "Đang tạo thẻ..." : "Tạo Flashcard"}
                      </span>
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                    {summaryStatus?.content_markdown ? (
                      <MarkdownPreview title="Tóm tắt AI" content={summaryStatus.content_markdown} embedded />
                    ) : (
                      <p className="text-sm text-slate-500">Chưa có nội dung tóm tắt. Hãy chọn mode và bấm Tạo tóm tắt.</p>
                    )}
                  </div>

                  {summaryStatus?.sources?.length ? (
                    <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                      <p className="mb-1 font-semibold">Nguồn tóm tắt (sources)</p>
                      <p>
                        {summaryStatus.sources
                          .slice(0, 6)
                          .map((item) => `p${item.page_number}`)
                          .join(", ")}
                      </p>
                    </div>
                  ) : null}

                  {extractionStatus?.extraction_error ? (
                    <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                      {extractionStatus.extraction_error}
                    </div>
                  ) : null}

                  {documentDetail?.download_url ? (
                    <a
                      href={documentDetail.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0b63c9] hover:text-[#084e9f]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mở link download hiện tại
                    </a>
                  ) : null}
                </article>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
