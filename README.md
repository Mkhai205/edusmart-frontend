# EduSmart Frontend

Frontend chinh thuc cua EduSmart, su dung Next.js 15 (App Router).

## Luu y quan trong

- Thu muc prototype UI da duoc xoa khoi workspace.
- Hien tai chi con mot frontend de chay: `edusmart-frontend`.

## Chay local

Tu thu muc `edusmart-frontend`:

```bash
npm install
npm run dev
```

Mo trinh duyet tai `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Bien moi truong

Tao file `.env.local` tu `.env.example` va dieu chinh theo moi truong:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_API_BASE_URL`: dia chi backend API.
- `NEXT_PUBLIC_STATS_USE_MOCK_FALLBACK`: bat (`true`) de dung du lieu mock cho trang Statistics khi tat ca endpoint deu unavailable.
- `NEXT_PUBLIC_STATS_PROGRESS_GOALS_LIMIT`: gioi han so goal lay progress logs (giam so request).
- `NEXT_PUBLIC_STATS_PROGRESS_LOGS_LIMIT`: so log toi da moi goal cho bieu do theo thang.

## Cau truc can nho

- `src/app`: route va layout theo App Router.
- `src/features/auth`: auth service + state store.
- `src/features/workspace`: modules tai lieu, quiz, flashcards.
- `src/libs/apiClient.ts`: HTTP client dung chung.

## Yeu cau backend

Frontend can backend dang chay de su dung dang nhap OAuth va cac tinh nang workspace.
