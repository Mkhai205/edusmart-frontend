import { apiRequest } from "@/libs/apiClient";
import type {
    FlashcardCard,
    FlashcardGenerateRequest,
    FlashcardQueuedResponse,
    FlashcardReviewResponse,
    FlashcardSetDetail,
    FlashcardSetListItem,
    GoalRecurrenceType,
    LearningGoal,
    LearningGoalCreateRequest,
    LearningGoalDashboard,
    LearningGoalProgressLog,
    LearningGoalProgressUpdateRequest,
    LearningGoalUpdateRequest,
    MilestoneSuggestionRequest,
    MilestoneSuggestionResponse,
    QuizDetail,
    QuizGenerateRequest,
    QuizQueuedResponse,
    QuizListItem,
    QuizSubmitAnswer,
    QuizSubmitResponse,
    ReminderChannel,
    ReminderFeedItem,
    ReminderPreference,
    ReminderPreferenceUpdateRequest,
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

interface ListGoalsOptions {
    limit?: number;
    offset?: number;
    status?: LearningGoal["status"];
    recurrenceType?: GoalRecurrenceType;
    documentId?: string;
    dueFrom?: string;
    dueTo?: string;
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

export async function listLearningGoals(options: ListGoalsOptions = {}): Promise<LearningGoal[]> {
    const {
        limit = 8,
        offset = 0,
        status,
        recurrenceType,
        documentId,
        dueFrom,
        dueTo,
    } = options;

    const query = toQueryString({
        limit,
        offset,
        status,
        recurrence_type: recurrenceType,
        document_id: documentId,
        due_from: dueFrom,
        due_to: dueTo,
    });
    const suffix = query ? `?${query}` : "";

    return apiRequest<LearningGoal[]>(`/learning/goals${suffix}`, {
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

export async function getLearningGoal(goalId: string): Promise<LearningGoal> {
    return apiRequest<LearningGoal>(`/learning/goals/${goalId}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function updateLearningGoal(
    goalId: string,
    payload: LearningGoalUpdateRequest,
): Promise<LearningGoal> {
    return apiRequest<LearningGoal>(`/learning/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}

export async function deleteLearningGoal(goalId: string): Promise<void> {
    await apiRequest(`/learning/goals/${goalId}`, {
        method: "DELETE",
        allowAuthRetry: true,
    });
}

export async function updateLearningGoalProgress(
    goalId: string,
    payload: LearningGoalProgressUpdateRequest,
): Promise<LearningGoal> {
    return apiRequest<LearningGoal>(`/learning/goals/${goalId}/progress`, {
        method: "POST",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}

export async function listLearningGoalProgressLogs(
    goalId: string,
    limit = 30,
    offset = 0,
): Promise<LearningGoalProgressLog[]> {
    const query = toQueryString({ limit, offset });
    return apiRequest<LearningGoalProgressLog[]>(`/learning/goals/${goalId}/progress?${query}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function listReminderFeed(
    limit = 20,
    offset = 0,
    channel?: ReminderChannel,
): Promise<ReminderFeedItem[]> {
    const query = toQueryString({ limit, offset, channel });
    const suffix = query ? `?${query}` : "";
    return apiRequest<ReminderFeedItem[]>(`/learning/goals/reminders/feed${suffix}`, {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function getReminderPreferences(): Promise<ReminderPreference> {
    return apiRequest<ReminderPreference>("/learning/goals/reminders/preferences", {
        method: "GET",
        allowAuthRetry: true,
    });
}

export async function updateReminderPreferences(
    payload: ReminderPreferenceUpdateRequest,
): Promise<ReminderPreference> {
    return apiRequest<ReminderPreference>("/learning/goals/reminders/preferences", {
        method: "PATCH",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}

export async function suggestGoalMilestones(
    payload: MilestoneSuggestionRequest,
): Promise<MilestoneSuggestionResponse> {
    return apiRequest<MilestoneSuggestionResponse>("/learning/goals/milestones/suggestions", {
        method: "POST",
        body: JSON.stringify(payload),
        allowAuthRetry: true,
    });
}
