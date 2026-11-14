import React from 'react';
import {
  Activity,
  Award,
  CheckCircle2,
  Clock,
  Database,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { DpoConsolidarResponse, PulseEstadoResponse } from './types';

interface PulseTelemetryPanelProps {
  daemonOnline: boolean;
  pulse: PulseEstadoResponse | null;
  lastDpo: DpoConsolidarResponse | null;
  consolidatingDpo: boolean;
  onRunDpo: () => Promise<void>;
}

export const PulseTelemetryPanel: React.FC<PulseTelemetryPanelProps> = ({
  daemonOnline,
  pulse,
  lastDpo,
  consolidatingDpo,
  onRunDpo,
}) => {
  const plataformas = pulse?.plataformas ?? [];
  const ganchos = pulse?.estadisticas_ganchos ?? [];
  const calentamientos = pulse?.calentamientos_recientes ?? [];
  const despachos = pulse?.despachos_recientes ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Higiene de Cuentas · Cuotas & Circuit Breakers
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              {pulse?.telemetria_eventos_totales ?? 0} eventos
            </span>
          </div>

          {plataformas.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              {daemonOnline
                ? 'Sin métricas de rate-limiter cargadas todavía.'
                : 'Inicia aurora-daemon para inspeccionar cuotas horarias y circuit breakers.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {plataformas.map((p) => {
                const ratioDia =
                  p.cuota_max_dia > 0
                    ? Math.min(100, (p.usadas_ultimo_dia / p.cuota_max_dia) * 100)
                    : 0;
                const circuitOpen = Boolean(p.circuit_abierto_hasta);

                return (
                  <div
                    key={p.plataforma}
                    className="rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">{p.plataforma}</span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-zinc-400">
                          {p.usadas_ultima_hora}/{p.cuota_max_hora} h ·{' '}
                          {p.usadas_ultimo_dia}/{p.cuota_max_dia} d
                        </span>
                        {circuitOpen ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <ShieldAlert className="w-3 h-3" />
                            Circuit Abierto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Sano ({p.fallos_consecutivos} fallos)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          circuitOpen ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ratioDia}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Consolidación Nocturna DPO & Recalibración 4D
              </h2>
            </div>
            <button
              type="button"
              disabled={!daemonOnline || consolidatingDpo}
              onClick={() => void onRunDpo()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold disabled:opacity-40"
            >
              <Sparkles className={`w-3.5 h-3.5 ${consolidatingDpo ? 'animate-spin' : ''}`} />
              {consolidatingDpo ? 'Consolidando...' : 'Ejecutar DPO'}
            </button>
          </div>

          {!lastDpo ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-xs text-zinc-400 space-y-2">
              <p>
                El ciclo nocturno audita las métricas de retención de Reels y respuestas positivas con
                BOB (`Auditor`), recalibra los pesos 4D de nodos/aristas y escribe el dataset JSONL
                de pares `chosen` / `rejected` para auto-mejora DPO local.
              </p>
              <p className="text-zinc-500">
                Haz clic en <strong>Ejecutar DPO</strong> para consolidar los eventos capturados.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-zinc-950 border border-sky-500/30 p-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-zinc-900 p-2.5">
                  <span className="text-zinc-500 block text-[11px]">Entradas DPO</span>
                  <span className="text-base font-bold text-zinc-100 font-mono">
                    {lastDpo.dataset.entradas.length}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-900 p-2.5">
                  <span className="text-zinc-500 block text-[11px]">Nodos 4D</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {lastDpo.dataset.nodos_4d_recalibrados}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-900 p-2.5">
                  <span className="text-zinc-500 block text-[11px]">Aristas 4D</span>
                  <span className="text-base font-bold text-sky-400 font-mono">
                    {lastDpo.dataset.aristas_4d_recalibradas}
                  </span>
                </div>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 break-all">
                JSONL: {lastDpo.dataset.ruta_jsonl}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Generado: {lastDpo.dataset.generado_en} · Campañas auditadas:{' '}
                {lastDpo.dataset.campanas_auditadas.length}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Rendimiento por Gancho Creativo ({ganchos.length})
            </h3>
            {ganchos.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Aún no hay telemetría agregada por gancho creativo.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {ganchos.map((g, idx) => (
                  <div
                    key={`${g.campana_id}-${idx}`}
                    className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-zinc-200">{g.gancho}</p>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                          g.es_alto_rendimiento
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {g.es_alto_rendimiento ? 'DPO Chosen' : 'En observación'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      retención 3s: {(g.tasa_retencion_promedio * 100).toFixed(0)}% · respuesta:{' '}
                      {(g.tasa_apertura_o_respuesta * 100).toFixed(0)}% · muestras: {g.muestras}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Calentamientos Periféricos Recientes ({calentamientos.length})
          </h3>
          {calentamientos.length === 0 ? (
            <p className="text-xs text-zinc-500">Sin calentamientos ejecutados en sesión.</p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {calentamientos.map((c) => (
                <div
                  key={c.interaccion_id}
                  className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-[11px] flex items-center justify-between gap-2"
                >
                  <span className="text-zinc-200">
                    {c.plataforma} · {c.tipo_interaccion}
                  </span>
                  <span className="font-mono text-zinc-500">{c.referencia_externa}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Despachos Multicanal Auditados ({despachos.length})
          </h3>
          {despachos.length === 0 ? (
            <p className="text-xs text-zinc-500">Sin despachos completados en sesión.</p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {despachos.map((d) => (
                <div
                  key={d.tracking_id}
                  className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-[11px] flex items-center justify-between gap-2"
                >
                  <span className="text-zinc-200">
                    {d.canal} · {d.estado_campana}
                  </span>
                  <span className="font-mono text-zinc-500 truncate max-w-[220px]">
                    {d.url_propuesta_tracking}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
