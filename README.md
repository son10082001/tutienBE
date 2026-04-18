# tutien-be

Base backend login/logout + phan quyen ADMIN/USER bang Node.js + TypeScript + Express + Prisma, ket noi DB MySQL co san.

## 1) Cai dat

```bash
npm install
cp .env.example .env
```

## 2) Connect DB MySQL co san

Cap nhat `DATABASE_URL` trong `.env`:

```env
DATABASE_URL="mysql://root:your_password@your_host:3306/your_database"
```

Quy tac phan quyen:
- `ADMIN_USER_IDS`: danh sach userId admin, phan cach dau phay.
- `ADMIN_TYPES`: danh sach gia tri cot `type` duoc xem la admin.

Vi du:

```env
ADMIN_USER_IDS="hihihi,son"
ADMIN_TYPES="1,9"
```

Generate Prisma client:

```bash
npm run prisma:generate
```

## 3) Chay server

```bash
npm run dev
```

## 4) API auth

- `POST /api/auth/login`
  - body: `{ "userId": "...", "password": "..." }`
  - response tra ve `accessToken`, `user`, `redirectTo`
  - `redirectTo` = `/admin` neu role ADMIN, nguoc lai `/`
- `POST /api/auth/refresh-token`
  - doc refresh token tu httpOnly cookie
  - response: accessToken moi
- `POST /api/auth/logout`
  - yeu cau `Authorization: Bearer <accessToken>`
  - clear refresh token cookie

## 5) API phan quyen

- `GET /api/admin/dashboard` chi ADMIN vao duoc
- `GET /api/user/profile` USER va ADMIN vao duoc
