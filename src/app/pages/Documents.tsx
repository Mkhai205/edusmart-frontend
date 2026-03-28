"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  UploadCloud,
  FileText,
  FileSearch,
  ArrowRight,
  Loader2,
  Download,
  FileUp,
  CheckCircle2,
  Layers,
  HelpCircle,
} from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { MarkdownPreview } from "@/features/workspace/components/markdown-preview";
import {
  getDocumentDetail,
  getDocumentDownloadUrl,
  getLatestSummaryStatus,
  getSummaryStatus,
  listDocuments,
  queueSummary,
  uploadDocument,
} from "@/features/workspace/services/documentsService";
import {
  queueFlashcardGeneration,
  queueQuizGeneration,
} from "@/features/workspace/services/learningService";
import { ApiError } from "@/libs/apiClient";
import type { DocumentListItem } from "@/features/workspace/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function Documents() {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const initSession = useAuthStore((state) => state.initSession);

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summaryMarkdown, setSummaryMarkdown] = useState("");

  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQueueingQuiz, setIsQueueingQuiz] = useState(false);
  const [isQueueingFlashcard, setIsQueueingFlashcard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noSummaryDocumentIds, setNoSummaryDocumentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!initialized) {
      void initSession();
    }
  }, [initSession, initialized]);

  const loadDocuments = async (preferredDocumentId?: string) => {
    if (!initialized || status !== "authenticated") {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const list = await listDocuments(20, 0);
      setDocuments(list);

      const resolvedDocumentId = preferredDocumentId ?? selectedDocumentId ?? list[0]?.document_id ?? null;
      setSelectedDocumentId(resolvedDocumentId);

      if (resolvedDocumentId) {
        if (noSummaryDocumentIds.has(resolvedDocumentId)) {
          setSummaryMarkdown("");
          return;
        }

        try {
          const latestSummary = await getLatestSummaryStatus(resolvedDocumentId);
          if (latestSummary.summary_status === "completed" && latestSummary.content_markdown) {
            setSummaryMarkdown(latestSummary.content_markdown);
          } else {
            setSummaryMarkdown("");
          }
        } catch (loadSummaryError) {
          if (loadSummaryError instanceof ApiError && loadSummaryError.status === 404) {
            setNoSummaryDocumentIds((prev) => {
              const next = new Set(prev);
              next.add(resolvedDocumentId);
              return next;
            });
          }
          setSummaryMarkdown("");
        }
      }
    } catch {
      setError("Không thể tải danh sách tài liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, status]);

  const selectedDocument = useMemo(() => {
    return documents.find((item) => item.document_id === selectedDocumentId) ?? null;
  }, [documents, selectedDocumentId]);

  const waitForExtractionCompleted = async (documentId: string): Promise<boolean> => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const detail = await getDocumentDetail(documentId);

      if (detail.extraction_status === "completed") {
        return true;
      }

      if (detail.extraction_status === "failed") {
        throw new Error(detail.extraction_error ?? "Trích xuất nội dung thất bại.");
      }

      await sleep(1500);
    }

    return false;
  };

  const generateSummaryForDocument = async (documentId: string) => {
    const queued = await queueSummary(documentId, { mode: "full_map_reduce" });
    let resolvedSummary: string | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const statusResponse = await getSummaryStatus(documentId, queued.summary_id);

      if (statusResponse.summary_status === "completed" && statusResponse.content_markdown) {
        resolvedSummary = statusResponse.content_markdown;
        break;
      }

      if (statusResponse.summary_status === "failed") {
        throw new Error(statusResponse.summary_error ?? "Tạo tóm tắt thất bại.");
      }

      await sleep(1500);
    }

    if (resolvedSummary) {
      setNoSummaryDocumentIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
      setSummaryMarkdown(resolvedSummary);
      setNotice("Đã cập nhật bản tóm tắt mới.");
    } else {
      setNotice("Tóm tắt đang tiếp tục xử lý. Vui lòng thử lại sau.");
    }
  };

  const handleCreateQuiz = async () => {
    if (!selectedDocumentId) {
      setError("Vui lòng chọn tài liệu trước khi tạo quiz.");
      return;
    }

    try {
      setIsQueueingQuiz(true);
      setError(null);
      setNotice(null);

      await queueQuizGeneration({
        document_id: selectedDocumentId,
        question_count: 10,
        difficulty: "medium",
      });

      setNotice("Đã gửi yêu cầu tạo quiz. Bạn có thể mở tab Trắc nghiệm để xem kết quả.");
    } catch (quizError) {
      const message = quizError instanceof Error ? quizError.message : "Không thể tạo quiz.";
      setError(message);
    } finally {
      setIsQueueingQuiz(false);
    }
  };

  const handleCreateFlashcards = async () => {
    if (!selectedDocumentId) {
      setError("Vui lòng chọn tài liệu trước khi tạo flashcard.");
      return;
    }

    try {
      setIsQueueingFlashcard(true);
      setError(null);
      setNotice(null);

      await queueFlashcardGeneration({
        document_id: selectedDocumentId,
        card_count: 20,
        include_images: true,
      });

      setNotice("Đã gửi yêu cầu tạo flashcard. Bạn có thể mở tab Thẻ ghi nhớ để xem bộ thẻ.");
    } catch (flashcardError) {
      const message = flashcardError instanceof Error ? flashcardError.message : "Không thể tạo flashcard.";
      setError(message);
    } finally {
      setIsQueueingFlashcard(false);
    }
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
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Tải tài liệu thất bại.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedDocumentId) {
      setError("Vui lòng chọn tài liệu để tạo tóm tắt.");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setNotice(null);

      if (selectedDocument?.extraction_status === "failed") {
        throw new Error("Tài liệu trích xuất thất bại, vui lòng tải lại tệp khác.");
      }

      if (selectedDocument && selectedDocument.extraction_status !== "completed") {
        setNotice("Tài liệu đang được trích xuất, hệ thống sẽ tự đợi rồi tạo tóm tắt.");
        const extractionCompleted = await waitForExtractionCompleted(selectedDocumentId);

        if (!extractionCompleted) {
          setNotice("Tài liệu vẫn đang trích xuất. Vui lòng thử tạo tóm tắt lại sau ít phút.");
          await loadDocuments(selectedDocumentId);
          return;
        }
      }

      await generateSummaryForDocument(selectedDocumentId);
      await loadDocuments(selectedDocumentId);
    } catch (summaryError) {
      const message = summaryError instanceof Error ? summaryError.message : "Không thể tạo tóm tắt.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedDocumentId) {
      return;
    }

    try {
      const payload = await getDocumentDownloadUrl(selectedDocumentId);
      window.open(payload.download_url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Không thể lấy liên kết tải tài liệu.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[#00A651]">Tài liệu & Tóm tắt</h1>
          <p className="text-gray-600 mt-2">
            Tải lên tài liệu của bạn và hệ thống sẽ tự động tạo bản tóm tắt thông minh.
          </p>
        </div>
        <label className="px-4 py-2 text-sm font-medium text-white bg-[#00A651] hover:bg-[#008f45] rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
          <FileUp className="w-4 h-4" />
          Chọn tệp tải lên
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      {(loading || isUploading || isProcessing) && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8 flex flex-col items-center justify-center min-h-[180px]">
          <div className="flex flex-col items-center text-[#00A651] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="font-medium text-gray-700">
              {isUploading
                ? "Đang tải lên tài liệu..."
                : isProcessing
                  ? "Hệ thống đang tạo tóm tắt..."
                  : "Đang tải dữ liệu tài liệu..."}
            </p>
          </div>
        </div>
      )}

      {!loading && !selectedDocument && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 text-[#00A651] rounded-full flex items-center justify-center mx-auto mb-6">
            <UploadCloud className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Chưa có tài liệu</h3>
          <p className="text-gray-500 mb-6">Hãy chọn tệp và bấm tải lên để bắt đầu.</p>
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={!selectedFile || isUploading}
            className="cursor-pointer bg-[#00A651] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#008f45] transition-colors inline-flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-5 h-5" />
            Tải lên ngay
          </button>
        </div>
      )}

      {selectedDocument && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedDocumentId ?? ""}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedDocumentId(nextId);
                void loadDocuments(nextId);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              {documents.map((document) => (
                <option key={document.document_id} value={document.document_id}>
                  {document.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#00A651] hover:bg-[#008f45] rounded-lg transition-colors disabled:opacity-50"
            >
              Tải lên tài liệu mới
            </button>

            <button
              type="button"
              onClick={() => void handleGenerateSummary()}
              disabled={isProcessing || selectedDocument.extraction_status === "failed"}
              className="px-4 py-2 text-sm font-medium text-[#00A651] bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <FileSearch className="w-4 h-4" />
              {selectedDocument.extraction_status === "completed" ? "Tạo tóm tắt" : "Đợi trích xuất rồi tóm tắt"}
            </button>

            <button
              type="button"
              onClick={() => void handleDownload()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tải tài liệu
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-800">Thông tin tài liệu</h3>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-gray-200 text-gray-600 rounded-full">
                  {selectedDocument.content_type.toUpperCase()}
                </span>
              </div>
              <div className="p-6 flex-1 bg-gray-50/50 space-y-3 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Tiêu đề:</span> {selectedDocument.title}
                </p>
                <p>
                  <span className="font-semibold">Dung lượng:</span> {formatBytes(selectedDocument.file_size)}
                </p>
                <p>
                  <span className="font-semibold">Số trang:</span> {selectedDocument.total_pages ?? "Chưa xác định"}
                </p>
                <p>
                  <span className="font-semibold">Trạng thái trích xuất:</span> {selectedDocument.extraction_status}
                </p>
                <p>
                  <span className="font-semibold">Ngày tạo:</span>{" "}
                  {new Date(selectedDocument.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-green-200 flex flex-col overflow-hidden relative">
              <div className="absolute top-1/2 -left-3 lg:-left-4 transform -translate-y-1/2 w-8 h-8 bg-white border border-green-200 rounded-full items-center justify-center shadow-sm z-10 hidden lg:flex">
                <ArrowRight className="w-4 h-4 text-[#00A651]" />
              </div>

              <div className="bg-green-50 px-6 py-4 border-b border-green-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
                  <h3 className="font-semibold text-[#00A651]">Bản tóm tắt</h3>
                </div>
                {summaryMarkdown && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCreateQuiz()}
                      disabled={isQueueingQuiz || isQueueingFlashcard}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-[#00A651] hover:bg-[#008f45] disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Tạo Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCreateFlashcards()}
                      disabled={isQueueingFlashcard || isQueueingQuiz}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-[#00A651] bg-white border border-green-300 hover:bg-green-100 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Tạo Flashcard
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 flex-1 overflow-y-auto max-h-[600px] bg-white">
                {summaryMarkdown ? (
                  <MarkdownPreview title="Tóm tắt AI" content={summaryMarkdown} compact />
                ) : (
                  <p className="text-sm text-gray-500">
                    Tài liệu này chưa có tóm tắt. Bấm Tạo tóm tắt để hệ thống xử lý.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
