"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSearch,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCcw,
  Search,
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
  semanticSearchDocument,
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
  SemanticSearchChunkResult,
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

export function Documents() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [documentDetail, setDocumentDetail] = useState<DocumentDetail | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<DocumentExtractionStatusResponse | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<DocumentSummaryStatus | null>(null);

  const [summaryMode, setSummaryMode] = useState<SummaryMode>("full_map_reduce");
  const [summaryStartPage, setSummaryStartPage] = useState("");
  const [summaryEndPage, setSummaryEndPage] = useState("");
  const [summaryKeywords, setSummaryKeywords] = useState("");
  const [summarySearchLimit, setSummarySearchLimit] = useState("5");
  const [summaryMinSimilarity, setSummaryMinSimilarity] = useState("0.2");

  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticLimit, setSemanticLimit] = useState("5");
  const [semanticMinSimilarity, setSemanticMinSimilarity] = useState("0.0");
  const [semanticResults, setSemanticResults] = useState<SemanticSearchChunkResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [isQueueingSummary, setIsQueueingSummary] = useState(false);
  const [isQueueingQuiz, setIsQueueingQuiz] = useState(false);
  const [isQueueingFlashcard, setIsQueueingFlashcard] = useState(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedDocument = useMemo(
    () => documents.find((item) => item.document_id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );
  const previewUrl = documentDetail?.download_url ?? "";
  const isPdfPreviewable = Boolean(previewUrl) && (documentDetail?.content_type ?? "").toLowerCase().includes("pdf");

  const loadDocumentContext = async (documentId: string) => {
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
      const items = await listDocuments(20, 0);
      setDocuments(items);

      const nextId = preferredId ?? selectedDocumentId ?? items[0]?.document_id ?? "";
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

  useEffect(() => {
    void loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn tệp trước khi tải lên.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setNotice(null);
      const uploaded = await uploadDocument(selectedFile);
      setSelectedFile(null);
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

  const handleSemanticSearch = async () => {
    if (!selectedDocumentId) return;

    const query = semanticQuery.trim();
    if (!query) {
      setError("Vui lòng nhập nội dung tìm kiếm ngữ nghĩa.");
      return;
    }

    try {
      setIsSearchingSemantic(true);
      setError(null);
      const payload = await semanticSearchDocument(selectedDocumentId, {
        query,
        limit: Math.max(1, Math.min(20, Number(semanticLimit) || 5)),
        min_similarity: Math.max(0, Math.min(1, Number(semanticMinSimilarity) || 0)),
      });
      setSemanticResults(payload.results);
      if (!payload.results.length) {
        setNotice("Không có kết quả phù hợp cho truy vấn hiện tại.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tìm kiếm ngữ nghĩa.";
      setError(message);
    } finally {
      setIsSearchingSemantic(false);
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
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#00A651]">
            <UploadCloud className="h-4 w-4" />
            Chọn tệp
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={!selectedFile || isUploading}
            className="rounded-xl bg-[#00A651] px-4 py-2 text-sm font-semibold text-white hover:bg-[#008f45] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Đang tải..." : "Tải lên"}
          </button>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDocumentId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedDocumentId(nextId);
                  void loadDocumentContext(nextId);
                }}
                className="min-w-[260px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00A651]"
              >
                {documents.map((item) => (
                  <option key={item.document_id} value={item.document_id}>
                    {item.title}
                  </option>
                ))}
              </select>

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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              {isPdfPreviewable ? (
                <div className="h-[760px]">
                  <PdfViewerPanel fileUrl={previewUrl} fullHeight />
                </div>
              ) : (
                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Xem trước tài liệu</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Tệp hiện tại không phải PDF hoặc chưa có link preview trực tiếp. Bạn vẫn có thể mở/tải tài liệu bằng nút bên dưới.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={isDownloading}
                    className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isDownloading ? "Đang tải..." : "Mở / Tải tài liệu"}
                  </button>
                </article>
              )}

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-slate-900">{selectedDocument.title}</p>
                    <p className="text-xs text-slate-500">
                      Cập nhật: {new Date(selectedDocument.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {formatBytes(selectedDocument.file_size)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <p>Loại tệp: {selectedDocument.content_type}</p>
                  <p>Số trang: {selectedDocument.total_pages ?? "Chưa rõ"}</p>
                  <p>Trạng thái: {extractionStatus?.extraction_status ?? selectedDocument.extraction_status}</p>
                  <p>Trích xuất lúc: {extractionStatus?.extracted_at ? new Date(extractionStatus.extracted_at).toLocaleString("vi-VN") : "-"}</p>
                </div>
              </article>
            </div>

            <div className="space-y-4 lg:col-span-5">
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#0b63c9]" />
                    <h2 className="text-3xl font-semibold text-slate-900">Tóm tắt thông minh AI</h2>
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
                </div>

                <div className="max-h-[340px] overflow-y-auto rounded-2xl bg-slate-50 p-3">
                  {summaryStatus?.content_markdown ? (
                    <MarkdownPreview title="Tóm tắt AI" content={summaryStatus.content_markdown} compact />
                  ) : (
                    <p className="text-sm text-slate-500">Chưa có nội dung tóm tắt. Hãy chọn mode và bấm Tạo tóm tắt.</p>
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex items-center gap-2">
                  <Search className="h-4 w-4 text-[#00A651]" />
                  <h3 className="text-lg font-semibold text-slate-900">Tìm kiếm ngữ nghĩa</h3>
                </div>

                <div className="space-y-2">
                  <input
                    value={semanticQuery}
                    onChange={(event) => setSemanticQuery(event.target.value)}
                    placeholder="Nhập câu hỏi để tìm chunk liên quan"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={semanticLimit}
                      onChange={(event) => setSemanticLimit(event.target.value)}
                      placeholder="Giới hạn kết quả (1-20)"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                    />
                    <input
                      value={semanticMinSimilarity}
                      onChange={(event) => setSemanticMinSimilarity(event.target.value)}
                      placeholder="Độ tương đồng tối thiểu"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00A651]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSemanticSearch()}
                    disabled={isSearchingSemantic}
                    className="rounded-xl border border-[#00A651] bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#00A651] hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {isSearchingSemantic ? "Đang tìm..." : "Tìm kiếm ngữ nghĩa"}
                  </button>
                </div>

                {!!semanticResults.length && (
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {semanticResults.map((item) => (
                      <div key={item.chunk_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Trang {item.page_number} • chunk #{item.chunk_index} • sim {item.similarity.toFixed(3)}
                        </p>
                        <p className="mt-1 text-sm text-slate-700 line-clamp-4">{item.text_content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">Tạo bài học từ tài liệu</h3>
                <div className="flex flex-wrap gap-2">
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
          </div>
        </>
      )}
    </div>
  );
}
