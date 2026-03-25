const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface ApiRequestOptions extends RequestInit {
    allowAuthRetry?: boolean;
}

export class ApiError extends Error {
    status: number;
    detail: string;

    constructor(status: number, detail: string) {
        super(detail);
        this.name = "ApiError";
        this.status = status;
        this.detail = detail;
    }
}

function buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type") ?? "";
    const hasJsonBody = contentType.includes("application/json");

    if (!response.ok) {
        let detail = `Request failed with status ${response.status}`;

        if (hasJsonBody) {
            const payload = (await response.json()) as { detail?: string | { message?: string } };
            if (typeof payload.detail === "string") {
                detail = payload.detail;
            } else if (
                payload.detail &&
                typeof payload.detail === "object" &&
                payload.detail.message
            ) {
                detail = payload.detail.message;
            }
        }

        throw new ApiError(response.status, detail);
    }

    if (!hasJsonBody) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

async function rawRequest(path: string, init?: RequestInit): Promise<Response> {
    const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

    return fetch(buildUrl(path), {
        ...init,
        credentials: "include",
        headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...(init?.headers ?? {}),
        },
    });
}

export async function apiRequest<T>(path: string, init?: ApiRequestOptions): Promise<T> {
    const allowAuthRetry = Boolean(init?.allowAuthRetry);
    const requestInit: RequestInit = { ...init };
    delete (requestInit as ApiRequestOptions).allowAuthRetry;

    try {
        const response = await rawRequest(path, requestInit);
        return await parseResponse<T>(response);
    } catch (error) {
        const isUnauthorized = error instanceof ApiError && error.status === 401;
        const canRetry = allowAuthRetry && !path.startsWith("/auth/refresh");

        if (!isUnauthorized || !canRetry) {
            throw error;
        }

        await apiRequest("/auth/refresh", {
            method: "POST",
            allowAuthRetry: false,
        });

        const retriedResponse = await rawRequest(path, requestInit);
        return parseResponse<T>(retriedResponse);
    }
}

export function getApiBaseUrl(): string {
    return API_BASE_URL;
}
