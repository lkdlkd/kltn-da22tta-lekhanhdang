from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="PhòngTrọ VL — AI Service",
    description="Hệ thống gợi ý phòng trọ thông minh cho sinh viên Vĩnh Long",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173"),
                   os.getenv("BACKEND_URL", "http://localhost:5000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "OK", "service": "AI Service"}


# Import routers (sẽ thêm trong các phase tiếp theo)
# from routers import recommend
# app.include_router(recommend.router, prefix="/recommend", tags=["Recommend"])
