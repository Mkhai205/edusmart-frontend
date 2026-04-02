import { apiRequest } from "@/libs/apiClient";
import type {
    DocumentDetail,
    DocumentDownloadResponse,
    DocumentExtractionStatusResponse,
    DocumentListItem,
    DocumentSummaryQueuedResponse,
    DocumentSummaryRequest,
    DocumentSummaryStatus,
    DocumentUploadResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
} from "@/features/workspace/types";

function toQueryString(params: Record<string, string | number | undefined>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            searchParams.set(key, String(value));
        }
    });

    return searchParams.toString();
}

export async function listDocuments(limit = 12, offset = 0): Promise<DocumentListItem[]> {
    const query = toQueryString({ limit, offset });

    return apiRequest<DocumentListItem[]>(`/documents?${query}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<DocumentUploadResponse>("/documents/upload", {
        method: "POST",
        body: formData,
        allowAuthRetry: true,
    });
}

export async function getDocumentDownloadUrl(
    documentId: string,
    expiresInSeconds = 900,
): Promise<DocumentDownloadResponse> {
    const query = toQueryString({ expires_in_seconds: expiresInSeconds });

    return apiRequest<DocumentDownloadResponse>(`/documents/${documentId}/download?${query}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function getDocumentDetail(documentId: string): Promise<DocumentDetail> {
    return apiRequest<DocumentDetail>(`/documents/${documentId}/detail`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function getDocumentExtractionStatus(
    documentId: string,
): Promise<DocumentExtractionStatusResponse> {
    return apiRequest<DocumentExtractionStatusResponse>(`/documents/${documentId}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function retryDocumentVectorization(
    documentId: string,
): Promise<DocumentExtractionStatusResponse> {
    return apiRequest<DocumentExtractionStatusResponse>(`/documents/${documentId}/vectorize`, {
        method: "POST",
        allowAuthRetry: true,
    });
}

export async function semanticSearchDocument(
    documentId: string,
    payload: SemanticSearchRequest,
): Promise<SemanticSearchResponse> {
    return apiRequest<SemanticSearchResponse>(`/documents/${documentId}/search`, {
        method: "POST",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}

export async function queueSummary(
    documentId: string,
    payload: DocumentSummaryRequest,
): Promise<DocumentSummaryQueuedResponse> {
    return apiRequest<DocumentSummaryQueuedResponse>(`/documents/${documentId}/summary`, {
        method: "POST",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}

export async function getSummaryStatus(
    documentId: string,
    summaryId: string,
): Promise<DocumentSummaryStatus> {
    return apiRequest<DocumentSummaryStatus>(`/documents/${documentId}/summary/${summaryId}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function getLatestSummaryStatus(documentId: string): Promise<DocumentSummaryStatus> {
    return apiRequest<DocumentSummaryStatus>(`/documents/${documentId}/summary/latest`, {
        method: "GET",
        allowAuthRetry: true,
    });
}
