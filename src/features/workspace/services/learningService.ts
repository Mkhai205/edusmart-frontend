import { apiRequest } from "@/libs/apiClient";
import type {
    FlashcardCard,
    FlashcardGenerateRequest,
    FlashcardQueuedResponse,
    FlashcardReviewResponse,
    FlashcardSetDetail,
    FlashcardSetListItem,
    LearningGoal,
    LearningGoalCreateRequest,
    LearningGoalDashboard,
    QuizDetail,
    QuizGenerateRequest,
    QuizQueuedResponse,
    QuizListItem,
    QuizSubmitAnswer,
    QuizSubmitResponse,
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

export async function getLearningGoalDashboard(): Promise<LearningGoalDashboard> {
    return apiRequest<LearningGoalDashboard>("/learning/goals/dashboard/overview", {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function listQuizzes(
    limit = 8,
    offset = 0,
    documentId?: string,
): Promise<QuizListItem[]> {
    const query = toQueryString({ limit, offset, document_id: documentId });

    return apiRequest<QuizListItem[]>(`/learning/quizzes?${query}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function queueQuizGeneration(payload: QuizGenerateRequest): Promise<QuizQueuedResponse> {
    return apiRequest<QuizQueuedResponse>("/learning/quizzes/generate", {
        method: "POST",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}

export async function getQuizDetail(quizId: string): Promise<QuizDetail> {
    return apiRequest<QuizDetail>(`/learning/quizzes/${quizId}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function submitQuiz(
    quizId: string,
    payload: { answers: QuizSubmitAnswer[]; time_spent_seconds: number },
): Promise<QuizSubmitResponse> {
    return apiRequest<QuizSubmitResponse>(`/learning/quizzes/${quizId}/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}

export async function listFlashcardSets(
    limit = 8,
    offset = 0,
    documentId?: string,
): Promise<FlashcardSetListItem[]> {
    const query = toQueryString({ limit, offset, document_id: documentId });

    return apiRequest<FlashcardSetListItem[]>(`/learning/flashcards?${query}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function queueFlashcardGeneration(
    payload: FlashcardGenerateRequest,
): Promise<FlashcardQueuedResponse> {
    return apiRequest<FlashcardQueuedResponse>("/learning/flashcards/generate", {
        method: "POST",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}

export async function getFlashcardSetDetail(setId: string): Promise<FlashcardSetDetail> {
    return apiRequest<FlashcardSetDetail>(`/learning/flashcards/${setId}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function listFlashcardsInSet(setId: string, limit = 50, offset = 0): Promise<FlashcardCard[]> {
    const query = toQueryString({ limit, offset });

    return apiRequest<FlashcardCard[]>(`/learning/flashcards/${setId}/cards?${query}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function reviewFlashcard(
    cardId: string,
    rating: "hard" | "medium" | "easy",
): Promise<FlashcardReviewResponse> {
    return apiRequest<FlashcardReviewResponse>(`/learning/flashcards/cards/${cardId}/review`, {
        method: "POST",
        body: JSON.stringify({ rating }),
        allowAuthRetry: true,
    });
}

export async function listLearningGoals(
    limit = 8,
    offset = 0,
    documentId?: string,
): Promise<LearningGoal[]> {
    const query = toQueryString({ limit, offset, document_id: documentId });

    return apiRequest<LearningGoal[]>(`/learning/goals?${query}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function createLearningGoal(payload: LearningGoalCreateRequest): Promise<LearningGoal> {
    return apiRequest<LearningGoal>("/learning/goals", {
        method: "POST",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}
