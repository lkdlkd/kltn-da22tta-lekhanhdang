# 🏠 PhòngTrọ Vĩnh Long — Hệ thống Gợi ý Phòng trọ Sinh viên

> **Đề tài Khóa luận Tốt nghiệp** — Hệ thống gợi ý phòng trọ thông minh dành cho sinh viên tại Vĩnh Long

## 🏗️ Kiến trúc

| Service | Công nghệ | Port |
|---|---|---|
| Frontend | React 18 + Vite + shadcn/ui + Tailwind CSS | 5173 |
| Backend | Node.js + Express + Mongoose + Socket.io | 5000 |
| AI Service | Python + FastAPI + Scikit-learn | 8000 |
| Database | MongoDB Atlas | — |

## 📂 Cấu trúc thư mục

```
📁 1doankhoaluantotnghiep/
├── 📁 frontend/          # React 18 + Vite
├── 📁 backend/           # Node.js + Express API
├── 📁 ai-service/        # Python FastAPI — Recommendation Engine
├── 📁 docs/              # Tài liệu dự án
└── 📁 src/Plan1/         # Kế hoạch phát triển
```

## 🚀 Chạy dự án

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env   # Điền thông tin MongoDB, JWT, Cloudinary, Email
npm install
npm run dev
```

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 📋 Các Phase phát triển

| Phase | Chức năng | Trạng thái |
|---|---|---|
| 0 | Khởi tạo & Cấu hình | ✅ Done |
| 1 | Auth & Phân quyền | ✅ Done |
| 2–13 | ... | 🔄 In Progress |
| 14 | Deploy | ⏳ Pending |

Xem chi tiết tại [`src/Plan1/`](./src/Plan1/)
