# Support Desk Queueing Analyzer (M/M/1 & M/M/s)

MVP Full-Stack para el análisis cuantitativo y dimensionamiento operativo de mesas de soporte técnico (Help Desk / Service Desk) basado en la **Teoría de Colas** con llegadas de Poisson y tiempos de servicio exponenciales (**Modelos $M/M/1$ y $M/M/s$ con fórmula de Erlang-C**).

Desarrollado para la asignatura de **Modelos Matemáticos**.

---

## Fundamento Matemático

Sea:
- $\lambda$: Tasa media de llegada de solicitudes al sistema (tickets/hora).
- $\mu$: Tasa media de servicio por cada técnico (tickets/hora).
- $s$: Número de técnicos o servidores en paralelo ($s \ge 1$).
- $a = \frac{\lambda}{\mu}$: Tráfico ofrecido (en Erlangs).
- $\rho = \frac{\lambda}{s \cdot \mu}$: Factor de utilización del sistema.

### Condición de Estabilidad Estacionaria
Para que la cola no crezca infinitamente y el sistema alcance el equilibrio estadístico:
$$\rho = \frac{\lambda}{s \cdot \mu} < 1$$

### 1. Modelo $M/M/1$ ($s = 1$)
- **Probabilidad de sistema vacío ($P_0$)**: $P_0 = 1 - \rho$
- **Probabilidad de espera ($P_q$)**: $P_q = \rho$
- **Solicitudes promedio en cola ($L_q$)**: $L_q = \frac{\lambda^2}{\mu(\mu - \lambda)}$
- **Solicitudes promedio en el sistema ($L$)**: $L = \frac{\lambda}{\mu - \lambda}$
- **Tiempo promedio de espera en cola ($W_q$)**: $W_q = \frac{\lambda}{\mu(\mu - \lambda)}$
- **Tiempo promedio total en el sistema ($W$)**: $W = \frac{1}{\mu - \lambda}$

### 2. Modelo $M/M/s$ ($s > 1$, Erlang-C)
- **Probabilidad de sistema vacío ($P_0$)**:
  $$P_0 = \left[ \sum_{n=0}^{s-1} \frac{(\lambda/\mu)^n}{n!} + \frac{(\lambda/\mu)^s}{s!} \cdot \frac{1}{1 - \rho} \right]^{-1}$$
- **Probabilidad de esperar en cola ($P_q$, Erlang-C)**:
  $$P_q = \frac{(\lambda/\mu)^s}{s! (1 - \rho)} \cdot P_0$$
- **Solicitudes promedio en cola ($L_q$)**:
  $$L_q = \frac{P_q \cdot \rho}{1 - \rho}$$
- **Tiempo promedio en cola ($W_q$)**: $W_q = \frac{L_q}{\lambda}$ (Ley de Little)
- **Tiempo promedio en el sistema ($W$)**: $W = W_q + \frac{1}{\mu}$
- **Solicitudes promedio en el sistema ($L$)**: $L = \lambda \cdot W = L_q + \frac{\lambda}{\mu}$

---

## Estructura del Proyecto

```text
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/
│   │   │       └── queue.py          # Endpoints REST (/calculate y /compare)
│   │   ├── schemas/
│   │   │   └── queue.py              # Esquemas Pydantic con validaciones estrictas
│   │   ├── services/
│   │   │   └── queue_engine.py       # Motor analítico determinista M/M/1 y M/M/s
│   │   └── main.py                   # Aplicación FastAPI + CORS
│   ├── tests/
│   │   └── test_queue_engine.py      # Suite de pruebas unitarias e integración (pytest)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── QueueForm.tsx         # Formulario interactivo y casos preconfigurados
│   │   │   ├── MetricsCards.tsx      # Indicadores KPI y alertas de saturación
│   │   │   ├── QueueVisualizer.tsx   # Simulación gráfica animada en vivo del flujo de tickets
│   │   │   ├── ScenarioTable.tsx     # Tabla comparativa para s, s+1 y s+2 técnicos
│   │   │   └── QueueChart.tsx        # Gráfico Recharts de Wq, W y utilización ρ
│   │   ├── types/
│   │   │   └── queue.ts              # Interfaces TypeScript espejo del backend
│   │   ├── App.tsx                   # Dashboard principal
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

---

## Ejecución Rápida

### Opción 1: Con Docker Compose
```bash
docker compose up --build
```
- **Frontend (Dashboard React)**: `http://localhost:5173`
- **Backend (API FastAPI & Swagger UI)**: `http://localhost:8000/docs`

### Opción 2: Ejecución Local (Sin Docker)

#### 1. Iniciar el Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Ejecutar Pruebas Unitarias del Motor Matemático
```bash
cd backend
pytest -v
```

#### 3. Iniciar el Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
El navegador estará disponible en `http://localhost:5173`.
