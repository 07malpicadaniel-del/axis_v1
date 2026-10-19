import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Brain,
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
  Plus,
  Layers,
  Network,
  Columns,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Edit3,
  Check,
  Mic,
  Square,
  ExternalLink,
  Zap,
  Volume2,
  VolumeX,
  Paperclip,
  FolderGit2,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";

interface CustomIslandSummary {
  slug: string;
  name: string;
  description: string;
  node_count: number;
}

interface GraphIslandDto {
  id: string;
  name: string;
  description: string;
  is_custom: boolean;
  node_count: number;
}

interface GraphNodeDto {
  id: string;
  raw_id: number;
  label: string;
  content: string;
  island: string;
  is_custom: boolean;
  validations: number;
  lambda: number;
  vector_preview: number[];
}

interface GraphEdgeDto {
  source: string;
  target: string;
  kind: string;
  label: string;
  weight: number;
}

interface HippocampusGraphSnapshot {
  islands: GraphIslandDto[];
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  total_vectors: number;
  total_synapses: number;
}

interface SimNode {
  id: string;
  label: string;
  kind: "island" | "memory";
  islandId: string;
  isCustom: boolean;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  vx: number;
  vy: number;
  radius: number;
  raw?: GraphNodeDto;
  islandRaw?: GraphIslandDto;
}

interface AttachedItem {
  filename: string;
  savedPath: string;
  isImage: boolean;
  previewDataUrl?: string;
  summary: string;
}

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
  attachments?: { filename: string; isImage: boolean; previewDataUrl?: string }[];
}

interface ChatSession {
  id: string;
  title: string;
  island: string;
  workspacePath?: string;
  workspaceFiles?: string[];
  createdAt: number;
  updatedAt: number;
  messages: BobChatMessage[];
}

const STORAGE_KEY = "axis_bob_chat_sessions_v2";

const PRACTICE_LANG_OPTIONS = [
  { id: "auto", label: "🎙️ Auto Idioma" },
  { id: "es", label: "🇲🇽 Español" },
  { id: "en", label: "🇺🇸 Practicar Inglés" },
  { id: "fr", label: "🇫🇷 Practicar Francés" },
  { id: "de", label: "🇩🇪 Practicar Alemán" },
  { id: "ja", label: "🇯🇵 Practicar Japonés" },
];

const BOB_VOICE_OPTIONS = [
  { id: "bob_jorge", label: "🔊 Voz: Jorge (Oráculo MX)" },
  { id: "bob_alvaro", label: "🔊 Voz: Álvaro (España)" },
  { id: "bob_tomas", label: "🔊 Voz: Tomás (Argentina)" },
  { id: "bob_christopher", label: "🔊 Voz: Christopher (US)" },
  { id: "bob_ryan", label: "🔊 Voz: Ryan (UK)" },
];

const createDefaultSession = (island: string = "global"): ChatSession => {
  const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title: "Nueva conversación",
    island,
    workspacePath: `/home/daniel/proyectos/bob_workspaces/${id}`,
    workspaceFiles: ["WORKSPACE_MANIFEST.md", "ERROR_LOG.md"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      {
        role: "bob",
        content:
          island === "global"
            ? `Oráculo BOB v2.0 acoplado a AXIS. He creado y vinculado la carpeta exclusiva de este proyecto en ~/proyectos/bob_workspaces/${id} dentro de mi Hipocampo 4D para almacenar código, manifiestos, imágenes adjuntas y bitácoras de errores sin límite de ventana de contexto.`
            : `Hilo de conversación limpio vinculado a la Isla Aislada [${island.toUpperCase()}] con carpeta de trabajo dedicada en ~/proyectos/bob_workspaces/${id}.`,
        island: island === "global" ? "CoreRules" : `Isla:${island}`,
      },
    ],
  };
};

export const BobModule: React.FC = () => {
  const [online, setOnline] = useState<boolean>(false);
  const [waking, setWaking] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>("Desconectado");
  const [causalEdges, setCausalEdges] = useState<number>(0);
  const [mode, setMode] = useState<string>("normal");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [openThinkIdx, setOpenThinkIdx] = useState<number | null>(null);

  const [viewLayout, setViewLayout] = useState<"chat" | "split" | "graph">("split");
  const [showChatSidebar, setShowChatSidebar] = useState<boolean>(true);
  const [showWorkspaceFilesModal, setShowWorkspaceFilesModal] = useState<boolean>(false);

  const [customIslands, setCustomIslands] = useState<CustomIslandSummary[]>([]);
  const [activeIsland, setActiveIsland] = useState<string>("global");
  const [showNewIslandForm, setShowNewIslandForm] = useState<boolean>(false);
  const [newIslandName, setNewIslandName] = useState<string>("");
  const [newIslandDesc, setNewIslandDesc] = useState<string>("");

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignorar
    }
    return [createDefaultSession("global")];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || "";
  });
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [chatFilterQuery, setChatFilterQuery] = useState<string>("");

  // Estados de Voz, Menús Desplegables Personalizados (0% <select>) y Archivos Adjuntos
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [transcribingVoice, setTranscribingVoice] = useState<boolean>(false);
  const [bobVoiceEnabled, setBobVoiceEnabled] = useState<boolean>(true);
  const [bobVoiceId, setBobVoiceId] = useState<string>("bob_jorge");
  const [practiceLang, setPracticeLang] = useState<string>("auto");
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState<boolean>(false);

  const [pendingAttachments, setPendingAttachments] = useState<AttachedItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [marathonStatus, setMarathonStatus] = useState<any>(null);
  const [maxMarathonCycles, setMaxMarathonCycles] = useState<number>(35);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Silencioso
    }
  }, [sessions]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const currentMessages = activeSession?.messages || [];

  // Estado del Grafo 4D
  const [graphData, setGraphData] = useState<HippocampusGraphSnapshot | null>(null);
  const [graphSearch, setGraphSearch] = useState<string>("");
  const [graphIslandFilter, setGraphIslandFilter] = useState<string>("ALL");
  const [showIslandDropdown, setShowIslandDropdown] = useState<boolean>(false);
  const [selectedSimNode, setSelectedSimNode] = useState<SimNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [edgeFilter, setEdgeFilter] = useState<{
    causal: boolean;
    semantic: boolean;
    island: boolean;
  }>({
    causal: true,
    semantic: true,
    island: true,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simEdgesRef = useRef<GraphEdgeDto[]>([]);
  const cameraRef = useRef<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 0.72,
  });
  const dragStateRef = useRef<{
    draggingNodeId: string | null;
    panning: boolean;
    lastX: number;
    lastY: number;
  }>({ draggingNodeId: null, panning: false, lastX: 0, lastY: 0 });

  // Inicializar en disco la carpeta del Workspace de la sesión activa
  const initSessionWorkspaceOnBackend = async (sess: ChatSession) => {
    try {
      const r = await fetch("http://127.0.0.1:8086/session/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sess.id,
          title: sess.title,
          island: sess.island,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.ok) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sess.id
                ? {
                    ...s,
                    workspacePath: d.workspace_path,
                    workspaceFiles: d.files || [],
                  }
                : s
            )
          );
        }
      }
    } catch {
      // Silencioso si el demonio aún está apagado
    }
  };

  useEffect(() => {
    if (online && activeSession) {
      initSessionWorkspaceOnBackend(activeSession);
    }
  }, [online, activeSessionId]);

  const handleCreateNewChat = async (targetIsland: string = activeIsland) => {
    const newChat = createDefaultSession(targetIsland);
    setSessions((prev) => [newChat, ...prev]);
    setActiveSessionId(newChat.id);
    setOpenThinkIdx(null);
    setPendingAttachments([]);
    if (online) {
      await initSessionWorkspaceOnBackend(newChat);
      setSyncMessage(
        `📁 Nueva carpeta de proyecto creada y vinculada al Hipocampo: ${newChat.workspacePath}`
      );
      fetchGraphSnapshot();
    }
  };

  const handleSelectChat = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setActiveIsland(session.island);
    setGraphIslandFilter(
      session.island === "global" ? "ALL" : `custom:${session.island}`
    );
    setOpenThinkIdx(null);
    setPendingAttachments([]);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fallback = createDefaultSession(activeIsland);
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
        setActiveIsland(remaining[0].island);
      }
      return remaining;
    });
  };

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleConfirmRename = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim()) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, title: editingTitle.trim() } : s
        )
      );
    }
    setEditingSessionId(null);
  };

  const appendMessageToSession = (
    sessionId: string,
    msg: BobChatMessage,
    newIslandSlug?: string,
    wsPath?: string,
    wsFiles?: string[]
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        let updatedTitle = s.title;
        if (
          msg.role === "user" &&
          (s.title === "Nueva conversación" || s.messages.length <= 1)
        ) {
          const clean = msg.content
            .replace("🎙️", "")
            .replace(/\s+/g, " ")
            .trim();
          updatedTitle = clean.length > 34 ? `${clean.slice(0, 34)}...` : clean;
        }
        return {
          ...s,
          title: updatedTitle,
          island: newIslandSlug || s.island,
          workspacePath: wsPath || s.workspacePath,
          workspaceFiles: wsFiles || s.workspaceFiles,
          updatedAt: Date.now(),
          messages: [...s.messages, msg],
        };
      })
    );
  };

  // 1. Selector Nativo de Archivos e Imágenes en Arch Linux (Botón 📎)
  const handleNativePickFiles = async () => {
    if (!online || uploadingFile) return;
    setUploadingFile(true);
    setSyncMessage("📂 Abriendo selector de archivos e imágenes de Arch Linux...");
    try {
      const r = await fetch("http://127.0.0.1:8086/session/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.id,
          title: activeSession.title,
          island: activeIsland,
        }),
      });
      const d = await r.json();
      if (d.ok && Array.isArray(d.items)) {
        const added = d.items.map((it: any) => ({
          filename: it.filename,
          savedPath: it.saved_path,
          isImage: it.is_image,
          previewDataUrl: it.preview_data_url,
          summary: it.summary,
        }));
        setPendingAttachments((prev) => [...prev, ...added]);
        if (Array.isArray(d.workspace_files)) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSession.id
                ? { ...s, workspaceFiles: d.workspace_files }
                : s
            )
          );
        }
        setSyncMessage(
          `📎 ${added.length} archivo(s)/imagen(es) vinculados al Workspace y al Hipocampo 4D.`
        );
        fetchGraphSnapshot();
      } else {
        setSyncMessage(d.error || "Selección cancelada.");
      }
    } catch (err: any) {
      setSyncMessage(`Error al adjuntar archivo: ${String(err)}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // 2. Pegar Imágenes o Archivos con Ctrl + V (Soporta Clipboard Web y Wayland wl-paste)
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!online) return;
    const items = e.clipboardData?.items;
    let hasBrowserImageOrFile = false;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          hasBrowserImageOrFile = true;
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await uploadSingleBrowserFile(file);
          }
        }
      }
    }

    if (hasBrowserImageOrFile) return;

    // Si el portapapeles de texto está vacío al presionar Ctrl+V, verificamos si hay una captura/imagen en Wayland (wl-paste)
    const plainText = e.clipboardData?.getData("text/plain") || "";
    if (!plainText.trim()) {
      e.preventDefault();
      await handleWaylandClipboardPaste();
    }
  };

  const handleWaylandClipboardPaste = async () => {
    if (!online || uploadingFile) return;
    setUploadingFile(true);
    setSyncMessage("📋 Leyendo imagen/archivo del portapapeles de Wayland (Ctrl+V)...");
    try {
      const r = await fetch("http://127.0.0.1:8086/session/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.id,
          title: activeSession.title,
          island: activeIsland,
        }),
      });
      const d = await r.json();
      if (d.ok && Array.isArray(d.items) && d.items.length > 0) {
        const added = d.items.map((it: any) => ({
          filename: it.filename,
          savedPath: it.saved_path,
          isImage: it.is_image,
          previewDataUrl: it.preview_data_url,
          summary: it.summary,
        }));
        setPendingAttachments((prev) => [...prev, ...added]);
        if (Array.isArray(d.workspace_files)) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSession.id
                ? { ...s, workspaceFiles: d.workspace_files }
                : s
            )
          );
        }
        setSyncMessage(
          `📋 Imagen pegada desde el portapapeles (${added[0].filename}) y analizada en el Hipocampo 4D.`
        );
        fetchGraphSnapshot();
      } else {
        setSyncMessage(d.error || "No se detectó imagen en el portapapeles.");
      }
    } catch (err: any) {
      setSyncMessage(`Error leyendo portapapeles: ${String(err)}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const uploadSingleBrowserFile = async (file: File) => {
    setUploadingFile(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
      const base64Part = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const fname = file.name && file.name !== "image.png" ? file.name : `paste_${Date.now()}.png`;

      const r = await fetch("http://127.0.0.1:8086/session/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.id,
          island: activeIsland,
          filename: fname,
          content_base64: base64Part,
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setPendingAttachments((prev) => [
          ...prev,
          {
            filename: d.filename,
            savedPath: d.saved_path,
            isImage: d.is_image,
            previewDataUrl: d.is_image ? dataUrl : undefined,
            summary: d.summary,
          },
        ]);
        setSyncMessage(`📋 Imagen '${d.filename}' adjuntada con éxito.`);
        fetchGraphSnapshot();
      }
    } finally {
      setUploadingFile(false);
    }
  };

  // Manejo de subida de Archivos e Imágenes al Workspace de la Conversación
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    for (const file of Array.from(files)) {
      try {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        const base64Part = dataUrl.includes(",")
          ? dataUrl.split(",")[1]
          : dataUrl;

        const r = await fetch("http://127.0.0.1:8086/session/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: activeSession.id,
            island: activeIsland,
            filename: file.name,
            content_base64: base64Part,
          }),
        });

        const d = await r.json();
        if (d.ok) {
          setPendingAttachments((prev) => [
            ...prev,
            {
              filename: d.filename,
              savedPath: d.saved_path,
              isImage: d.is_image,
              previewDataUrl: d.is_image ? dataUrl : undefined,
              summary: d.summary,
            },
          ]);
          if (Array.isArray(d.workspace_files)) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === activeSession.id
                  ? { ...s, workspaceFiles: d.workspace_files }
                  : s
              )
            );
          }
          setSyncMessage(
            `📎 ${d.is_image ? "Imagen" : "Archivo"} '${
              d.filename
            }' guardado en el Workspace de este chat e indexado en el Hipocampo 4D.`
          );
          fetchGraphSnapshot();
        } else {
          setSyncMessage(`Error subiendo ${file.name}: ${d.error}`);
        }
      } catch (err: any) {
        setSyncMessage(`Error procesando archivo ${file.name}: ${String(err)}`);
      }
    }

    setUploadingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fetchMarathonStatus = async () => {
    try {
      const r = await fetch("http://127.0.0.1:8086/marathon/status");
      if (r.ok) {
        const d = await r.json();
        setMarathonStatus(d);
      }
    } catch {
      // Silencioso
    }
  };

  const speakBobText = async (text: string, customVoiceOrLang?: string) => {
    try {
      const targetVoice =
        customVoiceOrLang &&
        customVoiceOrLang !== "auto" &&
        !customVoiceOrLang.startsWith("bob_")
          ? customVoiceOrLang
          : bobVoiceId;
      await fetch("http://127.0.0.1:8086/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: targetVoice }),
      });
    } catch {
      // Silencioso
    }
  };

  const handleToggleVoice = async () => {
    if (!online) return;
    if (!isRecordingVoice) {
      try {
        await fetch("http://127.0.0.1:8086/voice/start", { method: "POST" });
        setIsRecordingVoice(true);
        setSyncMessage(
          "🎙️ Escuchando tu micrófono en vivo... Habla y vuelve a presionar el botón blanco para que BOB te responda."
        );
      } catch (e: any) {
        setSyncMessage(`Error iniciando micrófono: ${String(e)}`);
      }
    } else {
      setIsRecordingVoice(false);
      setTranscribingVoice(true);
      setSyncMessage(
        "⚡ Procesando voz y evaluando pronunciación con Whisper en Ryzen 9 CPU..."
      );
      try {
        const r = await fetch("http://127.0.0.1:8086/voice/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: practiceLang }),
        });
        const d = await r.json();
        if (d.ok && d.text) {
          const weakInfo =
            d.weak_words && d.weak_words.length > 0
              ? ` | Palabras a pulir: ${d.weak_words.join(", ")}`
              : " | Pronunciación clara";
          setSyncMessage(
            `✓ Whisper STT [${(
              d.language || "es"
            ).toUpperCase()} — Claridad: ${d.pronunciation_score}%]: "${
              d.text
            }"${weakInfo}`
          );

          const promptToSend =
            practiceLang !== "auto"
              ? `${d.text}\n\n${d.phonetic_report}\n[MODO TUTOR DE IDIOMAS ACTIVO]: Responde a Daniel de forma conversacional y, si hubo palabras con claridad menor a 82% o detalles gramaticales, dale una breve retroalimentación de pronunciación al final.`
              : d.text;

          await sendQueryToBob(promptToSend, activeIsland, d.text, d.language);
        } else {
          setSyncMessage(
            d.error || "No se detectó voz clara en la grabación."
          );
        }
      } catch (e: any) {
        setSyncMessage(`Error en Whisper STT: ${String(e)}`);
      } finally {
        setTranscribingVoice(false);
      }
    }
  };

  const handleLaunchBrowserBridge = async () => {
    try {
      const r = await fetch("http://127.0.0.1:8086/browser/launch", {
        method: "POST",
      });
      const d = await r.json();
      setSyncMessage(d.msg || "Navegador Puente iniciado en puerto 9222.");
    } catch (e: any) {
      setSyncMessage(`Error abriendo navegador puente: ${String(e)}`);
    }
  };

  const handleStartMarathon = async () => {
    if (!input.trim()) {
      setSyncMessage(
        "Escribe primero en la barra inferior el objetivo completo para el Modo Maratón."
      );
      return;
    }
    const goalText = input.trim();
    setInput("");
    try {
      await fetch("http://127.0.0.1:8086/marathon/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goalText,
          max_cycles: maxMarathonCycles,
        }),
      });
      setSyncMessage(
        `⚡ Modo Maratón iniciado (${maxMarathonCycles} ciclos máx. con purga automática de KV Cache cada 5 ciclos).`
      );
      fetchMarathonStatus();
    } catch (e: any) {
      setSyncMessage(`Error iniciando Maratón: ${String(e)}`);
    }
  };

  const handleStopMarathon = async () => {
    await fetch("http://127.0.0.1:8086/marathon/stop", { method: "POST" });
    fetchMarathonStatus();
    setSyncMessage("Modo Maratón detenido por el usuario.");
  };

  const fetchGraphSnapshot = async () => {
    try {
      const resp = await fetch("http://127.0.0.1:8086/graph");
      if (resp.ok) {
        const snap: HippocampusGraphSnapshot = await resp.json();
        setGraphData(snap);
        rebuildPhysicsNodes(snap);
      }
    } catch {
      // Silencioso
    }
  };

  const rebuildPhysicsNodes = (snap: HippocampusGraphSnapshot) => {
    const existingPos = new Map<
      string,
      { x: number; y: number; ax: number; ay: number }
    >();
    for (const n of simNodesRef.current) {
      existingPos.set(n.id, {
        x: n.x,
        y: n.y,
        ax: n.anchorX,
        ay: n.anchorY,
      });
    }

    const newSimNodes: SimNode[] = [];
    const totalIsl = Math.max(snap.islands.length, 1);
    const orbitRadius = 460;

    const islandCenters = new Map<string, { x: number; y: number }>();
    snap.islands.forEach((isl, idx) => {
      const angle = (2 * Math.PI * idx) / totalIsl - Math.PI / 2;
      const cx = Math.cos(angle) * orbitRadius;
      const cy = Math.sin(angle) * orbitRadius;
      islandCenters.set(isl.id, { x: cx, y: cy });

      const prev = existingPos.get(`island-${isl.id}`);
      newSimNodes.push({
        id: `island-${isl.id}`,
        label: isl.name,
        kind: "island",
        islandId: isl.id,
        isCustom: isl.is_custom,
        x: prev ? prev.x : cx,
        y: prev ? prev.y : cy,
        anchorX: cx,
        anchorY: cy,
        vx: 0,
        vy: 0,
        radius: isl.is_custom ? 20 : 18,
        islandRaw: isl,
      });
    });

    const nodesByIsland = new Map<string, GraphNodeDto[]>();
    for (const n of snap.nodes) {
      const arr = nodesByIsland.get(n.island) || [];
      arr.push(n);
      nodesByIsland.set(n.island, arr);
    }

    nodesByIsland.forEach((islandNodes, islId) => {
      const center = islandCenters.get(islId) || { x: 0, y: 0 };
      const count = islandNodes.length;
      islandNodes.forEach((n, localIdx) => {
        const ring = Math.floor(localIdx / 10);
        const posInRing = localIdx % 10;
        const itemsInRing = Math.min(10, count - ring * 10);
        const angle =
          (2 * Math.PI * posInRing) / Math.max(itemsInRing, 1) + ring * 0.35;
        const dist = 125 + ring * 85;

        const targetX = center.x + Math.cos(angle) * dist;
        const targetY = center.y + Math.sin(angle) * dist;
        const prev = existingPos.get(n.id);

        const nodeRadius = Math.min(11, 6.5 + Math.log1p(n.validations) * 1.8);
        newSimNodes.push({
          id: n.id,
          label: n.label,
          kind: "memory",
          islandId: n.island,
          isCustom: n.is_custom,
          x: prev ? prev.x : targetX,
          y: prev ? prev.y : targetY,
          anchorX: targetX,
          anchorY: targetY,
          vx: 0,
          vy: 0,
          radius: nodeRadius,
          raw: n,
        });
      });
    });

    simNodesRef.current = newSimNodes;
    simEdgesRef.current = snap.edges;
  };

  const checkBobStatus = async () => {
    try {
      const raw = await invoke<string>("get_bob_status");
      const data = JSON.parse(raw);
      if (data.online) {
        setOnline(true);
        setWaking(false);
        setModelName(data.model || "Qwen 27B IQ4_XS");
        setCausalEdges(data.causal_edges || 0);
        if (Array.isArray(data.custom_islands)) {
          setCustomIslands(data.custom_islands);
        }
        fetchGraphSnapshot();
        fetchMarathonStatus();
      }
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    checkBobStatus();
    const interval = setInterval(checkBobStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (viewLayout === "chat") return;
    let animationFrameId: number;
    let pulsePhase = 0;

    const renderLoop = () => {
      pulsePhase = (pulsePhase + 0.01) % 1.0;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (
          canvas.width !== Math.floor(rect.width * dpr) ||
          canvas.height !== Math.floor(rect.height * dpr)
        ) {
          canvas.width = Math.floor(rect.width * dpr);
          canvas.height = Math.floor(rect.height * dpr);
        }

        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const width = rect.width;
          const height = rect.height;

          ctx.fillStyle = "#09090b";
          ctx.fillRect(0, 0, width, height);

          ctx.strokeStyle = "rgba(39, 39, 42, 0.35)";
          ctx.lineWidth = 1;
          const gridStep = 60 * cameraRef.current.zoom;
          if (gridStep > 16) {
            const offsetX =
              (((width / 2 + cameraRef.current.x) % gridStep) + gridStep) %
              gridStep;
            const offsetY =
              (((height / 2 + cameraRef.current.y) % gridStep) + gridStep) %
              gridStep;
            for (let gx = offsetX; gx < width; gx += gridStep) {
              ctx.beginPath();
              ctx.moveTo(gx, 0);
              ctx.lineTo(gx, height);
              ctx.stroke();
            }
            for (let gy = offsetY; gy < height; gy += gridStep) {
              ctx.beginPath();
              ctx.moveTo(0, gy);
              ctx.lineTo(width, gy);
              ctx.stroke();
            }
          }

          const nodes = simNodesRef.current;
          const edges = simEdgesRef.current;
          const nodeMap = new Map<string, SimNode>();
          for (const n of nodes) nodeMap.set(n.id, n);

          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const a = nodes[i];
              const b = nodes[j];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const distSq = dx * dx + dy * dy + 0.1;
              const dist = Math.sqrt(distSq);

              const minSep =
                a.kind === "island" && b.kind === "island"
                  ? 320
                  : a.kind === "island" || b.kind === "island"
                  ? 110
                  : 58;

              if (dist < minSep) {
                const overlap = (minSep - dist) * 0.15;
                const nx = dx / dist;
                const ny = dy / dist;
                if (
                  dragStateRef.current.draggingNodeId !== a.id &&
                  a.kind !== "island"
                ) {
                  a.vx -= nx * overlap;
                  a.vy -= ny * overlap;
                }
                if (
                  dragStateRef.current.draggingNodeId !== b.id &&
                  b.kind !== "island"
                ) {
                  b.vx += nx * overlap;
                  b.vy += ny * overlap;
                }
              }
            }
          }

          for (const n of nodes) {
            if (dragStateRef.current.draggingNodeId === n.id) continue;
            const springK = n.kind === "island" ? 0.08 : 0.025;
            n.vx += (n.anchorX - n.x) * springK;
            n.vy += (n.anchorY - n.y) * springK;
            n.vx *= 0.78;
            n.vy *= 0.78;
            n.x += n.vx;
            n.y += n.vy;
          }

          ctx.translate(
            width / 2 + cameraRef.current.x,
            height / 2 + cameraRef.current.y
          );
          ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);

          const searchLower = graphSearch.trim().toLowerCase();
          const isNodeVisible = (n: SimNode) => {
            if (
              graphIslandFilter !== "ALL" &&
              n.islandId !== graphIslandFilter
            )
              return false;
            return true;
          };
          const isNodeHighlighted = (n: SimNode) => {
            if (!searchLower) return true;
            if (n.label.toLowerCase().includes(searchLower)) return true;
            if (n.raw?.content.toLowerCase().includes(searchLower)) return true;
            return false;
          };

          for (const e of edges) {
            if (e.kind === "causal" && !edgeFilter.causal) continue;
            if (e.kind === "semantic" && !edgeFilter.semantic) continue;
            if (e.kind === "island_member" && !edgeFilter.island) continue;

            const src = nodeMap.get(e.source);
            const dst = nodeMap.get(e.target);
            if (!src || !dst || !isNodeVisible(src) || !isNodeVisible(dst))
              continue;

            const isFocused =
              selectedSimNode?.id === src.id ||
              selectedSimNode?.id === dst.id ||
              hoveredNodeId === src.id ||
              hoveredNodeId === dst.id;

            const high = isNodeHighlighted(src) && isNodeHighlighted(dst);
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(dst.x, dst.y);

            if (e.kind === "causal") {
              ctx.strokeStyle = isFocused
                ? "#ffffff"
                : high
                ? "rgba(228, 228, 231, 0.55)"
                : "rgba(82, 82, 91, 0.12)";
              ctx.lineWidth = isFocused ? 2.2 : 1.4;
              ctx.stroke();

              if (high) {
                const px = src.x + (dst.x - src.x) * pulsePhase;
                const py = src.y + (dst.y - src.y) * pulsePhase;
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
              }
            } else if (e.kind === "semantic") {
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = isFocused
                ? "rgba(244, 244, 245, 0.75)"
                : high
                ? "rgba(161, 161, 170, 0.22)"
                : "rgba(63, 63, 70, 0.08)";
              ctx.lineWidth = isFocused ? 1.5 : 0.9;
              ctx.stroke();
              ctx.setLineDash([]);
            } else {
              ctx.strokeStyle = isFocused
                ? "rgba(212, 212, 216, 0.7)"
                : high
                ? "rgba(113, 113, 122, 0.28)"
                : "rgba(39, 39, 42, 0.1)";
              ctx.lineWidth = isFocused ? 1.4 : 0.8;
              ctx.stroke();
            }
          }

          for (const n of nodes) {
            if (!isNodeVisible(n)) continue;
            const high = isNodeHighlighted(n);
            const isSelected = selectedSimNode?.id === n.id;
            const isHovered = hoveredNodeId === n.id;

            if (n.kind === "island") {
              ctx.beginPath();
              ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
              ctx.strokeStyle =
                isSelected || isHovered
                  ? "#ffffff"
                  : n.isCustom
                  ? "rgba(255, 255, 255, 0.6)"
                  : "rgba(161, 161, 170, 0.4)";
              ctx.lineWidth = isSelected || isHovered ? 2.2 : 1.3;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
              ctx.fillStyle = n.isCustom ? "#ffffff" : "#18181b";
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.8;
              ctx.stroke();
            } else {
              if (isSelected || isHovered) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius + 5, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
                ctx.fill();
              }

              ctx.beginPath();
              ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
              if (!high) {
                ctx.fillStyle = "rgba(63, 63, 70, 0.3)";
              } else if (n.isCustom || (n.raw && n.raw.lambda === 0)) {
                ctx.fillStyle = "#ffffff";
              } else {
                ctx.fillStyle = "#a1a1aa";
              }
              ctx.fill();
              ctx.strokeStyle = isSelected || isHovered ? "#ffffff" : "#09090b";
              ctx.lineWidth = isSelected || isHovered ? 2.0 : 1.2;
              ctx.stroke();
            }
          }

          const occupiedBoxes: {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
          }[] = [];
          const zoom = cameraRef.current.zoom;

          const prioritizedNodes = [...nodes].sort((a, b) => {
            const aFocus =
              selectedSimNode?.id === a.id || hoveredNodeId === a.id
                ? 2
                : a.kind === "island"
                ? 1
                : 0;
            const bFocus =
              selectedSimNode?.id === b.id || hoveredNodeId === b.id
                ? 2
                : b.kind === "island"
                ? 1
                : 0;
            return bFocus - aFocus;
          });

          for (const n of prioritizedNodes) {
            if (!isNodeVisible(n)) continue;
            const isFocus =
              selectedSimNode?.id === n.id || hoveredNodeId === n.id;
            const high = isNodeHighlighted(n);

            if (
              n.kind === "memory" &&
              !isFocus &&
              !searchLower &&
              zoom < 0.78
            ) {
              continue;
            }

            const fontSize =
              n.kind === "island"
                ? 11.5 / Math.sqrt(zoom)
                : 10 / Math.sqrt(zoom);
            ctx.font = `${
              n.kind === "island" || isFocus ? "bold " : ""
            }${fontSize.toFixed(1)}px monospace`;

            const textStr =
              n.kind === "island" ? n.label : n.label.slice(0, 32);
            const textMetrics = ctx.measureText(textStr);
            const padX = 5 / Math.sqrt(zoom);
            const padY = 3 / Math.sqrt(zoom);
            const boxW = textMetrics.width + padX * 2;
            const boxH = fontSize + padY * 2;

            const boxX =
              n.kind === "island" ? n.x - boxW / 2 : n.x + n.radius + 6;
            const boxY =
              n.kind === "island"
                ? n.y - n.radius - boxH - 8
                : n.y - boxH / 2;

            const overlaps = occupiedBoxes.some(
              (b) =>
                boxX < b.x2 + 4 &&
                boxX + boxW > b.x1 - 4 &&
                boxY < b.y2 + 2 &&
                boxY + boxH > b.y1 - 2
            );

            if (overlaps && !isFocus && n.kind !== "island") {
              continue;
            }

            occupiedBoxes.push({
              x1: boxX,
              y1: boxY,
              x2: boxX + boxW,
              y2: boxY + boxH,
            });

            ctx.fillStyle = isFocus
              ? "#f4f4f5"
              : n.kind === "island"
              ? "rgba(24, 24, 27, 0.92)"
              : "rgba(9, 9, 11, 0.85)";
            ctx.strokeStyle = isFocus
              ? "#ffffff"
              : n.kind === "island"
              ? "rgba(161, 161, 170, 0.7)"
              : "rgba(63, 63, 70, 0.65)";
            ctx.lineWidth = 1 / zoom;

            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 4 / Math.sqrt(zoom));
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isFocus
              ? "#09090b"
              : high
              ? "#f4f4f5"
              : "rgba(161, 161, 170, 0.45)";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(textStr, boxX + padX, boxY + boxH / 2);
          }

          ctx.restore();
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    viewLayout,
    graphSearch,
    graphIslandFilter,
    selectedSimNode,
    hoveredNodeId,
    edgeFilter,
  ]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { wx: 0, wy: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left - rect.width / 2 - cameraRef.current.x;
    const sy = clientY - rect.top - rect.height / 2 - cameraRef.current.y;
    return {
      wx: sx / cameraRef.current.zoom,
      wy: sy / cameraRef.current.zoom,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setShowIslandDropdown(false);
    setShowLangMenu(false);
    setShowVoiceMenu(false);
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    for (let i = simNodesRef.current.length - 1; i >= 0; i--) {
      const n = simNodesRef.current[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= (n.radius + 7) * (n.radius + 7)) {
        setSelectedSimNode(n);
        dragStateRef.current = {
          draggingNodeId: n.id,
          panning: false,
          lastX: e.clientX,
          lastY: e.clientY,
        };
        return;
      }
    }
    dragStateRef.current = {
      draggingNodeId: null,
      panning: true,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    const st = dragStateRef.current;
    if (st.draggingNodeId) {
      const target = simNodesRef.current.find(
        (n) => n.id === st.draggingNodeId
      );
      if (target) {
        target.x = wx;
        target.y = wy;
        target.anchorX = wx;
        target.anchorY = wy;
        target.vx = 0;
        target.vy = 0;
      }
      return;
    }
    if (st.panning) {
      cameraRef.current.x += e.clientX - st.lastX;
      cameraRef.current.y += e.clientY - st.lastY;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      return;
    }

    let foundHover: string | null = null;
    for (let i = simNodesRef.current.length - 1; i >= 0; i--) {
      const n = simNodesRef.current[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= (n.radius + 7) * (n.radius + 7)) {
        foundHover = n.id;
        break;
      }
    }
    if (foundHover !== hoveredNodeId) {
      setHoveredNodeId(foundHover);
    }
  };

  const handleCanvasMouseUp = () => {
    dragStateRef.current.draggingNodeId = null;
    dragStateRef.current.panning = false;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const factor = e.deltaY < 0 ? 1.14 : 0.88;
    cameraRef.current.zoom = Math.min(
      3.5,
      Math.max(0.32, cameraRef.current.zoom * factor)
    );
  };

  const handleWakeBob = async () => {
    setWaking(true);
    setSyncMessage(
      "Iniciando demonio de BOB y cargando 99 capas en RTX 5060 Ti (~15-25s)..."
    );
    try {
      const msg = await invoke<string>("wake_bob_daemon");
      setSyncMessage(msg);
    } catch (e: any) {
      setWaking(false);
      setSyncMessage(`Error al despertar a BOB: ${String(e)}`);
    }
  };

  const handleSyncEcosystem = async () => {
    setLoading(true);
    setSyncMessage(
      "Sincronizando ~/proyectos y axiomas de AXIS en el Hipocampo 4D..."
    );
    try {
      const raw = await invoke<string>("sync_bob_ecosystem");
      const data = JSON.parse(raw);
      setCausalEdges(data.causal_edges || causalEdges);
      if (Array.isArray(data.custom_islands)) {
        setCustomIslands(data.custom_islands);
      }
      setSyncMessage(
        `Hipocampo sincronizado: ${data.axioms_seeded} axiomas + ${
          (data.projects_indexed || []).length
        } repositorios indexados.`
      );
      fetchGraphSnapshot();
    } catch (e: any) {
      setSyncMessage(`Error sincronizando: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIslandFromUI = async () => {
    if (!newIslandName.trim() || loading) return;
    const name = newIslandName.trim();
    const desc =
      newIslandDesc.trim() ||
      `Isla especializada en ${name} con aislamiento del 100% de recuerdos`;
    setNewIslandName("");
    setNewIslandDesc("");
    setShowNewIslandForm(false);

    const commandText = `Bob, necesito que hagas una isla de ${name}: ${desc}. Confírmame que la isla está creada y activa.`;
    await sendQueryToBob(commandText, activeIsland);
  };

  const sendQueryToBob = async (
    userMsg: string,
    targetIsland: string,
    displayOverride?: string,
    detectedLang?: string
  ) => {
    const currentSessionId = activeSession.id;
    const attachmentsSnapshot = [...pendingAttachments];
    setPendingAttachments([]);

    let enrichedPrompt = userMsg;
    if (attachmentsSnapshot.length > 0) {
      const attBlock = attachmentsSnapshot
        .map((a) => a.summary)
        .join("\n\n");
      enrichedPrompt = `${userMsg}\n\n[ARCHIVOS E IMÁGENES ADJUNTADOS POR DANIEL EN ESTE MENSAJE]:\n${attBlock}`;
    }

    appendMessageToSession(currentSessionId, {
      role: "user",
      content: displayOverride ? `🎙️ ${displayOverride}` : userMsg,
      mode,
      attachments: attachmentsSnapshot.map((a) => ({
        filename: a.filename,
        isImage: a.isImage,
        previewDataUrl: a.previewDataUrl,
      })),
    });
    setLoading(true);

    try {
      let axisSnapshot = "";
      try {
        const repos = await invoke<any[]>("repos_get_list");
        axisSnapshot = `Repositorios locales de Daniel en Axis (${
          repos?.length || 0
        } proyectos): ${JSON.stringify(
          repos?.map((r: any) => ({
            proyecto: r.alias || r.name,
            stack: r.tag || r.stack,
            branch: r.branch,
            clean: r.is_clean,
            last_commit: r.last_commit,
            path: r.path,
          })) || []
        )}`;
      } catch {
        axisSnapshot = "Módulo Axis conectado.";
      }

      const payloadMessage = `[SESSION:${currentSessionId}][ISLAND:${targetIsland}] ${enrichedPrompt}`;
      const raw = await invoke<string>("ask_bob_agent", {
        message: payloadMessage,
        mode,
        axisContext: axisSnapshot,
      });
      const res = JSON.parse(raw);

      if (res.causal_edges_total !== undefined) {
        setCausalEdges(res.causal_edges_total);
      }
      if (Array.isArray(res.custom_islands)) {
        setCustomIslands(res.custom_islands);
      }

      const destinationIsland = res.active_custom_island || targetIsland;
      if (
        res.active_custom_island &&
        res.active_custom_island !== activeIsland
      ) {
        setActiveIsland(res.active_custom_island);
        setSyncMessage(
          `Isla de Vectores '${res.active_custom_island}' activada en el Hipocampo (100% aislamiento).`
        );
      }

      appendMessageToSession(
        currentSessionId,
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
        destinationIsland,
        res.workspace_path,
        res.workspace_files
      );

      if (bobVoiceEnabled && res.answer) {
        const voiceTarget =
          practiceLang !== "auto"
            ? practiceLang
            : detectedLang && detectedLang !== "es"
            ? detectedLang
            : bobVoiceId;
        speakBobText(res.answer, voiceTarget);
      }

      fetchGraphSnapshot();
    } catch (e: any) {
      appendMessageToSession(currentSessionId, {
        role: "bob",
        content: `[!] No se pudo contactar con el demonio de BOB en el puerto 8086: ${String(
          e
        )}`,
        island: "Offline",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || loading) return;
    const userMsg =
      input.trim() ||
      "Analiza los archivos/imágenes que acabo de adjuntar en el Workspace de esta conversación.";
    setInput("");
    await sendQueryToBob(userMsg, activeIsland);
  };

  const currentFilterLabel =
    graphIslandFilter === "ALL"
      ? "Todas las Islas (4D)"
      : graphData?.islands.find((i) => i.id === graphIslandFilter)?.name ||
        graphIslandFilter;

  const currentPracticeLangLabel =
    PRACTICE_LANG_OPTIONS.find((o) => o.id === practiceLang)?.label ||
    "🎙️ Auto Idioma";
  const currentBobVoiceLabel =
    BOB_VOICE_OPTIONS.find((o) => o.id === bobVoiceId)?.label ||
    "🔊 Voz: Jorge (Oráculo MX)";

  const filteredSessions = sessions.filter((s) => {
    const q = chatFilterQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) || s.island.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-zinc-950 text-zinc-100 p-5 gap-3 overflow-hidden select-none">
      {/* Cabecera Monocromática de Alto Contraste */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-700/80 rounded-xl p-3.5">
        <div className="flex items-center gap-3">
          {viewLayout !== "graph" && (
            <button
              onClick={() => setShowChatSidebar(!showChatSidebar)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white transition cursor-pointer"
              title={
                showChatSidebar
                  ? "Ocultar panel de chats"
                  : "Mostrar panel de chats"
              }
            >
              {showChatSidebar ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          )}

          <div
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              online
                ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                : waking
                ? "bg-zinc-400 animate-ping"
                : "bg-zinc-600"
            }`}
          />
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase flex items-center gap-2 text-white">
              <Brain className="w-4 h-4 text-zinc-100" />
              BOB ENGINE v2.0 — ORÁCULO CENTRAL & HIPOCAMPO 4D
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">
              {online ? modelName : "Demonio en puerto 8086 apagado"} |
              Vectores:{" "}
              <span className="text-white font-semibold">
                {graphData?.total_vectors || 0}
              </span>{" "}
              | Sinapsis:{" "}
              <span className="text-white font-semibold">
                {graphData?.total_synapses || causalEdges}
              </span>{" "}
              | Chats:{" "}
              <span className="text-white font-semibold">{sessions.length}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-zinc-950 border border-zinc-700 rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setViewLayout("chat")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition cursor-pointer ${
                viewLayout === "chat"
                  ? "bg-white text-zinc-950 font-bold"
                  : "text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Consola
            </button>
            <button
              onClick={() => {
                setViewLayout("split");
                fetchGraphSnapshot();
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition cursor-pointer ${
                viewLayout === "split"
                  ? "bg-white text-zinc-950 font-bold"
                  : "text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Dividido (UltraWide)
            </button>
            <button
              onClick={() => {
                setViewLayout("graph");
                fetchGraphSnapshot();
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition cursor-pointer ${
                viewLayout === "graph"
                  ? "bg-white text-zinc-950 font-bold"
                  : "text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Cerebro 4D
            </button>
          </div>

          {!online && (
            <button
              onClick={handleWakeBob}
              disabled={waking}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 text-xs font-bold transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {waking ? "Cargando GPU..." : "Despertar a BOB"}
            </button>
          )}
          <button
            onClick={handleLaunchBrowserBridge}
            disabled={!online}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-40 text-xs font-semibold border border-zinc-600 transition cursor-pointer"
            title="Abre tu navegador conectado al puerto 9222 para consultar a Gemini o resolver Quizes"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Navegador Puente (Gemini/Quizes)
          </button>
          <button
            onClick={handleSyncEcosystem}
            disabled={!online || loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-40 text-xs font-semibold border border-zinc-600 transition cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Sincronizar ~/proyectos
          </button>
        </div>
      </div>

      {/* Barra de Islas del Hipocampo */}
      <div className="flex flex-col gap-2 bg-zinc-900/70 border border-zinc-700/80 rounded-xl p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5 mr-1">
              <Layers className="w-3.5 h-3.5 text-white" />
              Islas del Hipocampo:
            </span>

            <button
              onClick={() => {
                setActiveIsland("global");
                setGraphIslandFilter("ALL");
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === activeSession.id ? { ...s, island: "global" } : s
                  )
                );
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition cursor-pointer ${
                activeIsland === "global"
                  ? "bg-white text-zinc-950 border-white font-bold shadow-sm"
                  : "bg-zinc-800 border-zinc-600 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-400"
              }`}
            >
              Hipocampo Global (4 Islas Base)
            </button>

            {customIslands.map((isl) => {
              const isSelected = activeIsland === isl.slug;
              return (
                <button
                  key={isl.slug}
                  onClick={() => {
                    setActiveIsland(isl.slug);
                    setGraphIslandFilter(`custom:${isl.slug}`);
                    setSessions((prev) =>
                      prev.map((s) =>
                        s.id === activeSession.id
                          ? { ...s, island: isl.slug }
                          : s
                      )
                    );
                  }}
                  title={isl.description}
                  className={`px-3 py-1 rounded-lg text-xs font-mono border transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-white text-zinc-950 border-white font-bold shadow-sm"
                      : "bg-zinc-800 border-zinc-600 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  <Database className="w-3 h-3" />
                  {isl.name}
                  <span
                    className={
                      isSelected ? "text-zinc-700 font-bold" : "text-zinc-300"
                    }
                  >
                    ({isl.node_count})
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowNewIslandForm(!showNewIslandForm)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 border border-white text-xs font-mono font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Isla Vectorial
          </button>
        </div>

        {showNewIslandForm && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-700">
            <input
              type="text"
              value={newIslandName}
              onChange={(e) => setNewIslandName(e.target.value)}
              placeholder="Nombre de la Isla (ej. Ventas, Seguros CNSF, AURORA)..."
              className="bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-white w-64"
            />
            <input
              type="text"
              value={newIslandDesc}
              onChange={(e) => setNewIslandDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateIslandFromUI()}
              placeholder="Dominio 100% aislado (ej. Clientes, precios, regulaciones, pólizas)..."
              className="flex-1 bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-white"
            />
            <button
              onClick={handleCreateIslandFromUI}
              className="px-3.5 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition cursor-pointer"
            >
              Crear Isla en Hipocampo
            </button>
          </div>
        )}
      </div>

      {syncMessage && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 font-mono text-[11px]">
          {syncMessage}
        </div>
      )}

      {/* Cuerpo Principal */}
      <div className="flex-1 flex gap-3.5 overflow-hidden min-h-0">
        {/* PANEL LATERAL DE CHATS */}
        {viewLayout !== "graph" && showChatSidebar && (
          <div className="w-64 shrink-0 flex flex-col bg-zinc-900/75 border border-zinc-700/80 rounded-xl p-3 gap-2.5 h-full overflow-hidden">
            <button
              onClick={() => handleCreateNewChat(activeIsland)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-mono font-bold transition cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Nuevo Chat + Carpeta
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={chatFilterQuery}
                onChange={(e) => setChatFilterQuery(e.target.value)}
                placeholder="Filtrar conversaciones..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 font-mono"
              />
            </div>

            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-1 pt-1">
              Sesiones & Workspaces ({filteredSessions.length})
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredSessions.map((sess) => {
                const isCurrent = sess.id === activeSession.id;
                const isEditing = editingSessionId === sess.id;

                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectChat(sess)}
                    className={`group flex flex-col gap-1 p-2.5 rounded-lg border transition cursor-pointer ${
                      isCurrent
                        ? "bg-zinc-100 text-zinc-950 border-white font-semibold"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleConfirmRename(sess.id)
                            }
                            autoFocus
                            className="w-full bg-zinc-900 text-white border border-zinc-500 rounded px-1.5 py-0.5 text-xs font-sans focus:outline-none"
                          />
                          <button
                            onClick={(e) => handleConfirmRename(sess.id, e)}
                            className="p-1 rounded bg-white text-zinc-950"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs truncate flex-1 font-sans">
                          {sess.title}
                        </span>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-75 group-hover:opacity-100">
                          <button
                            onClick={(e) => handleStartRename(sess, e)}
                            className={`p-1 rounded hover:bg-zinc-700/50 ${
                              isCurrent
                                ? "text-zinc-800 hover:text-black"
                                : "text-zinc-400 hover:text-white"
                            }`}
                            title="Renombrar chat"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteChat(sess.id, e)}
                            className={`p-1 rounded hover:bg-zinc-700/50 ${
                              isCurrent
                                ? "text-zinc-800 hover:text-black"
                                : "text-zinc-400 hover:text-white"
                            }`}
                            title="Eliminar chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span
                        className={`px-1.5 py-0.2 rounded border ${
                          isCurrent
                            ? "bg-zinc-950 text-white border-zinc-800"
                            : "bg-zinc-900 text-zinc-300 border-zinc-700"
                        }`}
                      >
                        {sess.island.toUpperCase()}
                      </span>
                      <span
                        className={
                          isCurrent ? "text-zinc-700" : "text-zinc-400"
                        }
                      >
                        {(sess.workspaceFiles || []).length} files ·{" "}
                        {sess.messages.length} msgs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COLUMNA CENTRAL: CONSOLA COGNITIVA DEL CHAT ACTIVO */}
        {(viewLayout === "chat" || viewLayout === "split") && (
          <div className="flex-1 flex flex-col gap-2.5 h-full overflow-hidden min-w-0">
            {/* Barra de Modos + Insignia de Carpeta de Proyecto Activa */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "normal", label: "Córtex + ReAct PC", icon: Terminal },
                  {
                    id: "deep-think",
                    label: "/deep-think (ABE)",
                    icon: GitBranch,
                  },
                  { id: "rem", label: "/rem (Sueño)", icon: Sparkles },
                  { id: "web", label: "/web", icon: Globe },
                  { id: "quiron", label: "/quiron", icon: ShieldAlert },
                  {
                    id: "marathon",
                    label: "Autopiloto Maratón",
                    icon: Zap,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setMode(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono border transition cursor-pointer ${
                        active
                          ? "bg-white text-zinc-950 border-white font-bold"
                          : "bg-zinc-800 border-zinc-600 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Botón de Carpeta de Proyecto del Chat Activo */}
              <button
                onClick={() =>
                  setShowWorkspaceFilesModal(!showWorkspaceFilesModal)
                }
                className="flex items-center gap-1.5 text-xs font-mono text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-500 px-3 py-1 rounded-lg cursor-pointer transition"
                title={`Carpeta dedicada en Hipocampo: ${
                  activeSession?.workspacePath || ""
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5 text-white" />
                <span>
                  Workspace ({(activeSession?.workspaceFiles || []).length}{" "}
                  archivos)
                </span>
              </button>
            </div>

            {/* Desplegable de Archivos en el Workspace de esta Conversación */}
            {showWorkspaceFilesModal && (
              <div className="bg-zinc-900 border border-zinc-600 rounded-xl p-3 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4" />
                    Carpeta Persistente del Chat:{" "}
                    <span className="text-zinc-300 font-normal">
                      {activeSession?.workspacePath}
                    </span>
                  </span>
                  <button
                    onClick={() => setShowWorkspaceFilesModal(false)}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(activeSession?.workspaceFiles || []).map((f, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        setInput(
                          `Lee el archivo "${activeSession?.workspacePath}/${f}" de nuestro Workspace y continúa trabajando sobre él.`
                        )
                      }
                      className="px-2.5 py-1 rounded bg-zinc-950 hover:bg-white hover:text-zinc-950 text-zinc-200 border border-zinc-700 text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                      title="Haz clic para pedirle a BOB que relea este archivo"
                    >
                      <FileCode className="w-3 h-3" />
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mensajes del Chat Activo */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 select-text">
              {currentMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border ${
                    m.role === "user"
                      ? "bg-zinc-900/50 border-zinc-700 ml-8"
                      : "bg-zinc-900/90 border-zinc-700/90 mr-2"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-zinc-400">
                    <span className="font-bold text-white tracking-wide">
                      {m.role === "user"
                        ? `DANIEL [${activeIsland.toUpperCase()} | ${
                            m.mode || "normal"
                          }]`
                        : "BOB (ORÁCULO LOCAL)"}
                    </span>

                    {m.role === "bob" && (
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-zinc-300">
                        <button
                          onClick={() => speakBobText(m.content)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-white hover:text-zinc-950 text-white border border-zinc-600 transition cursor-pointer"
                          title="Escuchar esta respuesta con la voz de BOB"
                        >
                          <Volume2 className="w-3 h-3" />
                          Escuchar
                        </button>
                        {m.island && (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-white border border-zinc-600 font-semibold">
                            {m.island}
                            {m.similarity !== undefined
                              ? ` (${m.similarity.toFixed(2)})`
                              : ""}
                          </span>
                        )}
                        {m.thalamus_us !== undefined && (
                          <span>Tálamo: {m.thalamus_us.toFixed(1)}µs</span>
                        )}
                        {m.hippocampus_us !== undefined && (
                          <span>HNSW: {m.hippocampus_us.toFixed(1)}µs</span>
                        )}
                        {m.total_ms !== undefined && (
                          <span>{(m.total_ms / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Miniaturas de Archivos e Imágenes Adjuntadas en el Mensaje */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2.5">
                      {m.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs font-mono text-zinc-200"
                        >
                          {att.isImage && att.previewDataUrl ? (
                            <img
                              src={att.previewDataUrl}
                              alt={att.filename}
                              className="w-12 h-12 object-cover rounded border border-zinc-700"
                            />
                          ) : (
                            <FileCode className="w-4 h-4 text-white" />
                          )}
                          <span>{att.filename}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.tools_used && m.tools_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {m.tools_used.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-100 text-[10px] font-mono"
                        >
                          Tool: {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {m.thinking && (
                    <div className="mb-2">
                      <button
                        onClick={() =>
                          setOpenThinkIdx(openThinkIdx === idx ? null : idx)
                        }
                        className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white font-mono cursor-pointer"
                      >
                        {openThinkIdx === idx ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        Inspeccionar Buffer &lt;think&gt;
                      </button>
                      {openThinkIdx === idx && (
                        <pre className="mt-1.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
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

            {/* Panel en Vivo del Modo Maratón */}
            {(mode === "marathon" || marathonStatus?.running) && (
              <div className="bg-zinc-900/95 border border-zinc-500 rounded-xl p-3 space-y-2 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        marathonStatus?.running
                          ? "bg-white animate-ping"
                          : "bg-zinc-500"
                      }`}
                    />
                    <span className="font-bold text-white uppercase">
                      Autopiloto Maratón{" "}
                      {marathonStatus?.running
                        ? `(Ciclo ${marathonStatus.current_cycle}/${marathonStatus.max_cycles})`
                        : "(Listo)"}
                    </span>
                    <span className="text-zinc-400">
                      | Axiomas KV Salvados:{" "}
                      <strong className="text-white">
                        {marathonStatus?.axioms_crystallized || 0}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Máx Ciclos:</span>
                    <input
                      type="number"
                      value={maxMarathonCycles}
                      onChange={(e) =>
                        setMaxMarathonCycles(Number(e.target.value) || 30)
                      }
                      className="w-16 bg-zinc-950 border border-zinc-600 rounded px-2 py-0.5 text-white text-center"
                    />
                    {marathonStatus?.running ? (
                      <button
                        onClick={handleStopMarathon}
                        className="px-3 py-1 rounded bg-white text-zinc-950 font-bold hover:bg-zinc-200 cursor-pointer"
                      >
                        Detener Maratón
                      </button>
                    ) : (
                      <button
                        onClick={handleStartMarathon}
                        className="px-3 py-1 rounded bg-white text-zinc-950 font-bold hover:bg-zinc-200 cursor-pointer"
                      >
                        Iniciar Maratón con Orden Inferior
                      </button>
                    )}
                  </div>
                </div>
                {marathonStatus?.logs && marathonStatus.logs.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg p-2 space-y-1 text-[11px]">
                    {marathonStatus.logs.slice(-6).map((lg: any, i: number) => (
                      <div key={i} className="text-zinc-300">
                        <span className="text-white font-bold">
                          [Ciclo {lg.cycle}]
                        </span>{" "}
                        {lg.kv_purged && (
                          <span className="px-1.5 py-0.2 bg-zinc-800 text-white rounded mr-1">
                            KV Purged + Axioma
                          </span>
                        )}
                        {lg.action_summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Previsualización de Archivos e Imágenes Adjuntos antes de Enviar */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-zinc-900/90 border border-zinc-600 rounded-xl p-2">
                {pendingAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-zinc-950 border border-zinc-500 rounded-lg px-2.5 py-1 text-xs font-mono text-white"
                  >
                    {att.isImage && att.previewDataUrl ? (
                      <img
                        src={att.previewDataUrl}
                        alt={att.filename}
                        className="w-7 h-7 object-cover rounded border border-zinc-600"
                      />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-white" />
                    )}
                    <span className="max-w-[160px] truncate">
                      {att.filename}
                    </span>
                    <button
                      onClick={() =>
                        setPendingAttachments((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Barra de Entrada 100% Monocromática con Alto Contraste (CERO etiquetas <select>) */}
            <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl p-2 relative">
              {/* Input oculto para subir Archivos e Imágenes */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.rs,.py,.ts,.tsx,.js,.json,.toml,.md,.txt,.csv,.html,.css,.sh,.sql,.yaml,.yml"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Botón Adjuntar Imagen o Archivo (Selector Nativo Arch Linux) */}
              <button
                onClick={handleNativePickFiles}
                disabled={!online || uploadingFile}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-500 transition cursor-pointer flex items-center justify-center"
                title="Abrir selector de archivos e imágenes de Arch Linux"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Botón Pegar Captura/Imagen del Portapapeles (o presiona Ctrl+V en el texto) */}
              <button
                onClick={handleWaylandClipboardPaste}
                disabled={!online || uploadingFile}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-500 transition cursor-pointer flex items-center justify-center"
                title="Pegar imagen o captura directamente del portapapeles (Ctrl+V)"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Botón Micrófono Whisper */}
              <button
                onClick={handleToggleVoice}
                disabled={!online || transcribingVoice}
                className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                  isRecordingVoice
                    ? "bg-white text-zinc-950 border-white animate-pulse font-bold"
                    : "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-500"
                }`}
                title={
                  isRecordingVoice
                    ? "Detener y enviar a BOB"
                    : "Hablar con BOB en tiempo real (Whisper CPU)"
                }
              >
                {isRecordingVoice ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.ctrlKey && (e.key === "v" || e.key === "V")) {
                    // Si el portapapeles tiene una imagen en Wayland, pegarla automáticamente
                    setTimeout(() => {
                      if (!input.trim()) {
                        handleWaylandClipboardPaste();
                      }
                    }, 80);
                  }
                  if (e.key === "Enter") handleSend();
                }}
                placeholder={
                  activeIsland !== "global"
                    ? `Mensaje o archivo en "${activeSession?.title}" [Isla: ${activeIsland.toUpperCase()}]...`
                    : `Mensaje, código o imagen en "${activeSession?.title}"...`
                }
                className="flex-1 min-w-[160px] bg-transparent px-2.5 py-1.5 text-sm text-white placeholder-zinc-400 focus:outline-none"
              />

              {/* Dropdown Personalizado de Idioma (Alto Contraste Oscuro — Evita el blanco de GTK) */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLangMenu(!showLangMenu);
                    setShowVoiceMenu(false);
                  }}
                  className="flex items-center justify-between gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-500 text-white rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-semibold cursor-pointer"
                  title="Idioma de escucha y evaluación de pronunciación"
                >
                  <span>{currentPracticeLangLabel}</span>
                  <ChevronUp className="w-3 h-3 text-zinc-200" />
                </button>

                {showLangMenu && (
                  <div className="absolute bottom-full mb-1.5 right-0 w-48 bg-zinc-900 border border-zinc-500 rounded-xl shadow-2xl py-1 z-50 font-mono text-xs">
                    {PRACTICE_LANG_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setPracticeLang(opt.id);
                          setShowLangMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                          practiceLang === opt.id
                            ? "bg-white text-zinc-950 font-bold"
                            : "text-zinc-100 hover:bg-zinc-800"
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown Personalizado de Voz de BOB (Alto Contraste Oscuro — Evita el blanco de GTK) */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowVoiceMenu(!showVoiceMenu);
                    setShowLangMenu(false);
                  }}
                  className="flex items-center justify-between gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-500 text-white rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-semibold cursor-pointer"
                  title="Voz neuronal asignada a BOB"
                >
                  <span>{currentBobVoiceLabel}</span>
                  <ChevronUp className="w-3 h-3 text-zinc-200" />
                </button>

                {showVoiceMenu && (
                  <div className="absolute bottom-full mb-1.5 right-0 w-56 bg-zinc-900 border border-zinc-500 rounded-xl shadow-2xl py-1 z-50 font-mono text-xs">
                    {BOB_VOICE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setBobVoiceId(opt.id);
                          setShowVoiceMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                          bobVoiceId === opt.id
                            ? "bg-white text-zinc-950 font-bold"
                            : "text-zinc-100 hover:bg-zinc-800"
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón Activar/Silenciar Respuesta Hablada Automática de BOB */}
              <button
                onClick={() => setBobVoiceEnabled(!bobVoiceEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition cursor-pointer ${
                  bobVoiceEnabled
                    ? "bg-white text-zinc-950 border-white font-bold"
                    : "bg-zinc-800 text-zinc-300 border-zinc-600"
                }`}
                title="Activar o desactivar que BOB hable automáticamente al responder"
              >
                {bobVoiceEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                {bobVoiceEnabled ? "Voz ON" : "Mudo"}
              </button>

              <button
                onClick={handleSend}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        )}

        {/* COLUMNA DERECHA: VISOR TOPOLÓGICO DEL CEREBRO DE BOB */}
        {(viewLayout === "split" || viewLayout === "graph") && (
          <div
            className={`${
              viewLayout === "split" ? "w-[44%] shrink-0" : "w-full"
            } flex flex-col bg-zinc-950 border border-zinc-700/90 rounded-xl overflow-hidden relative h-full`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-900/95 border-b border-zinc-700/90 z-30">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-300 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={graphSearch}
                    onChange={(e) => setGraphSearch(e.target.value)}
                    placeholder="Buscar vector o concepto..."
                    className="bg-zinc-950 border border-zinc-600 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-white w-44 font-mono"
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowIslandDropdown(!showIslandDropdown)}
                    className="flex items-center justify-between gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-500 text-white rounded-lg px-3 py-1 text-xs font-mono font-semibold cursor-pointer min-w-44"
                  >
                    <span className="truncate">{currentFilterLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                  </button>

                  {showIslandDropdown && (
                    <div className="absolute left-0 mt-1.5 w-64 bg-zinc-900 border border-zinc-500 rounded-xl shadow-2xl py-1 z-50 font-mono text-xs">
                      <button
                        onClick={() => {
                          setGraphIslandFilter("ALL");
                          setShowIslandDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer ${
                          graphIslandFilter === "ALL"
                            ? "bg-white text-zinc-950 font-bold"
                            : "text-zinc-100 hover:bg-zinc-800"
                        }`}
                      >
                        <span>Todas las Islas (4D)</span>
                        <span className="text-[10px] opacity-80">
                          {graphData?.total_vectors || 0} nodos
                        </span>
                      </button>

                      {graphData?.islands.map((isl) => (
                        <button
                          key={isl.id}
                          onClick={() => {
                            setGraphIslandFilter(isl.id);
                            setShowIslandDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer ${
                            graphIslandFilter === isl.id
                              ? "bg-white text-zinc-950 font-bold"
                              : "text-zinc-100 hover:bg-zinc-800"
                          }`}
                        >
                          <span>{isl.name}</span>
                          <span className="text-[10px] opacity-80">
                            {isl.node_count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <button
                  onClick={() =>
                    setEdgeFilter((p) => ({ ...p, causal: !p.causal }))
                  }
                  className={`px-2 py-1 rounded-md border cursor-pointer transition ${
                    edgeFilter.causal
                      ? "bg-white text-zinc-950 border-white font-bold"
                      : "bg-zinc-800 text-zinc-200 border-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  Causal
                </button>
                <button
                  onClick={() =>
                    setEdgeFilter((p) => ({ ...p, semantic: !p.semantic }))
                  }
                  className={`px-2 py-1 rounded-md border cursor-pointer transition ${
                    edgeFilter.semantic
                      ? "bg-white text-zinc-950 border-white font-bold"
                      : "bg-zinc-800 text-zinc-200 border-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  K-NN
                </button>
                <button
                  onClick={() => {
                    cameraRef.current.zoom = Math.min(
                      3.5,
                      cameraRef.current.zoom * 1.22
                    );
                  }}
                  className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    cameraRef.current.zoom = Math.max(
                      0.32,
                      cameraRef.current.zoom * 0.8
                    );
                  }}
                  className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    cameraRef.current = { x: 0, y: 0, zoom: 0.72 };
                  }}
                  className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white cursor-pointer"
                  title="Centrar Galaxia"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleCanvasWheel}
                className="w-full h-full cursor-grab active:cursor-grabbing block"
              />

              <div className="absolute bottom-3 left-3 bg-zinc-900/95 border border-zinc-600 rounded-lg px-3 py-2 text-[10px] font-mono text-zinc-200 flex flex-wrap items-center gap-3 pointer-events-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-white inline-block" />
                  Isla / Axioma (λ=0)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 inline-block" />
                  Vector 768-dim
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-white inline-block" />
                  Arista Causal + Pulso
                </span>
              </div>

              {selectedSimNode && (
                <div className="absolute top-3 right-3 bottom-3 w-80 bg-zinc-900/95 border border-zinc-600 rounded-xl p-4 flex flex-col gap-3 shadow-2xl overflow-y-auto select-text z-20">
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-700 pb-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-white border border-zinc-600 font-semibold">
                        {selectedSimNode.kind === "island"
                          ? "Núcleo de Isla Cortical"
                          : `Isla: ${selectedSimNode.islandId}`}
                      </span>
                      <h3 className="text-xs font-bold text-white font-mono mt-1.5 break-words">
                        {selectedSimNode.label}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedSimNode(null)}
                      className="text-zinc-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedSimNode.kind === "island" &&
                    selectedSimNode.islandRaw && (
                      <div className="space-y-2.5 text-xs font-mono">
                        <p className="text-zinc-200 font-sans leading-relaxed">
                          {selectedSimNode.islandRaw.description}
                        </p>
                        <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">
                              Nodos Confinados:
                            </span>
                            <span className="text-white font-bold">
                              {selectedSimNode.islandRaw.node_count}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Aislamiento:</span>
                            <span className="text-zinc-100">
                              {selectedSimNode.islandRaw.is_custom
                                ? "100% Dominio Cerrado"
                                : "HNSW + Plano 2"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const slug =
                              selectedSimNode.islandRaw!.id.replace(
                                "custom:",
                                ""
                              );
                            if (selectedSimNode.islandRaw!.is_custom) {
                              handleCreateNewChat(slug);
                              setActiveIsland(slug);
                            }
                            setGraphIslandFilter(selectedSimNode.islandRaw!.id);
                          }}
                          className="w-full py-1.5 rounded-lg bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition cursor-pointer"
                        >
                          Abrir Nuevo Chat en esta Isla
                        </button>
                      </div>
                    )}

                  {selectedSimNode.kind === "memory" && selectedSimNode.raw && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-zinc-950 border border-zinc-700 rounded-lg p-2.5">
                        <div>
                          <div className="text-zinc-400">Nodo ID</div>
                          <div className="text-white font-bold">
                            #{selectedSimNode.raw.raw_id}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-400">Validaciones LTP</div>
                          <div className="text-white font-bold">
                            {selectedSimNode.raw.validations}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-zinc-400">
                            Tasa de Decaimiento (λ)
                          </div>
                          <div className="text-white font-bold">
                            {selectedSimNode.raw.lambda.toFixed(6)}{" "}
                            {selectedSimNode.raw.lambda === 0
                              ? "(Axioma Inmortal)"
                              : ""}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono uppercase text-zinc-300 font-semibold mb-1">
                          Huella Tensorial 768-dim (L2 Aligned 64B):
                        </div>
                        <div className="flex items-end gap-[2px] h-10 bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 overflow-hidden">
                          {selectedSimNode.raw.vector_preview.map(
                            (val, idx) => {
                              const mag = Math.min(
                                100,
                                Math.max(12, Math.abs(val) * 950)
                              );
                              return (
                                <div
                                  key={idx}
                                  style={{ height: `${mag}%` }}
                                  className={`flex-1 rounded-xs ${
                                    val >= 0 ? "bg-white" : "bg-zinc-500"
                                  }`}
                                  title={`dim[${idx}] = ${val.toFixed(5)}`}
                                />
                              );
                            }
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono uppercase text-zinc-300 font-semibold mb-1">
                          Contenido Cristalizado en Hipocampo:
                        </div>
                        <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 whitespace-pre-wrap font-sans leading-relaxed max-h-56 overflow-y-auto text-xs">
                          {selectedSimNode.raw.content}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setInput(
                            `Analiza y profundiza sobre el recuerdo del Nodo #${selectedSimNode.raw!.raw_id}: "${selectedSimNode.raw!.label}"`
                          );
                        }}
                        className="w-full py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-mono font-bold text-[11px] transition cursor-pointer"
                      >
                        Inyectar Nodo en el Chat Activo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
