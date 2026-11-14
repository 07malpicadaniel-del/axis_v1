import { invoke } from '@tauri-apps/api/core';
import type {
  AprobarOrdenResponse,
  AuroraHealthState,
  AuroraIpcError,
  DpoConsolidarResponse,
  GatekeeperPendientesResponse,
  HuntRequestPayload,
  HuntResponse,
  OptOutResponse,
  OrdenPendienteDto,
  PulseEstadoResponse,
  SubgrafoProspecto,
  TelaranaResponse,
  VerticalComercial,
} from './types';

export const auroraApi = {
  health: () => invoke<AuroraHealthState>('aurora_health'),
  launchHunt: (payload: HuntRequestPayload) =>
    invoke<HuntResponse>('aurora_launch_hunt', { payload }),
  getTelarana: () => invoke<TelaranaResponse>('aurora_get_telarana'),
  getSubgrafo: (prospectoId: string) =>
    invoke<SubgrafoProspecto>('aurora_get_subgrafo', { prospectoId }),
  listGatekeeper: () =>
    invoke<GatekeeperPendientesResponse>('aurora_list_gatekeeper'),
  approveOrder: (ordenId: string, despacharInmediatamente = false) =>
    invoke<AprobarOrdenResponse>('aurora_approve_order', {
      ordenId,
      despacharInmediatamente,
    }),
  rejectOrder: (ordenId: string, motivo: string) =>
    invoke<OrdenPendienteDto>('aurora_reject_order', { ordenId, motivo }),
  triggerOptOut: (
    prospectoId: string,
    motivo: string,
    campanaId?: string | null,
  ) =>
    invoke<OptOutResponse>('aurora_trigger_opt_out', {
      prospectoId,
      campanaId: campanaId ?? null,
      motivo,
    }),
  getPulseStatus: () => invoke<PulseEstadoResponse>('aurora_get_pulse_status'),
  runDpoConsolidation: () =>
    invoke<DpoConsolidarResponse>('aurora_run_dpo_consolidation'),
  openArtifact: (ruta: string) =>
    invoke<void>('aurora_open_artifact', { ruta }),
};

export function extraerMensajeError(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as Partial<AuroraIpcError> & { error?: string; mensaje?: string };
    if (e.code && e.message) return `[${e.code}] ${e.message}`;
    if (e.message) return e.message;
    if (e.mensaje) return e.mensaje;
  }
  return 'Error desconocido al comunicarse con Aurora.';
}

export function formatearMxn(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(monto);
}

export function formatearVertical(v: VerticalComercial): string {
  if ('Inmobiliaria' in v) return `Inmobiliaria · ${v.Inmobiliaria}`;
  return `Seguros · ${v.Seguros}`;
}

export function wsUrlDesdeDaemon(daemonUrl: string): string | null {
  try {
    const parsed = new URL(daemonUrl);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.pathname = '/api/v1/ws';
    return parsed.toString();
  } catch {
    return null;
  }
}
