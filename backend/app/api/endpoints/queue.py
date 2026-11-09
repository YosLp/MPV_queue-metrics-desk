from fastapi import APIRouter, HTTPException, status
from app.schemas.queue import (
    QueueMetricsResponse,
    QueueRequest,
    ScenarioComparisonResponse,
)
from app.services.queue_engine import (
    UnstableQueueError,
    calculate_queue_metrics,
    compare_scenarios,
)

router = APIRouter()


@router.post(
    "/calculate",
    response_model=QueueMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Calcular métricas de teoría de colas (M/M/1 o M/M/s)",
)
def calculate_queue_endpoint(payload: QueueRequest) -> QueueMetricsResponse:
    """
    Calcula las métricas de desempeño en estado estacionario para un sistema M/M/1 o M/M/s.
    Si el factor de utilización ρ = λ / (s * μ) >= 1, retorna HTTP 400 con el detalle matemático
    de la condición de inestabilidad y el número mínimo de técnicos requerido.
    """
    try:
        return calculate_queue_metrics(
            lambda_rate=payload.lambda_rate,
            mu_rate=payload.mu_rate,
            num_servers=payload.num_servers,
        )
    except UnstableQueueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "SYSTEM_SATURATED",
                "message": exc.message,
                "model_type": "M/M/1" if exc.num_servers == 1 else f"M/M/{exc.num_servers}",
                "lambda_rate": exc.lambda_rate,
                "mu_rate": exc.mu_rate,
                "num_servers": exc.num_servers,
                "max_service_capacity": round(exc.num_servers * exc.mu_rate, 4),
                "rho": round(exc.rho, 6),
                "is_stable": False,
                "min_servers_needed": exc.min_servers_needed,
            },
        ) from exc


@router.post(
    "/compare",
    response_model=ScenarioComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Comparar escenario actual (s) frente a s+1 y s+2 técnicos",
)
def compare_queue_scenarios_endpoint(
    payload: QueueRequest,
) -> ScenarioComparisonResponse:
    """
    Evalúa y compara el impacto operativo de contar con s, s+1 y s+2 técnicos
    para las tasas λ y μ dadas.
    """
    return compare_scenarios(
        lambda_rate=payload.lambda_rate,
        mu_rate=payload.mu_rate,
        base_servers=payload.num_servers,
        extra_servers=2,
    )

