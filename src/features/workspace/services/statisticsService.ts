import { ApiError } from "@/libs/apiClient";
import { listDocuments } from "@/features/workspace/services/documentsService";
import {
    getLearningGoalDashboard,
    listFlashcardSets,
    listLearningGoalProgressLogs,
    listLearningGoals,
    listQuizzes,
} from "@/features/workspace/services/learningService";
import type {
    FlashcardSetListItem,
    LearningGoal,
    LearningGoalDashboard,
    LearningGoalProgressLog,
    QuizListItem,
} from "@/features/workspace/types";

const STATS_USE_MOCK_FALLBACK = process.env.NEXT_PUBLIC_STATS_USE_MOCK_FALLBACK === "true";
const STATS_PROGRESS_GOALS_LIMIT = Math.min(
    parsePositiveInt(process.env.NEXT_PUBLIC_STATS_PROGRESS_GOALS_LIMIT, 10),
    20,
);
const STATS_PROGRESS_LOGS_LIMIT = parsePositiveInt(
    process.env.NEXT_PUBLIC_STATS_PROGRESS_LOGS_LIMIT,
    60,
);

interface RejectedResult {
    status: "rejected";
    reason: unknown;
}

export interface StatisticsSnapshot {
    documentsCount: number;
    quizzes: QuizListItem[];
    flashcards: FlashcardSetListItem[];
    goals: LearningGoal[];
    goalDashboard: LearningGoalDashboard | null;
    goalProgressLogs: LearningGoalProgressLog[];
    usedMockFallback: boolean;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

function isRejected<T>(result: PromiseSettledResult<T>): result is RejectedResult {
    return result.status === "rejected";
}

function isServiceUnavailable(reason: unknown): boolean {
    if (reason instanceof ApiError) {
        return reason.status >= 500 || reason.status === 0;
    }

    return reason instanceof TypeError;
}

function createIsoDateByDayOffset(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString();
}

function createMockSnapshot(): StatisticsSnapshot {
    const goalOneId = "mock-goal-1";
    const goalTwoId = "mock-goal-2";

    const goals: LearningGoal[] = [
        {
            id: goalOneId,
            user_id: "mock-user",
            document_id: null,
            title: "Hoan thanh de cuong toan 2 chuong",
            description: "Tap trung vao cac dang bai xac suat.",
            recurrence_type: "weekly",
            period_start: createIsoDateByDayOffset(-7),
            period_end: createIsoDateByDayOffset(0),
            target_date: createIsoDateByDayOffset(10),
            progress: 80,
            status: "in_progress",
            milestones: [
                { id: "m-1", title: "Tong hop cong thuc", completed: true, progress: 100 },
                { id: "m-2", title: "Luyen 3 de mau", completed: false, progress: 60 },
            ],
            reminder_enabled: true,
            last_reminded_at: createIsoDateByDayOffset(-1),
            completed_at: null,
            created_at: createIsoDateByDayOffset(-14),
            updated_at: createIsoDateByDayOffset(-1),
        },
        {
            id: goalTwoId,
            user_id: "mock-user",
            document_id: null,
            title: "On tap lich su theo chu de",
            description: null,
            recurrence_type: "monthly",
            period_start: createIsoDateByDayOffset(-20),
            period_end: createIsoDateByDayOffset(10),
            target_date: createIsoDateByDayOffset(20),
            progress: 45,
            status: "in_progress",
            milestones: null,
            reminder_enabled: true,
            last_reminded_at: null,
            completed_at: null,
            created_at: createIsoDateByDayOffset(-28),
            updated_at: createIsoDateByDayOffset(-2),
        },
    ];

    const quizzes: QuizListItem[] = [
        {
            quiz_id: "mock-quiz-1",
            document_id: "mock-doc-1",
            title: "Quiz Chuong 1",
            quiz_status: "completed",
            question_count: 12,
            difficulty: "medium",
            created_at: createIsoDateByDayOffset(-5),
        },
        {
            quiz_id: "mock-quiz-2",
            document_id: "mock-doc-2",
            title: "Quiz Chuong 2",
            quiz_status: "completed",
            question_count: 10,
            difficulty: "easy",
            created_at: createIsoDateByDayOffset(-2),
        },
    ];

    const flashcards: FlashcardSetListItem[] = [
        {
            set_id: "mock-set-1",
            document_id: "mock-doc-1",
            title: "Flashcard Chuong 1",
            algorithm: "spaced_repetition",
            generation_status: "completed",
            learning_status: "dang_hoc",
            studied_cards: 18,
            due_cards: 6,
            card_count: 30,
            completed_at: null,
            created_at: createIsoDateByDayOffset(-7),
        },
        {
            set_id: "mock-set-2",
            document_id: "mock-doc-2",
            title: "Flashcard Chuong 2",
            algorithm: "spaced_repetition",
            generation_status: "completed",
            learning_status: "chua_hoc",
            studied_cards: 0,
            due_cards: 0,
            card_count: 24,
            completed_at: null,
            created_at: createIsoDateByDayOffset(-3),
        },
    ];

    const goalDashboard: LearningGoalDashboard = {
        in_progress_count: 2,
        completed_count: 1,
        overdue_count: 0,
        due_today_count: 1,
        due_this_week_count: 2,
    };

    const goalProgressLogs: LearningGoalProgressLog[] = [
        {
            id: "mock-log-1",
            goal_id: goalOneId,
            user_id: "mock-user",
            previous_progress: 50,
            new_progress: 60,
            note: "Tuan 1",
            created_at: createIsoDateByDayOffset(-30),
        },
        {
            id: "mock-log-2",
            goal_id: goalOneId,
            user_id: "mock-user",
            previous_progress: 60,
            new_progress: 72,
            note: "Tuan 2",
            created_at: createIsoDateByDayOffset(-20),
        },
        {
            id: "mock-log-3",
            goal_id: goalOneId,
            user_id: "mock-user",
            previous_progress: 72,
            new_progress: 80,
            note: "Tuan 3",
            created_at: createIsoDateByDayOffset(-10),
        },
        {
            id: "mock-log-4",
            goal_id: goalTwoId,
            user_id: "mock-user",
            previous_progress: 20,
            new_progress: 35,
            note: "On tap theo chu de",
            created_at: createIsoDateByDayOffset(-15),
        },
        {
            id: "mock-log-5",
            goal_id: goalTwoId,
            user_id: "mock-user",
            previous_progress: 35,
            new_progress: 45,
            note: "Tong hop ghi chu",
            created_at: createIsoDateByDayOffset(-5),
        },
    ];

    return {
        documentsCount: 14,
        quizzes,
        flashcards,
        goals,
        goalDashboard,
        goalProgressLogs,
        usedMockFallback: true,
    };
}

export async function getStatisticsSnapshot(): Promise<StatisticsSnapshot> {
    const [docsResult, quizzesResult, flashcardsResult, goalsResult, dashboardResult] =
        await Promise.allSettled([
            listDocuments(200, 0),
            listQuizzes(200, 0),
            listFlashcardSets(200, 0),
            listLearningGoals({ limit: 100, offset: 0 }),
            getLearningGoalDashboard(),
        ]);

    const allPrimaryRejected =
        isRejected(docsResult) &&
        isRejected(quizzesResult) &&
        isRejected(flashcardsResult) &&
        isRejected(goalsResult) &&
        isRejected(dashboardResult);

    if (allPrimaryRejected) {
        const reasons = [
            docsResult.reason,
            quizzesResult.reason,
            flashcardsResult.reason,
            goalsResult.reason,
            dashboardResult.reason,
        ];

        if (STATS_USE_MOCK_FALLBACK && reasons.every(isServiceUnavailable)) {
            return createMockSnapshot();
        }

        throw new Error("Không thể tải dữ liệu thống kê.");
    }

    const goals = goalsResult.status === "fulfilled" ? goalsResult.value : [];

    let goalProgressLogs: LearningGoalProgressLog[] = [];
    if (goals.length > 0) {
        const logsByGoal = await Promise.allSettled(
            goals
                .slice(0, STATS_PROGRESS_GOALS_LIMIT)
                .map((goal) => listLearningGoalProgressLogs(goal.id, STATS_PROGRESS_LOGS_LIMIT, 0)),
        );

        goalProgressLogs = logsByGoal
            .filter(
                (item): item is PromiseFulfilledResult<LearningGoalProgressLog[]> =>
                    item.status === "fulfilled",
            )
            .flatMap((item) => item.value);
    }

    return {
        documentsCount: docsResult.status === "fulfilled" ? docsResult.value.length : 0,
        quizzes: quizzesResult.status === "fulfilled" ? quizzesResult.value : [],
        flashcards: flashcardsResult.status === "fulfilled" ? flashcardsResult.value : [],
        goals,
        goalDashboard: dashboardResult.status === "fulfilled" ? dashboardResult.value : null,
        goalProgressLogs,
        usedMockFallback: false,
    };
}
