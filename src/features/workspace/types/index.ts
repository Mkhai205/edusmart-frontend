export type ExtractionStatus = "pending" | "processing" | "completed" | "failed";

export interface DocumentListItem {
    document_id: string;
    title: string;
    content_type: string;
    file_size: number;
    total_pages: number | null;
    extraction_status: ExtractionStatus;
    created_at: string;
}

export interface DocumentDownloadResponse {
    document_id: string;
    download_url: string;
    expires_in_seconds: number;
}

export interface DocumentUploadResponse {
    document_id: string;
    title: string;
    file_url: string;
    object_key: string;
    content_type: string;
    file_size: number;
    total_pages: number | null;
    is_public: boolean;
    extraction_status: ExtractionStatus;
    created_at: string;
    download_url: string;
}

export interface DocumentDetail {
    document_id: string;
    title: string;
    file_url: string;
    object_key: string;
    content_type: string;
    file_size: number;
    total_pages: number | null;
    is_public: boolean;
    extraction_status: ExtractionStatus;
    extraction_error: string | null;
    extracted_at: string | null;
    created_at: string;
    download_url: string;
}

export interface LearningGoalDashboard {
    in_progress_count: number;
    completed_count: number;
    overdue_count: number;
    due_today_count: number;
    due_this_week_count: number;
}

export interface LearningGoalMilestone {
    id?: string;
    title?: string;
    description?: string | null;
    due_date?: string | null;
    completed?: boolean;
    progress?: number | null;
    [key: string]: unknown;
}

export interface LearningGoalProgressLog {
    id: string;
    goal_id: string;
    user_id: string;
    previous_progress: number | null;
    new_progress: number;
    note: string | null;
    created_at: string;
}

export type ReminderChannel = "in_app" | "email";
export type ReminderEventType = "due_soon" | "overdue" | "digest";
export type ReminderEventStatus = "pending" | "sent" | "failed";

export interface ReminderFeedItem {
    event_id: string;
    goal_id: string | null;
    channel: ReminderChannel;
    event_type: ReminderEventType;
    status: ReminderEventStatus;
    scheduled_for: string;
    sent_at: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
}

export interface ReminderPreference {
    timezone: string;
    email_digest_enabled: boolean;
    digest_hour: number;
    digest_minute: number;
    due_soon_hours: number;
    overdue_cooldown_hours: number;
}

export interface ReminderPreferenceUpdateRequest {
    timezone?: string;
    email_digest_enabled?: boolean;
    digest_hour?: number;
    digest_minute?: number;
    due_soon_hours?: number;
    overdue_cooldown_hours?: number;
}

export interface MilestoneSuggestionRequest {
    title: string;
    description?: string | null;
    desired_count?: number;
}

export interface MilestoneSuggestionResponse {
    milestones: LearningGoalMilestone[];
}

export interface QuizListItem {
    quiz_id: string;
    document_id: string;
    title: string;
    quiz_status: "pending" | "processing" | "completed" | "failed";
    question_count: number;
    difficulty: "easy" | "medium" | "hard";
    created_at: string;
}

export interface QuizQuestion {
    question_index: number;
    question_text: string;
    options: string[];
    correct_option_index: number;
    hint: string;
    correct_explanation: string;
    incorrect_explanations: string[];
    option_explanations: string[];
}

export interface QuizDetail {
    quiz_id: string;
    document_id: string;
    title: string;
    quiz_status: "pending" | "processing" | "completed" | "failed";
    question_count: number;
    difficulty: "easy" | "medium" | "hard";
    time_limit_seconds: number;
    questions: QuizQuestion[] | null;
    quiz_error: string | null;
    created_at: string;
}

export interface QuizSubmitAnswer {
    question_index: number;
    selected_option_index: number | null;
}

export interface QuizSubmitResultItem {
    question_index: number;
    selected_option_index: number | null;
    correct_option_index: number;
    is_correct: boolean;
    is_skipped: boolean;
    explanation: string;
}

export interface QuizSubmitResponse {
    attempt_id: string;
    quiz_id: string;
    score: number;
    total_questions: number;
    correct_count: number;
    incorrect_count: number;
    skipped_count: number;
    time_spent_seconds: number;
    completed_at: string;
    results: QuizSubmitResultItem[];
}

export interface QuizQueuedResponse {
    quiz_id: string;
    document_id: string;
    quiz_status: "pending" | "processing" | "completed" | "failed";
    question_count: number;
    difficulty: "easy" | "medium" | "hard";
    time_limit_seconds: number;
    created_at: string;
}

export interface QuizGenerateRequest {
    document_id: string;
    question_count?: number;
    difficulty?: "easy" | "medium" | "hard";
    start_page?: number;
    end_page?: number;
    time_limit_seconds?: number;
}

export interface FlashcardSetListItem {
    set_id: string;
    document_id: string | null;
    title: string;
    algorithm?: string | null;
    generation_status: "pending" | "processing" | "completed" | "failed";
    learning_status: "chua_hoc" | "dang_hoc" | "da_hoc_xong";
    studied_cards: number;
    due_cards: number;
    card_count: number;
    completed_at?: string | null;
    created_at: string;
}

export interface FlashcardSetDetail {
    set_id: string;
    document_id: string | null;
    title: string;
    generation_status: "pending" | "processing" | "completed" | "failed";
    generation_error: string | null;
    card_count: number;
    options?: Record<string, unknown> | null;
    created_at: string;
}

export interface FlashcardCard {
    card_id: string;
    set_id: string;
    card_type: "term_definition" | "qa" | "cloze";
    front: string;
    back: string;
    image_url: string | null;
    image_keyword: string | null;
    ease_factor: number | null;
    interval_days: number | null;
    repetitions: number;
    next_review_at: string | null;
    last_rating: "hard" | "medium" | "easy" | null;
}

export interface FlashcardReviewResponse {
    card_id: string;
    rating: "hard" | "medium" | "easy";
    ease_factor: number;
    interval_days: number;
    repetitions: number;
    next_review_at: string;
}

export interface FlashcardReviewTodayItem {
    card_id: string;
    set_id: string;
    set_title: string;
    card_type: "term_definition" | "qa" | "cloze";
    front: string;
    back: string;
    image_url: string | null;
    image_keyword: string | null;
    ease_factor: number | null;
    interval_days: number | null;
    repetitions: number;
    next_review_at: string;
    last_rating: "hard" | "medium" | "easy" | null;
}

export interface FlashcardQueuedResponse {
    set_id: string;
    document_id: string;
    title: string;
    generation_status: "pending" | "processing" | "completed" | "failed";
    card_count_requested: number;
    created_at: string;
}

export interface FlashcardGenerateRequest {
    document_id: string;
    title?: string;
    card_count?: number;
    start_page?: number;
    end_page?: number;
    include_images?: boolean;
}

export interface ManualFlashcardSetCreateRequest {
    document_id?: string | null;
    title: string;
    description?: string | null;
    category?: string | null;
}

export interface ManualFlashcardSetUpdateRequest {
    title?: string;
    description?: string | null;
    category?: string | null;
}

export interface ManualFlashcardCardCreateRequest {
    card_type?: "term_definition" | "qa" | "cloze";
    front: string;
    back: string;
    image_url?: string | null;
    image_keyword?: string | null;
}

export interface ManualFlashcardCardUpdateRequest {
    card_type?: "term_definition" | "qa" | "cloze";
    front?: string;
    back?: string;
    image_url?: string | null;
    image_keyword?: string | null;
}

export type GoalRecurrenceType = "daily" | "weekly" | "monthly";

export interface LearningGoal {
    id: string;
    user_id: string;
    document_id: string | null;
    title: string;
    description: string | null;
    recurrence_type: GoalRecurrenceType;
    period_start: string;
    period_end: string;
    target_date: string;
    progress: number;
    status: "in_progress" | "completed" | "overdue" | "archived";
    milestones: LearningGoalMilestone[] | null;
    reminder_enabled: boolean;
    last_reminded_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface LearningGoalCreateRequest {
    title: string;
    description?: string;
    document_id?: string;
    recurrence_type: GoalRecurrenceType;
    target_date: string;
    milestones?: LearningGoalMilestone[];
    reminder_enabled?: boolean;
}

export interface LearningGoalUpdateRequest {
    title?: string;
    description?: string;
    document_id?: string;
    recurrence_type?: GoalRecurrenceType;
    target_date?: string;
    milestones?: LearningGoalMilestone[];
    reminder_enabled?: boolean;
    status?: LearningGoal["status"];
}

export interface LearningGoalProgressUpdateRequest {
    progress: number;
    note?: string;
}

export type SummaryMode = "full_map_reduce" | "page_range" | "keyword_hybrid";

export interface SummarySourceChunk {
    chunk_id: string;
    page_number: number;
    chunk_index: number;
    bbox: number[] | null;
    similarity: number | null;
}

export interface DocumentSummaryStatus {
    summary_id: string;
    document_id: string;
    summary_status: "pending" | "processing" | "completed" | "failed";
    mode: SummaryMode;
    options: Record<string, unknown>;
    content_markdown: string | null;
    summary_error: string | null;
    share_token: string | null;
    sources: SummarySourceChunk[] | null;
    completed_at: string | null;
    created_at: string;
}

export interface DocumentSummaryQueuedResponse {
    summary_id: string;
    document_id: string;
    summary_status: "pending" | "processing" | "completed" | "failed";
    mode: SummaryMode;
    options: Record<string, unknown>;
    created_at: string;
}

export interface DocumentSummaryRequest {
    mode: SummaryMode;
    start_page?: number;
    end_page?: number;
    keywords?: string[];
    search_limit?: number;
    min_similarity?: number;
}
