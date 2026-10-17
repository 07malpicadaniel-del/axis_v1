import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Brain,
  Cpu,
  Database,
  GitBranch,
  Globe,
  ShieldAlert,
  Sparkles,
  Play,
  RefreshCw,
  Send,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface BobChatMessage {
  role: "user" | "bob";
  content: string;
  thinking?: string | null;
  island?: string;
  similarity?: number;
  ingest_ms?: number;
  thalamus_us?: number;
  hippocampus_us?: number;
  total_ms?: number;
  tools_used?: string[];
  mode?: string;
}

export const BobModule: React.FC = () => {
  const [online, setOnline] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>("Desconectado");
  const [causalEdges, setCausalEdges] = useState<number>(0);
  const [sysInfo, setSysInfo] = useState<string>("");
  const [mode, setMode] = useState<string>("normal");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [openThinkIdx, setOpenThinkIdx] = useState<number | null>(null);
  const [messages, setMessages] = useState<BobChatMessage[]>([
    {
      role: "bob",
      content:
        "Oráculo BOB v2.0 acoplado a AXIS. Mi Hipocampo 4D (768-dim HNSW + Hipergrafo Causal) tiene indexado tu ecosistema (LEIKA, AXIS, AURORA, Sertra, Molex, ObraVoice, NanoTechLab, The Outpost) y tu estación Arch Linux (Ryzen 9 7900 + RTX 5060 Ti). Selecciona un modo cognitivo o envíame una instrucción.",
      island: "CoreRules",
    },
  ]);

  const checkBobStatus = async () => {
    try {
      const raw = await invoke<string>("get_bob_status");
      const data = JSON.parse(raw);
      if (data.online) {
        setOnline(true);
        setModelName(data.model || "Qwen 27B IQ4_XS");
        setCausalEdges(data.causal_edges || 0);
        setSysInfo(data.sys_info || "");
      }
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    checkBobStatus();
    const interval = setInterval(checkBobStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleWakeBob = async () => {
    setSyncMessage("Despertando a BOB (cargando 99 capas en RTX 5060 Ti)...");
    try {
      const msg = await invoke<string>("wake_bob_daemon");
      setSyncMessage(msg);
      setTimeout(checkBobStatus, 5000);
    } catch (e: any) {
      setSyncMessage(`Error: ${String(e)}`);
    }
  };

  const handleSyncEcosystem = async () => {
    setLoading(true);
    setSyncMessage("Sincronizando ~/proyectos y axiomas de AXIS en el Hipocampo 4D...");
    try {
      const raw = await invoke<string>("sync_bob_ecosystem");
      const data = JSON.parse(raw);
      setCausalEdges(data.causal_edges || causalEdges);
      setSyncMessage(
        `Hipocampo actualizado: ${data.axioms_seeded} axiomas maestros + ${(data.projects_indexed || []).length} repositorios indexados.`
      );
    } catch (e: any) {
      setSyncMessage(`Error sincronizando: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg, mode }]);
    setLoading(true);

    try {
      // Recopilar contexto vivo de Axis (tareas y proyectos locales) para dárselo a Bob
      let axisSnapshot = "";
      try {
        const tasks = await invoke<any[]>("get_tasks");
        const projects = await invoke<any[]>("scan_local_projects");
        axisSnapshot = `Tareas activas en Axis: ${JSON.stringify(tasks?.slice(0, 8) || [])} | Proyectos detectados por Axis Library: ${JSON.stringify(projects?.map((p: any) => p.name) || [])}`;
      } catch {
        axisSnapshot = "Módulo Axis conectado.";
      }

      const raw = await invoke<string>("ask_bob_agent", {
        message: userMsg,
        mode,
        axisContext: axisSnapshot,
      });
      const res = JSON.parse(raw);

      if (res.causal_edges_total !== undefined) {
        setCausalEdges(res.causal_edges_total);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "bob",
          content: res.answer || "Sin respuesta del Córtex.",
          thinking: res.thinking,
          island: res.island,
          similarity: res.similarity,
          ingest_ms: res.ingest_ms,
          thalamus_us: res.thalamus_us,
          hippocampus_us: res.hippocampus_us,
          total_ms: res.total_ms,
          tools_used: res.tools_used,
          mode,
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bob",
          content: `[!] No se pudo contactar con el demonio de BOB en el puerto 8086: ${String(e)}`,
          island: "Offline",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 gap-4 overflow-hidden">
      {/* Cabecera de Telemetría del Silicio y Control del Demonio */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
          <div>
            <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-400" />
              BOB ENGINE v2.0 — ORÁCULO CENTRAL DE AXIS
            </h1>
            <p className="text-xs text-zinc-400">
              {online ? modelName : "Demonio en puerto 8086 apagado"} | Aristas Causales (Plano 2):{" "}
              <span className="text-emerald-400 font-mono">{causalEdges}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!online && (
            <button
              onClick={handleWakeBob}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold transition"
            >
              <Play className="w-4 h-4" />
              Despertar a BOB (GPU)
            </button>
          )}
          <button
            onClick={handleSyncEcosystem}
            disabled={!online || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium border border-zinc-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Sincronizar Ecosistema y ~/proyectos
          </button>
        </div>
      </div>

      {/* Telemetría rápida de RTX 5060 Ti y mensaje de sincronización */}
      {(sysInfo || syncMessage) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {sysInfo && (
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3 font-mono text-zinc-300 whitespace-pre-wrap">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <Cpu className="w-4 h-4" /> Telemetría Bare-Metal (Arch Linux + RTX 5060 Ti)
              </div>
              {sysInfo.trim()}
            </div>
          )}
          {syncMessage && (
            <div className="bg-zinc-900/60 border border-emerald-900/60 rounded-lg p-3 text-emerald-300 flex items-center">
              {syncMessage}
            </div>
          )}
        </div>
      )}

      {/* Selector de Modo Cognitivo (Legos 1 a 5) */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "normal", label: "Córtex + ReAct PC", icon: Terminal },
          { id: "deep-think", label: "/deep-think (Árbol Binario ABE)", icon: GitBranch },
          { id: "rem", label: "/rem (Sueño Algorítmico)", icon: Sparkles },
          { id: "web", label: "/web (Búsqueda Internet)", icon: Globe },
          { id: "quiron", label: "/quiron (Escudo Zero-Knowledge)", icon: ShieldAlert },
        ].map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                active
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Historial de Conversación y Telemetría del Hipocampo 4D */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border ${
              m.role === "user"
                ? "bg-zinc-900/40 border-zinc-800 ml-12"
                : "bg-zinc-900/90 border-zinc-800/90 mr-4"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-zinc-400">
              <span className="font-bold text-zinc-200">
                {m.role === "user" ? `Daniel [${m.mode || "normal"}]` : "BOB (Oráculo Local)"}
              </span>

              {m.role === "bob" && m.island && (
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Database className="w-3 h-3" /> Isla: {m.island}
                    {m.similarity !== undefined ? ` (sim=${m.similarity.toFixed(2)})` : ""}
                  </span>
                  {m.thalamus_us !== undefined && (
                    <span>Tálamo SIMD: {m.thalamus_us.toFixed(2)} µs</span>
                  )}
                  {m.hippocampus_us !== undefined && (
                    <span>Hipocampo 4D: {m.hippocampus_us.toFixed(2)} µs</span>
                  )}
                  {m.total_ms !== undefined && (
                    <span>Total: {(m.total_ms / 1000).toFixed(2)} s</span>
                  )}
                </div>
              )}
            </div>

            {/* Herramientas ejecutadas en el turno */}
            {m.tools_used && m.tools_used.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {m.tools_used.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono"
                  >
                    Tool: {t}
                  </span>
                ))}
              </div>
            )}

            {/* Visor desplegable del Buffer Oculto <think> */}
            {m.thinking && (
              <div className="mb-3">
                <button
                  onClick={() => setOpenThinkIdx(openThinkIdx === idx ? null : idx)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 font-mono"
                >
                  {openThinkIdx === idx ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  Inspeccionar Buffer de Pensamiento Oculto (&lt;think&gt;)
                </button>
                {openThinkIdx === idx && (
                  <pre className="mt-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {m.thinking}
                  </pre>
                )}
              </div>
            )}

            <div className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed font-sans">
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Entrada */}
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={
            mode === "deep-think"
              ? "Describe el problema en Rust para evaluar en el Árbol Binario de Escenarios (ABE)..."
              : mode === "quiron"
              ? "Ingresa el fragmento o arquitectura confidencial para ofuscar con el Escudo Quirón..."
              : "Escribe una orden para BOB (conoce todos tus proyectos, tareas de Axis y estado de tu PC)..."
          }
          className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-100 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-semibold transition"
        >
          <Send className="w-4 h-4" />
          {loading ? "Procesando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
};
