import React, { useCallback, useEffect, useRef, useState } from 'react';
import { auroraApi, extraerMensajeError, wsUrlDesdeDaemon } from './api';
import { AuroraTabId, CommandCenterBar } from './CommandCenterBar';
import { GatekeeperHallPanel } from './GatekeeperHallPanel';
import { OsintTelaranaPanel } from './OsintTelaranaPanel';
import { PulseTelemetryPanel } from './PulseTelemetryPanel';
import type {
  AuroraHealthState,
  DpoConsolidarResponse,
  GatekeeperPendientesResponse,
  HuntRequestPayload,
  HuntResponse,
  PulseEstadoResponse,
  SubgrafoProspecto,
  TelaranaResponse,
} from './types';

export const AuroraModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuroraTabId>('osint');
  const [health, setHealth] = useState<AuroraHealthState | null>(null);
  const [telarana, setTelarana] = useState<TelaranaResponse | null>(null);
  const [subgrafo, setSubgrafo] = useState<SubgrafoProspecto | null>(null);
  const [colaGatekeeper, setColaGatekeeper] =
    useState<GatekeeperPendientesResponse | null>(null);
  const [pulseEstado, setPulseEstado] = useState<PulseEstadoResponse | null>(null);
  const [lastHunt, setLastHunt] = useState<HuntResponse | null>(null);
  const [lastDpo, setLastDpo] = useState<DpoConsolidarResponse | null>(null);

  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingSubgrafo, setLoadingSubgrafo] = useState(false);
  const [launchingHunt, setLaunchingHunt] = useState(false);
  const [consolidatingDpo, setConsolidatingDpo] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [feedback, setFeedback] = useState<{
    tipo: 'ok' | 'error';
    mensaje: string;
  } | null>(null);

  const selectedProspectoRef = useRef<string | null>(null);

  const cargarPanelesConDaemon = useCallback(async () => {
    const [telResult, gkResult, pulseResult] = await Promise.allSettled([
      auroraApi.getTelarana(),
      auroraApi.listGatekeeper(),
      auroraApi.getPulseStatus(),
    ]);

    if (telResult.status === 'fulfilled') setTelarana(telResult.value);
    if (gkResult.status === 'fulfilled') setColaGatekeeper(gkResult.value);
    if (pulseResult.status === 'fulfilled') setPulseEstado(pulseResult.value);

    const activeId = selectedProspectoRef.current;
    if (activeId) {
      try {
        const sub = await auroraApi.getSubgrafo(activeId);
        setSubgrafo(sub);
      } catch {
        setSubgrafo(null);
        selectedProspectoRef.current = null;
      }
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const h = await auroraApi.health();
      setHealth(h);
      if (h.online) {
        await cargarPanelesConDaemon();
      }
    } catch (err) {
      setFeedback({ tipo: 'error', mensaje: extraerMensajeError(err) });
    } finally {
      setLoadingHealth(false);
    }
  }, [cargarPanelesConDaemon]);

  useEffect(() => {
    void refreshAll();
    const timer = window.setInterval(() => {
      void refreshAll();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [refreshAll]);

  useEffect(() => {
    if (!health?.online || !health.daemon_url) {
      setWsConnected(false);
      return;
    }
    const wsUrl = wsUrlDesdeDaemon(health.daemon_url);
    if (!wsUrl) return;

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setWsConnected(true);
      socket.onclose = () => setWsConnected(false);
      socket.onerror = () => setWsConnected(false);
      socket.onmessage = () => {
        void refreshAll();
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      setWsConnected(false);
      socket?.close();
    };
  }, [health?.online, health?.daemon_url, refreshAll]);

  const handleSelectProspecto = async (prospectoId: string) => {
    selectedProspectoRef.current = prospectoId;
    setLoadingSubgrafo(true);
    try {
      const data = await auroraApi.getSubgrafo(prospectoId);
      setSubgrafo(data);
    } catch (err) {
      setFeedback({ tipo: 'error', mensaje: extraerMensajeError(err) });
    } finally {
      setLoadingSubgrafo(false);
    }
  };

  const handleLaunchHunt = async (payload: HuntRequestPayload) => {
    setLaunchingHunt(true);
    setFeedback(null);
    try {
      const res = await auroraApi.launchHunt(payload);
      setLastHunt(res);
      setFeedback({
        tipo: 'ok',
        mensaje: `Cacería completada (${res.prospectos_ingestados} prospectos, ${res.planes_encolados.length} órdenes enviadas a Sala Gatekeeper).`,
      });
      await refreshAll();
    } catch (err) {
      setFeedback({ tipo: 'error', mensaje: extraerMensajeError(err) });
    } finally {
      setLaunchingHunt(false);
    }
  };

  const handleApproveOrder = async (
    ordenId: string,
    despacharInmediatamente: boolean,
  ) => {
    setBusyOrderId(ordenId);
    setFeedback(null);
    try {
      const res = await auroraApi.approveOrder(ordenId, despacharInmediatamente);
      setFeedback({
        tipo: 'ok',
        mensaje: `Orden ${res.orden_id.slice(0, 8)} manufacturada (${res.estado}) en ${res.paquete_manufacturado.directorio_salida}`,
      });
      await refreshAll();
    } catch (err) {
      setFeedback({ tipo: 'error', mensaje: extraerMensajeError(err) });
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleRejectOrder = async (ordenId: string, motivo: string) => {
    setBusyOrderId(ordenId);
    setFeedback(null);
    try {
      const res = await auroraApi.rejectOrder(ordenId, motivo);
      setFeedback({
        tipo: 'ok',
        mensaje: `Orden ${res.orden_id.slice(0, 8)} marcada como Rechazada en auditoría Gatekeeper.`,
      });
      await refreshAll();
    } catch (err) {
      setFeedback({ tipo: 'error', mensaje: extraerMensajeError(err) });
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleOptOut = async (
    prospectoId: string,
    motivo: string,
    campanaId?: string,
  ) => {
    setPurgingId(prospectoId);
    setFeedback(null);
    try {
      const res = await auroraApi.triggerOptOut(prospectoId, motivo, campanaId);
      if (selectedProspectoRef.current === prospectoId) {
        selectedProspectoRef.current = null;
        setSubgrafo(null);
      }
      setFeedback({
        tipo: 'ok',
        mensaje: `${res.mensaje} (órdenes canceladas: ${res.ordenes_canceladas})`,
      });
      await refreshAll();
    } catch (err) {
      setFeedback({ tipo: 'error', mensaje: extraerMensajeError(err) });
    } finally {
      setPurgingId(null);
    }
  };

  const handleRunDpo = async () => {
    setConsolidatingDpo(true);
    setFeedback(null);
    try {
      const res = await auroraApi.runDpoConsolidation();
      setLastDpo(res);
      setFeedback({
        tipo: 'ok',
        mensaje: `Consolidación DPO finalizada: ${res.dataset.entradas.length} pares exportados, ${res.dataset.nodos_4d_recalibrados} nodos 4D recalibrados.`,
      });
      await refreshAll();
    } catch (err) {
      setFeedback({ tipo: 'error', mensaje: extraerMensajeError(err) });
    } finally {
      setConsolidatingDpo(false);
    }
  };

  const handleOpenArtifact = async (ruta: string) => {
    try {
      await auroraApi.openArtifact(ruta);
    } catch (err) {
      setFeedback({ tipo: 'error', mensaje: extraerMensajeError(err) });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <CommandCenterBar
        health={health}
        loadingHealth={loadingHealth}
        consolidatingDpo={consolidatingDpo}
        activeTab={activeTab}
        pendingCount={colaGatekeeper?.total_pendientes ?? health?.ordenes_pendientes ?? 0}
        wsConnected={wsConnected}
        onSelectTab={setActiveTab}
        onRefreshAll={() => void refreshAll()}
        onRunDpo={() => void handleRunDpo()}
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {feedback && (
          <div
            className={`rounded-xl px-4 py-2.5 text-xs border flex items-center justify-between gap-3 ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            }`}
          >
            <span>{feedback.mensaje}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-[11px] opacity-75 hover:opacity-100"
            >
              Cerrar
            </button>
          </div>
        )}

        {activeTab === 'osint' && (
          <OsintTelaranaPanel
            daemonOnline={Boolean(health?.online)}
            telarana={telarana}
            subgrafo={subgrafo}
            loadingSubgrafo={loadingSubgrafo}
            launchingHunt={launchingHunt}
            purgingId={purgingId}
            lastHunt={lastHunt}
            onLaunchHunt={handleLaunchHunt}
            onSelectProspecto={(id) => void handleSelectProspecto(id)}
            onTriggerOptOut={(id, motivo) => handleOptOut(id, motivo)}
          />
        )}

        {activeTab === 'gatekeeper' && (
          <GatekeeperHallPanel
            daemonOnline={Boolean(health?.online)}
            cola={colaGatekeeper}
            busyOrderId={busyOrderId}
            purgingId={purgingId}
            onApprove={handleApproveOrder}
            onReject={handleRejectOrder}
            onOptOut={(prospectoId, campanaId, motivo) =>
              handleOptOut(prospectoId, motivo, campanaId)
            }
            onOpenArtifact={handleOpenArtifact}
          />
        )}

        {activeTab === 'pulse' && (
          <PulseTelemetryPanel
            daemonOnline={Boolean(health?.online)}
            pulse={pulseEstado}
            lastDpo={lastDpo}
            consolidatingDpo={consolidatingDpo}
            onRunDpo={handleRunDpo}
          />
        )}
      </main>
    </div>
  );
};
