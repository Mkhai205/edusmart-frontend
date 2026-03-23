# Copilot Instructions for EduSmart Project (Frontend)

## 1. Project Overview

EduSmart is an AI-powered learning platform. The frontend focuses on providing a seamless, interactive experience for document interaction, AI-generated content (quizzes, flashcards, mind maps), and productivity tools (Pomodoro).

## 2. Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI / Radix UI
- **State Management:** TanStack Query (React Query) for server state, Zustand for global client state.
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod validation
- **Visualization:** React Flow (for Mind Maps), Recharts (for Goal Tracking)

---

## 3. Architecture & Patterns

### General Principles

- **Component-Driven Development:** Build small, reusable components in `components/ui`.
- **Separation of Concerns:** Keep complex logic in custom hooks (`hooks/`), API calls in `services/` or `lib/api/`, and UI in `components/`.
- **Server vs Client:** Use Server Components by default. Use `'use client'` only when necessary (interactivity, hooks).

### Folder Structure

- `/app`: Pages and layouts (App Router).
- `/components`: UI atoms and complex organisms.
- `/hooks`: Custom React hooks.
- `/lib`: Utility functions and shared constants.
- `/services`: API client functions using Fetch/Axios.
- `/store`: Zustand store definitions.
- `/types`: TypeScript interfaces and types (synced with Pydantic models where possible).

---

## 4. Coding Conventions

- **TypeScript:** Use interfaces for data models and types for unions/props. Avoid `any` at all costs.
- **Naming:** - Components: PascalCase (e.g., `StudySession.tsx`).
    - Functions/Variables: camelCase.
    - Files: kebab-case (except for components).
- **Data Fetching:** Use TanStack Query for caching, loading states, and error handling.
- **Accessibility (a11y):** Use semantic HTML and ARIA labels.

---

## 5. Feature-Specific Implementation

### 5.1 PDF Viewer & Interaction

- Use `react-pdf-viewer` or similar for rendering.
- Implement text selection triggers for "Summarize Selection" or "Create Flashcard".
- Highlight context retrieved from RAG when displaying AI answers.

### 5.2 RAG Chat Interface

- Implement a streaming UI for LLM responses (resemble ChatGPT).
- Show "Sources" (citations) as clickable links that scroll the PDF to the relevant page/section.

### 5.3 Quiz & Flashcards

- **Quiz:** Card-based UI with progress bar. Immediate feedback on correct/incorrect answers.
- **Flashcards:** Flip animation using CSS transforms. Integration with a "difficulty" rating button (Again, Hard, Good, Easy) for spaced repetition.

### 5.4 Mind Maps

- Use **React Flow** to render the JSON tree from the backend.
- Nodes should be interactive (expand/collapse).
- Export functionality (SVG/PNG).

### 5.5 Pomodoro Timer

- Visual circular progress bar.
- Web Worker for timer accuracy when the tab is in the background.
- Browser notifications for session completion.

---

## 6. API Interaction & Security

- **Auth:** Implement Google OAuth 2.0 flow using `next-auth` or custom integration.
- **Base Client:** Use a central API client with interceptors for:
    - Attaching Bearer tokens.
    - Handling 401/403 errors (redirect to login).
- **Environment:** Use `process.env.NEXT_PUBLIC_API_URL`. Never hardcode URLs.

---

## 7. Performance & UX

- **Skeleton Screens:** Use for loading states (especially during AI generation).
- **Optimistic Updates:** Use for "Mark Goal as Done" or "Save Flashcard".
- **Lazy Loading:** For heavy components like Mind Maps or PDF Viewers.
- **Error Boundaries:** Wrap major feature sections to prevent full-page crashes.

---

## 8. Copilot Behavior Guidelines

- **Modern Syntax:** Prefer Arrow Functions and Functional Components.
- **Shadcn Integration:** If asked to build a UI component, check if it can be built using Shadcn UI primitives first.
- **Validation:** Always include Zod schemas for forms.
- **Clarity:** Add JSDoc comments for complex logic in hooks or utility functions.
- **Consistency:** Ensure UI colors and spacing follow the existing Tailwind config.

---

## 9. What to Avoid

- **No Inline Styles:** Use Tailwind classes.
- **No Prop Drilling:** Use Context or Zustand for deeply nested state.
- **No Massive Components:** Break down components larger than 200 lines.
- **No Direct DOM Manipulation:** Use React refs only when absolutely necessary.
