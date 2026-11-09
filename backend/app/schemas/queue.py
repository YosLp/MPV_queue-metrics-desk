from typing import List, Optional
from pydantic import BaseModel, Field


class QueueRequest(BaseModel):
    lambda_rate: float = Field(
        ...,
        gt=0,
        description="Tasa media de llegada de clientes/solicitudes por hora (λ > 0)",
        examples=[18.0],
    )
    mu_rate: float = Field(
        ...,
        gt=0,
        description="Tasa media de servicio por técnico por hora (μ > 0)",
        examples=[10.0],
    )
    num_servers: int = Field(
        ...,
        ge=1,
        description="Número de técnicos/servidores en paralelo (s >= 1)",
        examples=[2],
    )


class QueueMetricsResponse(BaseModel):
    model_type: str = Field(
        ...,
        description="Modelo matemático aplicado (M/M/1 o M/M/s)",
    )
    lambda_rate: float = Field(..., description="Tasa de llegada λ (solicitudes/hora)")
    mu_rate: float = Field(..., description="Tasa de servicio μ (solicitudes/hora)")
    num_servers: int = Field(..., description="Número de técnicos s")
    rho: float = Field(..., description="Factor de utilización del sistema (ρ = λ / (s * μ))")
    is_stable: bool = Field(..., description="True si ρ < 1, False si ρ >= 1")
    l_queue: Optional[float] = Field(
        None, description="Lq: Número promedio de solicitudes en la cola"
    )
    l_system: Optional[float] = Field(
        None, description="L: Número promedio de solicitudes en el sistema"
    )
    wq_hours: Optional[float] = Field(
        None, description="Wq (horas): Tiempo promedio de espera en la cola"
    )
    wq_minutes: Optional[float] = Field(
        None, description="Wq (minutos): Tiempo promedio de espera en la cola"
    )
    w_hours: Optional[float] = Field(
        None, description="W (horas): Tiempo promedio total en el sistema"
    )
    w_minutes: Optional[float] = Field(
        None, description="W (minutos): Tiempo promedio total en el sistema"
    )
    p_idle: Optional[float] = Field(
        None, description="P0: Probabilidad de que el sistema esté completamente vacío"
    )
    p_waiting: Optional[float] = Field(
        None,
        description="Pq (Erlang-C): Probabilidad de que una solicitud entrante tenga que esperar en cola",
    )
    message: Optional[str] = Field(
        None, description="Mensaje descriptivo del estado del sistema"
    )


class ScenarioItem(BaseModel):
    scenario_label: str = Field(..., description="Etiqueta del escenario (ej. Actual (s=2), +1 Técnico (s=3))")
    num_servers: int = Field(..., description="Número de técnicos evaluados (s)")
    model_type: str = Field(..., description="Modelo M/M/1 o M/M/s")
    rho: float = Field(..., description="Factor de utilización ρ")
    is_stable: bool = Field(..., description="Indica si el sistema es estable (ρ < 1)")
    l_queue: Optional[float] = Field(None, description="Solicitudes promedio en cola (Lq)")
    l_system: Optional[float] = Field(None, description="Solicitudes promedio en sistema (L)")
    wq_hours: Optional[float] = Field(None, description="Tiempo medio en cola en horas (Wq)")
    wq_minutes: Optional[float] = Field(None, description="Tiempo medio en cola en minutos (Wq)")
    w_hours: Optional[float] = Field(None, description="Tiempo medio en el sistema en horas (W)")
    w_minutes: Optional[float] = Field(None, description="Tiempo medio en el sistema en minutos (W)")
    p_idle: Optional[float] = Field(None, description="Probabilidad de sistema vacío (P0)")
    p_waiting: Optional[float] = Field(None, description="Probabilidad de esperar en cola (Pq / Erlang-C)")
    message: Optional[str] = Field(None, description="Diagnóstico del escenario")


class ScenarioComparisonResponse(BaseModel):
    lambda_rate: float = Field(..., description="Tasa de llegada λ evaluada")
    mu_rate: float = Field(..., description="Tasa de servicio μ evaluada")
    base_servers: int = Field(..., description="Número base de técnicos s")
    scenarios: List[ScenarioItem] = Field(
        ...,
        description="Lista comparativa de escenarios evaluando s, s+1 y s+2 técnicos",
    )

