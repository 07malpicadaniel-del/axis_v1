import React, { useState } from 'react';
import {
  Captions,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileText,
  Film,
  FolderOpen,
  Mic,
  Send,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { formatearVertical } from './api';
import type {
  GatekeeperPendientesResponse,
  MetadatosArtefacto,
  OrdenPendienteDto,
} from './types';

interface GatekeeperHallPanelProps {
  daemonOnline: boolean;
  cola: GatekeeperPendientesResponse | null;
  busyOrderId: string | null;
  purgingId: string | null;
  onApprove: (ordenId: string, despacharInmediatamente: boolean) => Promise<void>;
  onReject: (ordenId: string, motivo: string) => Promise<void>;
  onOptOut: (prospectoId: string, campanaId: string, motivo: string) => Promise<void>;
  onOpenArtifact: (ruta: string) => Promise<void>;
}

export const GatekeeperHallPanel: React.FC<GatekeeperHallPanelProps> = ({
  daemonOnline,
  cola,
  busyOrderId,
  purgingId,
  onApprove,
  onReject,
  onOptOut,
  onOpenArtifact,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [despachoInmediato, setDespachoInmediato] = useState<Record<string, boolean>>({});
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>({});
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [openingPath, setOpeningPath] = useState<string | null>(null);

  const handleCopyPath = async (ruta: string) => {
    try {
      await navigator.clipboard.writeText(ruta);
      setCopiedPath(ruta);
      window.setTimeout(() => {
        setCopiedPath((prev) => (prev === ruta ? null : prev));
      }, 1800);
    } catch {
      // Clipboard API puede no estar disponible fuera de contexto seguro; ignoramos sin romper UI.
    }
  };

  const handleOpen = async (ruta: string) => {
    setOpeningPath(ruta);
    try {
      await onOpenArtifact(ruta);
    } finally {
      setOpeningPath((prev) => (prev === ruta ? null : prev));
    }
  };

  const pendientes = cola?.ordenes ?? [];
  const historial = cola?.historial_reciente ?? [];
  const visibles = mostrarHistorial ? [...pendientes, ...historial] : pendientes;

  const renderEstadoBadge = (estado: OrdenPendienteDto['estado']) => {
    switch (estado) {
      case 'PendienteGatekeeper':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Aprobado':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'Despachado':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Rechazado':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Sala Gatekeeper · Aprobación Human-in-the-Box
            </h2>
            <p className="text-xs text-zinc-400">
              Ningún PDF, locución TTS, Reel MP4 o mensaje sale sin tu autorización explícita aquí.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
            {pendientes.length} pendientes · {historial.length} procesadas
          </span>
          <button
            onClick={() => setMostrarHistorial((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              mostrarHistorial
                ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-900'
            }`}
          >
            {mostrarHistorial ? 'Solo Pendientes' : 'Incluir Historial'}
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-xs text-zinc-500">
          {daemonOnline
            ? 'No hay órdenes pendientes en Gatekeeper. Lanza una cacería OSINT para generar propuestas personalizadas con BOB.'
            : 'Demonio desconectado: inicia aurora-daemon para revisar órdenes Gatekeeper.'}
        </div>
      ) : (
        <div className="space-y-4">
          {visibles.map((orden) => {
            const isPending = orden.estado === 'PendienteGatekeeper';
            const isBusy = busyOrderId === orden.orden_id;
            const scenesOpen = Boolean(expandedScenes[orden.orden_id]);
            const sendNow = Boolean(despachoInmediato[orden.orden_id]);

            return (
              <article
                key={orden.orden_id}
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-100">
                        {orden.prospecto_nombre}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${renderEstadoBadge(
                          orden.estado,
                        )}`}
                      >
                        {orden.estado}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300">
                        {orden.perfil_psicologico}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-sky-300">
                        {formatearVertical(orden.diagnostico.vertical_optima)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {orden.ubicacion} · Canal sugerido:{' '}
                      <span className="text-zinc-200 font-medium">
                        {orden.brief_creativo.canal_sugerido}
                      </span>{' '}
                      · Prob. cierre BOB:{' '}
                      <span className="text-emerald-400 font-mono font-semibold">
                        {(orden.diagnostico.probabilidad_cierre * 100).toFixed(0)}%
                      </span>
                    </p>
                  </div>

                  <div className="text-right font-mono text-[11px] text-zinc-500">
                    <p>orden: {orden.orden_id.slice(0, 8)}</p>
                    <p>campaña: {orden.campana_id.slice(0, 8)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3.5 space-y-2 text-xs">
                    <p className="font-semibold text-zinc-200">
                      Diagnóstico Topológico BOB
                    </p>
                    <p className="text-zinc-400">
                      <span className="text-zinc-300 font-medium">Producto gancho:</span>{' '}
                      {orden.diagnostico.producto_gancho}
                    </p>
                    <p className="text-zinc-400">
                      <span className="text-zinc-300 font-medium">Dolor principal:</span>{' '}
                      {orden.diagnostico.dolor_principal}
                    </p>
                    <p className="text-zinc-400">
                      <span className="text-zinc-300 font-medium">Ángulo entrada:</span>{' '}
                      {orden.diagnostico.angulo_entrada}
                    </p>
                    <p className="text-zinc-500 italic">
                      {orden.diagnostico.justificacion_topologica}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-zinc-200">
                        Brief Creativo Multimodal ({orden.brief_creativo.tono_narrativo})
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedScenes((prev) => ({
                            ...prev,
                            [orden.orden_id]: !scenesOpen,
                          }))
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                      >
                        {scenesOpen ? (
                          <>
                            Ocultar escenas <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Ver {orden.brief_creativo.escenas_reel.length} escenas Reel{' '}
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-emerald-300 font-medium">
                      Gancho 3s: “{orden.brief_creativo.gancho_3s}”
                    </p>
                    <p className="text-zinc-300 bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5 leading-relaxed">
                      {orden.brief_creativo.guion_tts}
                    </p>
                    {orden.calentamiento && (
                      <p className="text-[11px] text-amber-300/90">
                        Calentamiento previo sugerido ({orden.calentamiento.plataforma} ·{' '}
                        {orden.calentamiento.tipo_interaccion}): {orden.calentamiento.contexto_publico}
                      </p>
                    )}
                  </div>
                </div>

                {scenesOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {orden.brief_creativo.escenas_reel.map((escena) => (
                      <div
                        key={`${orden.orden_id}-escena-${escena.indice}`}
                        className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                          <span>Escena {escena.indice}</span>
                          <span>{escena.duracion_segundos}s</span>
                        </div>
                        <p className="text-zinc-200 font-medium">{escena.texto_overlay}</p>
                        <p className="text-zinc-400 text-[11px]">{escena.descripcion_visual}</p>
                      </div>
                    ))}
                  </div>
                )}

                {orden.paquete_manufacturado && (
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-emerald-300">
                        Paquete Manufacturado Verificado (SHA-256 en NVMe)
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          title={orden.paquete_manufacturado.directorio_salida}
                          className="font-mono text-[11px] text-zinc-400 truncate max-w-md select-all"
                        >
                          {orden.paquete_manufacturado.directorio_salida}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void handleOpen(orden.paquete_manufacturado!.directorio_salida)
                          }
                          disabled={openingPath === orden.paquete_manufacturado.directorio_salida}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 transition-colors disabled:opacity-50"
                        >
                          <FolderOpen className="w-3 h-3 text-emerald-400" />
                          Abrir carpeta
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                      {(
                        [
                          {
                            titulo: 'Dossier PDF',
                            icono: <FileText className="w-4 h-4 text-sky-400 shrink-0" />,
                            meta: orden.paquete_manufacturado.dossier_pdf,
                          },
                          {
                            titulo: 'Nota de Voz WAV',
                            icono: <Mic className="w-4 h-4 text-amber-400 shrink-0" />,
                            meta: orden.paquete_manufacturado.nota_voz_wav,
                          },
                          {
                            titulo: 'Reel Vertical MP4',
                            icono: <Film className="w-4 h-4 text-emerald-400 shrink-0" />,
                            meta: orden.paquete_manufacturado.reel_vertical_mp4,
                          },
                          {
                            titulo: 'Subtítulos SRT',
                            icono: <Captions className="w-4 h-4 text-violet-400 shrink-0" />,
                            meta: orden.paquete_manufacturado.subtitulos_srt,
                          },
                        ] as Array<{
                          titulo: string;
                          icono: React.ReactNode;
                          meta: MetadatosArtefacto;
                        }>
                      ).map(({ titulo, icono, meta }) => (
                        <div
                          key={`${orden.orden_id}-${titulo}`}
                          className="rounded-lg bg-zinc-950/90 border border-zinc-800 p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {icono}
                              <span className="text-zinc-100 font-medium truncate">
                                {titulo}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleOpen(meta.ruta_nvme)}
                                disabled={openingPath === meta.ruta_nvme}
                                className="inline-flex items-center gap-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300 transition-colors disabled:opacity-50"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Abrir
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCopyPath(meta.ruta_nvme)}
                                className="inline-flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition-colors"
                              >
                                {copiedPath === meta.ruta_nvme ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copiar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <p
                            title={meta.ruta_nvme}
                            className="text-zinc-400 font-mono text-[10px] break-all select-all"
                          >
                            {meta.ruta_nvme}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-zinc-500 font-mono text-[10px]">
                            <span>{meta.tamano_bytes.toLocaleString('es-MX')} bytes</span>
                            <span>· sha256 {meta.sha256_hex.slice(0, 14)}...</span>
                            <span>· {meta.tiempo_renderizado_ms} ms</span>
                            {meta.duracion_ms != null && (
                              <span>· {(meta.duracion_ms / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {orden.comprobante_despacho && (
                  <div className="rounded-xl bg-zinc-950 border border-emerald-500/30 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 text-emerald-300 font-medium">
                      <Send className="w-3.5 h-3.5" />
                      Despachado vía {orden.comprobante_despacho.canal} (ref:{' '}
                      {orden.comprobante_despacho.referencia_externa})
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {orden.comprobante_despacho.url_propuesta_tracking}
                    </span>
                  </div>
                )}

                {orden.motivo_rechazo && (
                  <p className="text-xs text-rose-300 bg-rose-950/30 border border-rose-500/30 rounded-lg px-3 py-2">
                    Motivo rechazo: {orden.motivo_rechazo}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/80">
                  {isPending ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendNow}
                          onChange={(e) =>
                            setDespachoInmediato((prev) => ({
                              ...prev,
                              [orden.orden_id]: e.target.checked,
                            }))
                          }
                          className="rounded border-zinc-700 bg-zinc-950"
                        />
                        Calentar y despachar inmediatamente tras manufacturar
                      </label>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void onApprove(orden.orden_id, sendNow)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isBusy ? 'Manufacturando...' : 'Aprobar y Manufacturar'}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setRejectingId(orden.orden_id);
                          setMotivoRechazo('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
                        Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 font-mono">
                      Actualizado: {orden.actualizado_en}
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={purgingId === orden.prospecto_id}
                    onClick={() =>
                      void onOptOut(
                        orden.prospecto_id,
                        orden.campana_id,
                        `Baja LFPDPPP directa desde Gatekeeper (orden ${orden.orden_id})`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium disabled:opacity-50"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Purgar LFPDPPP (Opt-Out)
                  </button>
                </div>

                {rejectingId === orden.orden_id && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      placeholder="Indica el motivo auditado del rechazo (ej. ajustar enfoque financiero)..."
                      className="flex-1 min-w-[260px] rounded-lg bg-zinc-950 border border-rose-500/40 px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isBusy || !motivoRechazo.trim()}
                      onClick={async () => {
                        await onReject(orden.orden_id, motivoRechazo.trim());
                        setRejectingId(null);
                        setMotivoRechazo('');
                      }}
                      className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-zinc-950 font-semibold text-xs disabled:opacity-40"
                    >
                      Confirmar Rechazo
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingId(null)}
                      className="px-3 py-2 rounded-lg bg-zinc-900 text-zinc-300 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
