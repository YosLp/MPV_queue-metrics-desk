import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.queue_engine import (
    UnstableQueueError,
    calculate_mm1_metrics,
    calculate_mms_metrics,
    calculate_queue_metrics,
    compare_scenarios,
)

client = TestClient(app)


def test_mm1_exact_analytics():
    """
    Verifica las fórmulas analíticas de M/M/1 para λ = 8 solicitudes/hora, μ = 10 solicitudes/hora, s = 1:
      - ρ = 8 / 10 = 0.8
      - Lq = 64 / (10 * 2) = 3.2 solicitudes
      - L = 8 / 2 = 4.0 solicitudes
      - Wq = 3.2 / 8 = 0.4 horas (24 minutos)
      - W = 1 / 2 = 0.5 horas (30 minutos)
      - P0 = 1 - 0.8 = 0.2
      - Pq = 0.8
    """
    res = calculate_mm1_metrics(lambda_rate=8.0, mu_rate=10.0)
    assert res.model_type == "M/M/1"
    assert res.is_stable is True
    assert pytest.approx(res.rho, rel=1e-5) == 0.8
    assert pytest.approx(res.l_queue, rel=1e-5) == 3.2
    assert pytest.approx(res.l_system, rel=1e-5) == 4.0
    assert pytest.approx(res.wq_hours, rel=1e-5) == 0.4
    assert pytest.approx(res.wq_minutes, rel=1e-5) == 24.0
    assert pytest.approx(res.w_hours, rel=1e-5) == 0.5
    assert pytest.approx(res.w_minutes, rel=1e-5) == 30.0
    assert pytest.approx(res.p_idle, rel=1e-5) == 0.2
    assert pytest.approx(res.p_waiting, rel=1e-5) == 0.8


def test_mms_exact_analytics_erlang_c():
    """
    Verifica las fórmulas analíticas de M/M/s (s = 2) para λ = 18, μ = 10:
      - a = λ / μ = 1.8
      - ρ = 18 / (2 * 10) = 0.9
      - P0 = [1 + 1.8 + (1.8^2 / 2!) * (1 / (1 - 0.9))]^-1
           = [2.8 + 1.62 * 10]^-1 = (19.0)^-1 ≈ 0.05263158
      - Pq (Erlang-C) = 16.2 * P0 = 16.2 / 19.0 ≈ 0.85263158
      - Lq = Pq * 0.9 / 0.1 = 9 * Pq ≈ 7.673684
      - Wq = Lq / 18 ≈ 0.4263158 horas (25.5789 minutos)
      - W = Wq + 0.1 ≈ 0.5263158 horas (31.5789 minutos)
      - L = 18 * W ≈ 9.473684 solicitudes
    """
    res = calculate_mms_metrics(lambda_rate=18.0, mu_rate=10.0, num_servers=2)
    assert res.model_type == "M/M/2"
    assert res.is_stable is True
    assert pytest.approx(res.rho, rel=1e-4) == 0.9
    assert pytest.approx(res.p_idle, rel=1e-4) == 1.0 / 19.0
    assert pytest.approx(res.p_waiting, rel=1e-4) == 16.2 / 19.0
    assert pytest.approx(res.l_queue, rel=1e-4) == 145.8 / 19.0
    assert pytest.approx(res.l_system, rel=1e-4) == (145.8 / 19.0) + 1.8
    assert pytest.approx(res.wq_hours, rel=1e-4) == (145.8 / 19.0) / 18.0
    assert pytest.approx(res.w_hours, rel=1e-4) == ((145.8 / 19.0) / 18.0) + 0.1


def test_unstable_system_raises_error():
    """Verifica que cuando ρ >= 1 se lance UnstableQueueError con el cálculo de técnicos mínimos."""
    with pytest.raises(UnstableQueueError) as exc_info:
        calculate_queue_metrics(lambda_rate=25.0, mu_rate=10.0, num_servers=2)

    err = exc_info.value
    assert pytest.approx(err.rho, rel=1e-5) == 1.25
    assert err.min_servers_needed == 3


def test_compare_scenarios_handles_unstable_and_stable():
    """
    Con λ = 18, μ = 10 y base_servers = 1:
      - s = 1: ρ = 1.8 (Inestable)
      - s = 2: ρ = 0.9 (Estable)
      - s = 3: ρ = 0.6 (Estable)
    """
    comp = compare_scenarios(lambda_rate=18.0, mu_rate=10.0, base_servers=1)
    assert len(comp.scenarios) == 3
    assert comp.scenarios[0].num_servers == 1
    assert comp.scenarios[0].is_stable is False
    assert comp.scenarios[0].wq_minutes is None

    assert comp.scenarios[1].num_servers == 2
    assert comp.scenarios[1].is_stable is True
    assert comp.scenarios[1].wq_minutes is not None

    assert comp.scenarios[2].num_servers == 3
    assert comp.scenarios[2].is_stable is True
    assert comp.scenarios[2].wq_minutes < comp.scenarios[1].wq_minutes


def test_api_calculate_and_compare_endpoints():
    """Verifica los endpoints HTTP POST /api/v1/queue/calculate y /api/v1/queue/compare."""
    response_ok = client.post(
        "/api/v1/queue/calculate",
        json={"lambda_rate": 18.0, "mu_rate": 10.0, "num_servers": 2},
    )
    assert response_ok.status_code == 200
    data = response_ok.json()
    assert data["is_stable"] is True
    assert data["model_type"] == "M/M/2"

    response_saturated = client.post(
        "/api/v1/queue/calculate",
        json={"lambda_rate": 22.0, "mu_rate": 10.0, "num_servers": 2},
    )
    assert response_saturated.status_code == 400
    detail = response_saturated.json()["detail"]
    assert detail["error"] == "SYSTEM_SATURATED"
    assert detail["min_servers_needed"] == 3

    response_compare = client.post(
        "/api/v1/queue/compare",
        json={"lambda_rate": 18.0, "mu_rate": 10.0, "num_servers": 2},
    )
    assert response_compare.status_code == 200
    comp_data = response_compare.json()
    assert len(comp_data["scenarios"]) == 3

