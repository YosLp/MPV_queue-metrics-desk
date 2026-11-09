import math
from typing import List
from app.schemas.queue import (
    QueueMetricsResponse,
    ScenarioComparisonResponse,
    ScenarioItem,
)


class UnstableQueueError(ValueError):
    """Excepción lanzada cuando el sistema de colas no cumple la condición de estabilidad (ρ >= 1)."""

    def __init__(
        self,
        lambda_rate: float,
        mu_rate: float,
        num_servers: int,
        rho: float,
        min_servers_needed: int,
    ):
        self.lambda_rate = lambda_rate
        self.mu_rate = mu_rate
        self.num_servers = num_servers
        self.rho = rho
        self.min_servers_needed = min_servers_needed
        self.message = (
            f"Sistema saturado (inestable): La tasa de llegada (λ = {lambda_rate}) iguala o supera "
            f"la capacidad máxima de servicio (s·μ = {num_servers * mu_rate:.2f}) con s = {num_servers} "
            f"técnico(s), resultando en una utilización ρ = {rho:.4f} ({rho * 100:.2f}% >= 100%). "
            f"La cola crecerá infinitamente. Se requieren al menos s = {min_servers_needed} técnicos "
            f"para alcanzar el estado estacionario (ρ < 1)."
        )
        super().__init__(self.message)


def get_minimum_stable_servers(lambda_rate: float, mu_rate: float) -> int:
    """Calcula el número mínimo entero de servidores s tal que λ / (s * μ) < 1."""
    return math.floor(lambda_rate / mu_rate) + 1


def calculate_mm1_metrics(lambda_rate: float, mu_rate: float) -> QueueMetricsResponse:
    """
    Calcula analíticamente las métricas del modelo M/M/1 (s = 1).
    Fórmulas exactas:
      - ρ = λ / μ
      - P0 = 1 - ρ
      - Pq = ρ
      - Lq = λ² / (μ * (μ - λ))
      - L = λ / (μ - λ)
      - Wq = λ / (μ * (μ - λ))
      - W = 1 / (μ - λ)
    """
    rho = lambda_rate / mu_rate
    is_stable = rho < 1.0

    if not is_stable:
        min_s = get_minimum_stable_servers(lambda_rate, mu_rate)
        raise UnstableQueueError(
            lambda_rate=lambda_rate,
            mu_rate=mu_rate,
            num_servers=1,
            rho=rho,
            min_servers_needed=min_s,
        )

    l_queue = (lambda_rate ** 2) / (mu_rate * (mu_rate - lambda_rate))
    l_system = lambda_rate / (mu_rate - lambda_rate)
    wq_hours = lambda_rate / (mu_rate * (mu_rate - lambda_rate))
    w_hours = 1.0 / (mu_rate - lambda_rate)
    p_idle = 1.0 - rho
    p_waiting = rho

    return QueueMetricsResponse(
        model_type="M/M/1",
        lambda_rate=lambda_rate,
        mu_rate=mu_rate,
        num_servers=1,
        rho=round(rho, 6),
        is_stable=True,
        l_queue=round(l_queue, 6),
        l_system=round(l_system, 6),
        wq_hours=round(wq_hours, 6),
        wq_minutes=round(wq_hours * 60.0, 4),
        w_hours=round(w_hours, 6),
        w_minutes=round(w_hours * 60.0, 4),
        p_idle=round(p_idle, 6),
        p_waiting=round(p_waiting, 6),
        message="Sistema M/M/1 en estado estacionario estable (ρ < 1).",
    )


def calculate_mms_metrics(
    lambda_rate: float, mu_rate: float, num_servers: int
) -> QueueMetricsResponse:
    """
    Calcula analíticamente las métricas del modelo M/M/s (s > 1) usando Erlang-C.
    Sea a = λ / μ (tráfico ofrecido en Erlangs) y ρ = λ / (s * μ):
      - P0 = [ Σ_{n=0}^{s-1} (a^n / n!) + (a^s / s!) * (1 / (1 - ρ)) ]^(-1)
      - Pq (Erlang-C) = [ (a^s / s!) * (1 / (1 - ρ)) ] * P0
      - Lq = Pq * ρ / (1 - ρ)
      - Wq = Lq / λ
      - W = Wq + (1 / μ)
      - L = λ * W = Lq + (λ / μ)
    """
    s = num_servers
    a = lambda_rate / mu_rate
    rho = lambda_rate / (s * mu_rate)
    is_stable = rho < 1.0

    if not is_stable:
        min_s = get_minimum_stable_servers(lambda_rate, mu_rate)
        raise UnstableQueueError(
            lambda_rate=lambda_rate,
            mu_rate=mu_rate,
            num_servers=s,
            rho=rho,
            min_servers_needed=min_s,
        )

    # Sumatoria desde n = 0 hasta s - 1 de (a^n / n!)
    sum_terms = sum((a ** n) / math.factorial(n) for n in range(s))

    # Término de cola para n >= s: (a^s / s!) * (1 / (1 - ρ))
    tail_term = ((a ** s) / math.factorial(s)) * (1.0 / (1.0 - rho))

    p_idle = 1.0 / (sum_terms + tail_term)
    p_waiting = tail_term * p_idle  # Fórmula de Erlang-C: P( espera > 0 )

    l_queue = (p_waiting * rho) / (1.0 - rho)
    wq_hours = l_queue / lambda_rate
    w_hours = wq_hours + (1.0 / mu_rate)
    l_system = lambda_rate * w_hours

    return QueueMetricsResponse(
        model_type=f"M/M/{s}",
        lambda_rate=lambda_rate,
        mu_rate=mu_rate,
        num_servers=s,
        rho=round(rho, 6),
        is_stable=True,
        l_queue=round(l_queue, 6),
        l_system=round(l_system, 6),
        wq_hours=round(wq_hours, 6),
        wq_minutes=round(wq_hours * 60.0, 4),
        w_hours=round(w_hours, 6),
        w_minutes=round(w_hours * 60.0, 4),
        p_idle=round(p_idle, 6),
        p_waiting=round(p_waiting, 6),
        message=f"Sistema M/M/{s} en estado estacionario estable (ρ < 1).",
    )


def calculate_queue_metrics(
    lambda_rate: float, mu_rate: float, num_servers: int
) -> QueueMetricsResponse:
    """
    Punto de entrada principal del motor determinista:
    Delega a M/M/1 si s == 1 o a M/M/s si s > 1.
    """
    if num_servers < 1:
        raise ValueError("El número de técnicos (num_servers) debe ser mayor o igual a 1.")
    if lambda_rate <= 0 or mu_rate <= 0:
        raise ValueError("Las tasas λ y μ deben ser estrictamente mayores que 0.")

    if num_servers == 1:
        return calculate_mm1_metrics(lambda_rate=lambda_rate, mu_rate=mu_rate)
    return calculate_mms_metrics(
        lambda_rate=lambda_rate, mu_rate=mu_rate, num_servers=num_servers
    )


def compare_scenarios(
    lambda_rate: float, mu_rate: float, base_servers: int, extra_servers: int = 2
) -> ScenarioComparisonResponse:
    """
    Simula y compara el comportamiento del sistema variando s desde el valor actual (s)
    hasta s + extra_servers (por defecto s, s+1 y s+2 técnicos).
    Si un escenario está saturado (ρ >= 1), lo reporta con is_stable=False sin interrumpir
    la evaluación de los escenarios superiores (s+1, s+2).
    """
    scenarios: List[ScenarioItem] = []

    for offset in range(extra_servers + 1):
        current_s = base_servers + offset
        if offset == 0:
            label = f"Actual (s={current_s})"
        else:
            plural = "Técnico" if offset == 1 else "Técnicos"
            label = f"+{offset} {plural} (s={current_s})"

        model_name = "M/M/1" if current_s == 1 else f"M/M/{current_s}"

        try:
            metrics = calculate_queue_metrics(
                lambda_rate=lambda_rate, mu_rate=mu_rate, num_servers=current_s
            )
            scenarios.append(
                ScenarioItem(
                    scenario_label=label,
                    num_servers=current_s,
                    model_type=metrics.model_type,
                    rho=metrics.rho,
                    is_stable=True,
                    l_queue=metrics.l_queue,
                    l_system=metrics.l_system,
                    wq_hours=metrics.wq_hours,
                    wq_minutes=metrics.wq_minutes,
                    w_hours=metrics.w_hours,
                    w_minutes=metrics.w_minutes,
                    p_idle=metrics.p_idle,
                    p_waiting=metrics.p_waiting,
                    message=metrics.message,
                )
            )
        except UnstableQueueError as exc:
            scenarios.append(
                ScenarioItem(
                    scenario_label=label,
                    num_servers=current_s,
                    model_type=model_name,
                    rho=round(exc.rho, 6),
                    is_stable=False,
                    l_queue=None,
                    l_system=None,
                    wq_hours=None,
                    wq_minutes=None,
                    w_hours=None,
                    w_minutes=None,
                    p_idle=None,
                    p_waiting=None,
                    message=exc.message,
                )
            )

    return ScenarioComparisonResponse(
        lambda_rate=lambda_rate,
        mu_rate=mu_rate,
        base_servers=base_servers,
        scenarios=scenarios,
    )

