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

## Cau truc can nho

- `src/app`: route va layout theo App Router.
- `src/features/auth`: auth service + state store.
- `src/features/workspace`: modules tai lieu, quiz, flashcards.
- `src/libs/apiClient.ts`: HTTP client dung chung.

## Yeu cau backend

Frontend can backend dang chay de su dung dang nhap OAuth va cac tinh nang workspace.
