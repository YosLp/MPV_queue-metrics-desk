from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints.queue import router as queue_router

app = FastAPI(
    title="Support Desk Queueing Analyzer API",
    description=(
        "Motor analítico determinista de Teoría de Colas (modelos M/M/1 y M/M/s con Erlang-C) "
        "para dimensionamiento y análisis de desempeño en mesas de soporte técnico."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(queue_router, prefix="/api/v1/queue", tags=["Queueing Theory"])


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "Support Desk Queueing Analyzer API",
        "models": ["M/M/1", "M/M/s (Erlang-C)"],
    }

