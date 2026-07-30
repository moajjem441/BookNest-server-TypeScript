# 📚 BookNest Server (TypeScript)

The backend API service for **BookNest** — a full-stack book sharing and borrowing platform.  
Built with **Node.js, Express.js, TypeScript, and MongoDB**.

---

## 🚀 Live API & Repository

* **Frontend Live:** https://booknest-eight-black.vercel.app/
* **Server Live API:** https://booknest-server-type-script.vercel.app/

* **Frontend Repository:** https://github.com/moajjem441/BookNest
* **Server Repository:** https://github.com/moajjem441/BookNest-server-TypeScript

---

## ✨ Features

### 🔐 Authentication & Authorization
- Secure API routes using JWT validation with `jose-cjs`.
- Protected operations for authenticated users.
- User-based access control.

### 📚 Book Management
- Complete CRUD operations for books.
- Support for physical books and PDF resources.
- Users can share, view, and manage their uploaded books.

### 🤝 Borrow Request System
- Complete borrowing workflow.
- Request lifecycle management:
  - Pending
  - Approved
  - Rejected
- Users can request books and manage borrowing activities.

### 📊 Dashboard Statistics
- User-specific dashboard data.
- Track:
  - Shared books
  - Borrow requests
  - Borrowed books
  - Returned books

### 🛡️ Type Safety
- Fully developed using TypeScript.
- Custom interfaces for better code structure.
- Strong typing with MongoDB native driver.

---

## 🛠️ Tech Stack & Dependencies

### Backend
- **Language:** TypeScript
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Native Driver

### Security & Utilities
- `jose-cjs` — JWT verification
- `cors` — Cross-origin resource sharing
- `dotenv` — Environment variable management

### Development Tools
- `tsx` — TypeScript execution & development server
- `tsc` — TypeScript compiler

---

## 📋 Prerequisites

Before running this project locally, make sure you have:

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas URI

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=your_frontend_client_url
```

---

## 💻 Local Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/moajjem441/BookNest-server-TypeScript.git

cd BookNest-server-TypeScript
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

### 5. Start Production Server

```bash
npm start
```

---

# 🌐 API Endpoints Summary

## 📖 Books API

### Get All Books
```
GET /books
```

### Get Single Book Details
```
GET /books/:id
```

### Add New Book (Protected)
```
POST /books
```

### Delete Book
```
DELETE /books/:id
```

---

## 🤝 Borrow Request API

### Send Borrow Request (Protected)

```
POST /books/:id/request
```

### Get Borrow Requests

```
GET /borrow-requests
```

### Update Request Status

```
PATCH /borrow-requests/:id
```

Status:
- Approved
- Rejected

### Delete Borrow Request

```
DELETE /borrow-requests/:id
```

---

## 📊 Dashboard API

### Get Borrowed Books

```
GET /dashboard/books/borrowed/:email
```

### Return Borrowed Book

```
PATCH /dashboard/books/return/:id
```

---

## 📁 Project Structure

```
BookNest-server-TypeScript
│
├── src
│   ├── controllers
│   ├── routes
│   ├── interfaces
│   ├── middleware
│   ├── config
│   └── server.ts
│
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📝 License

This project is open-source and available under the **MIT License**.

---

## 👨‍💻 Author

**Moajjem Hossain**

GitHub:
https://github.com/moajjem441