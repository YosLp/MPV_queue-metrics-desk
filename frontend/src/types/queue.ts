export interface QueueRequest {
  lambda_rate: number;
  mu_rate: number;
  num_servers: number;
}

export interface QueueMetricsResponse {
  model_type: string;
  lambda_rate: number;
  mu_rate: number;
  num_servers: number;
  rho: number;
  is_stable: boolean;
  l_queue: number | null;
  l_system: number | null;
  wq_hours: number | null;
  wq_minutes: number | null;
  w_hours: number | null;
  w_minutes: number | null;
  p_idle: number | null;
  p_waiting: number | null;
  message?: string | null;
}

export interface ScenarioItem {
  scenario_label: string;
  num_servers: number;
  model_type: string;
  rho: number;
  is_stable: boolean;
  l_queue: number | null;
  l_system: number | null;
  wq_hours: number | null;
  wq_minutes: number | null;
  w_hours: number | null;
  w_minutes: number | null;
  p_idle: number | null;
  p_waiting: number | null;
  message?: string | null;
}

export interface ScenarioComparisonResponse {
  lambda_rate: number;
  mu_rate: number;
  base_servers: number;
  scenarios: ScenarioItem[];
}

export interface SaturatedSystemErrorDetail {
  error: string;
  message: string;
  model_type: string;
  lambda_rate: number;
  mu_rate: number;
  num_servers: number;
  max_service_capacity: number;
  rho: number;
  is_stable: boolean;
  min_servers_needed: number;
}

