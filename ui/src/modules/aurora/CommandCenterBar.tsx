import React from 'react';
import {
  Activity,
  AlertTriangle,
  Cpu,
  HardDrive,
  Network,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { AuroraHealthState, EstadoSubsistema } from './types';

export type AuroraTabId = 'osint' | 'gatekeeper' | 'pulse';

function formatearModoEjecucion(health: AuroraHealthState | null): {
  etiqueta: string;
  clases: string;
} | null {
  if (!health?.online) {
    return null;
  }
  const modo = health.modo_ejecucion ?? (health.modo_offline ? 'simulado_offline' : 'real_con_fallback');
  switch (modo) {
    case 'estricto_real':
      return {
        etiqueta: 'Estricto Real',
        clases: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      };
    case 'real_con_fallback':
      return {
        etiqueta: 'Híbrido Real',
        clases: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      };
    case 'simulado_offline':
      return {
        etiqueta: 'Mock Determinista',
        clases: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      };
  }
}

interface CommandCenterBarProps {
  health: AuroraHealthState | null;
  loadingHealth: boolean;
  consolidatingDpo: boolean;
  activeTab: AuroraTabId;
  pendingCount: number;
  wsConnected: boolean;
  onSelectTab: (tab: AuroraTabId) => void;
  onRefreshAll: () => void;
  onRunDpo: () => void;
}

export const CommandCenterBar: React.FC<CommandCenterBarProps> = ({
  health,
  loadingHealth,
  consolidatingDpo,
  activeTab,
  pendingCount,
  wsConnected,
  onSelectTab,
  onRefreshAll,
  onRunDpo,
}) => {
  const isOnline = Boolean(health?.online);
  const modoBadge = formatearModoEjecucion(health);
  const subsistemasLista: Array<{ key: string; label: string; data: EstadoSubsistema }> =
    health?.subsistemas
      ? [
          { key: 'bob_llm', label: 'BOB LLM', data: health.subsistemas.bob_llm },
          { key: 'piper_tts', label: 'Piper TTS', data: health.subsistemas.piper_tts },
          {
            key: 'chromium_headless',
            label: 'Chromium',
            data: health.subsistemas.chromium_headless,
          },
          { key: 'ffmpeg_nvenc', label: 'FFmpeg / NVENC', data: health.subsistemas.ffmpeg_nvenc },
          { key: 'cdp_browser', label: 'CDP :9222', data: health.subsistemas.cdp_browser },
          { key: 'smtp_transport', label: 'SMTP TLS', data: health.subsistemas.smtp_transport },
        ]
      : [];

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/95 px-6 py-4 space-y-4 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                Aurora v2 · Cockpit Comercial
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isOnline ? 'Daemon Online' : 'DaemonOffline'}
              </span>
              {modoBadge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${modoBadge.clases}`}
                >
                  {modoBadge.etiqueta}
                </span>
              )}
              {wsConnected && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                  WS Tiempo Real
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inteligencia OSINT México · Telaraña Topológica 4D · Gatekeeper Multimodal · Pulso DPO
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefreshAll}
            disabled={loadingHealth}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>

          <button
            onClick={onRunDpo}
            disabled={!isOnline || consolidatingDpo}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className={`w-3.5 h-3.5 ${consolidatingDpo ? 'animate-spin' : ''}`} />
            {consolidatingDpo ? 'Consolidando DPO...' : 'Consolidar DPO'}
          </button>
        </div>
      </div>

      {!isOnline && health && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-100">
                Demonio local `aurora-daemon` desconectado ({health.daemon_url})
              </p>
              <p className="text-amber-300/90 mt-0.5">
                {health.mensaje ??
                  'La UI de AXIS permanece operativa y sin bloqueos. Levanta el servicio persistente para operar cacerías y Gatekeeper.'}
              </p>
            </div>
          </div>
          <code className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950/90 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            cargo run -p aurora-daemon
          </code>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 px-3.5 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Córtex BOB VRAM</span>
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-xs font-semibold ${
                health?.bob_online ? 'text-emerald-400' : 'text-zinc-300'
              }`}
            >
              {isOnline ? (health?.bob_online ? 'Online' : 'En espera') : 'Offline'}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              slot={health?.bob_slot_id ?? 0}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
            {health?.hardware_vram_modelo ?? 'RTX 5060 Ti 16 GB · Modelo único'}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 px-3.5 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>CPU / RAM Sistema</span>
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <p className="mt-1 text-xs font-semibold text-zinc-100 truncate">
            {health?.hardware_ram_sistema ?? 'Ryzen 9 · 64 GB RAM (OSINT/HNSW/TTS)'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
            bind: {health?.bind_addr ?? '127.0.0.1:8090'}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 px-3.5 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Telaraña 4D</span>
            <Network className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <p className="mt-1 text-sm font-bold text-zinc-100 font-mono">
            {health?.nodos_4d ?? 0}{' '}
            <span className="text-[11px] font-normal text-zinc-400">nodos</span> ·{' '}
            {health?.aristas_4d ?? 0}{' '}
            <span className="text-[11px] font-normal text-zinc-400">aristas</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Círculo Cercano 1–2 saltos</p>
        </div>

        <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 px-3.5 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Sala Gatekeeper</span>
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <p className="mt-1 text-sm font-bold text-zinc-100 font-mono">
            {pendingCount}{' '}
            <span className="text-[11px] font-normal text-zinc-400">pendientes</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Barrera Zero-Bypass activa</p>
        </div>

        <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 px-3.5 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Telemetría / Uptime</span>
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <p className="mt-1 text-sm font-bold text-zinc-100 font-mono">
            {health?.telemetria_eventos ?? 0}{' '}
            <span className="text-[11px] font-normal text-zinc-400">eventos</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
            uptime: {health?.uptime_s ?? 0}s
          </p>
        </div>
      </div>

      {isOnline && subsistemasLista.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {subsistemasLista.map(({ key, label, data }) => {
            const real = data.modo_real_activo;
            const ok = data.disponible;
            const dotClass = real
              ? 'bg-emerald-400'
              : ok
                ? 'bg-sky-400'
                : 'bg-amber-400';
            const cardClass = real
              ? 'border-emerald-500/25 bg-emerald-950/15 text-emerald-200'
              : ok
                ? 'border-sky-500/25 bg-sky-950/15 text-sky-200'
                : 'border-amber-500/25 bg-amber-950/15 text-amber-200';
            const statusText = real ? 'Real' : ok ? 'Mock' : 'Fallback';
            return (
              <div
                key={key}
                title={`${data.nombre}: ${data.detalle} (${data.ruta_o_endpoint})`}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${cardClass}`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                    {label}
                  </span>
                  <span className="font-mono text-[10px] opacity-85 shrink-0">{statusText}</span>
                </div>
                <p className="text-[10px] opacity-75 truncate mt-0.5">{data.detalle}</p>
              </div>
            );
          })}
        </div>
      )}

      <nav className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onSelectTab('osint')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'osint'
              ? 'bg-zinc-100 text-zinc-950'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          Caza OSINT & Telaraña 4D
        </button>
        <button
          onClick={() => onSelectTab('gatekeeper')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'gatekeeper'
              ? 'bg-zinc-100 text-zinc-950'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <span>Sala Gatekeeper</span>
          {pendingCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'gatekeeper'
                  ? 'bg-zinc-950 text-zinc-100'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onSelectTab('pulse')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'pulse'
              ? 'bg-zinc-100 text-zinc-950'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          Pulso & Telemetría DPO
        </button>
      </nav>
    </header>
  );
};
