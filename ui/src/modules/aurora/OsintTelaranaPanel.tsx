import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ExternalLink,
  MapPin,
  Network,
  Play,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { formatearMxn, formatearVertical } from './api';
import type {
  HuntRequestPayload,
  HuntResponse,
  NodoTelaranaDto,
  SubgrafoProspecto,
  SubverticalInmobiliaria,
  SubverticalSeguros,
  TelaranaResponse,
  VerticalComercial,
} from './types';

interface OsintTelaranaPanelProps {
  daemonOnline: boolean;
  telarana: TelaranaResponse | null;
  subgrafo: SubgrafoProspecto | null;
  loadingSubgrafo: boolean;
  launchingHunt: boolean;
  purgingId: string | null;
  lastHunt: HuntResponse | null;
  onLaunchHunt: (payload: HuntRequestPayload) => Promise<void>;
  onSelectProspecto: (prospectoId: string) => void;
  onTriggerOptOut: (prospectoId: string, motivo: string) => Promise<void>;
}

const SUBVERTICALES_INMOBILIARIA: Array<{ value: SubverticalInmobiliaria; label: string }> = [
  { value: 'Preventa', label: 'Preventa' },
  { value: 'Residencial', label: 'Residencial' },
  { value: 'ComercialIndustrial', label: 'Comercial / Industrial' },
];

const SUBVERTICALES_SEGUROS: Array<{ value: SubverticalSeguros; label: string }> = [
  { value: 'Vida', label: 'Vida' },
  { value: 'Gmm', label: 'Gastos Médicos Mayores' },
  { value: 'HombreClave', label: 'Hombre Clave' },
  { value: 'Educativo', label: 'Educativo' },
  { value: 'Patrimonial', label: 'Patrimonial' },
];

const SECTORES_OPCIONES: Array<{ value: 'Inmobiliaria' | 'Seguros'; label: string }> = [
  { value: 'Inmobiliaria', label: 'Inmobiliaria' },
  { value: 'Seguros', label: 'Seguros' },
];

interface GeoPreset {
  etiqueta: string;
  ciudad: string;
  estado: string;
  zona: string;
}

const PRESETS_GEOGRAFICOS: GeoPreset[] = [
  {
    etiqueta: 'Veracruz / Boca del Río',
    ciudad: 'Boca del Río',
    estado: 'Veracruz',
    zona: 'Corredor Logístico Portuario / Costa de Oro',
  },
  {
    etiqueta: 'Monterrey / San Pedro',
    ciudad: 'Monterrey',
    estado: 'Nuevo León',
    zona: 'San Pedro Garza García / Valle Oriente',
  },
  {
    etiqueta: 'CDMX / Santa Fe',
    ciudad: 'Ciudad de México',
    estado: 'CDMX',
    zona: 'Santa Fe / Polanco',
  },
  {
    etiqueta: 'Guadalajara / Puerta de Hierro',
    ciudad: 'Zapopan',
    estado: 'Jalisco',
    zona: 'Puerta de Hierro / El Salto',
  },
];

interface DarkSelectProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

function DarkSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: DarkSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const currentLabel =
    options.find((opt) => opt.value === value)?.label ?? value;

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
        {label}
      </label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors text-left"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl py-1 max-h-56 overflow-y-auto"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-left transition-colors ${
                    selected
                      ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                      : 'text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const OsintTelaranaPanel: React.FC<OsintTelaranaPanelProps> = ({
  daemonOnline,
  telarana,
  subgrafo,
  loadingSubgrafo,
  launchingHunt,
  purgingId,
  lastHunt,
  onLaunchHunt,
  onSelectProspecto,
  onTriggerOptOut,
}) => {
  const [sector, setSector] = useState<'Inmobiliaria' | 'Seguros'>('Inmobiliaria');
  const [subInmob, setSubInmob] = useState<SubverticalInmobiliaria>('ComercialIndustrial');
  const [subSeg, setSubSeg] = useState<SubverticalSeguros>('HombreClave');
  const [ciudad, setCiudad] = useState('Monterrey');
  const [estado, setEstado] = useState('Nuevo León');
  const [zona, setZona] = useState('San Pedro Garza García');
  const [palabrasClave, setPalabrasClave] = useState(
    'nave industrial, expansión logística, nuevo parque',
  );
  const [fuenteUrl, setFuenteUrl] = useState('');
  const [selectedIsla, setSelectedIsla] = useState<string>('ALL');
  const [busqueda, setBusqueda] = useState('');
  const [optOutMotivo, setOptOutMotivo] = useState('');
  const [confirmingOptOutId, setConfirmingOptOutId] = useState<string | null>(null);

  const vertical: VerticalComercial =
    sector === 'Inmobiliaria'
      ? { Inmobiliaria: subInmob }
      : { Seguros: subSeg };

  const nodosFiltrados = useMemo(() => {
    const lista = telarana?.nodos ?? [];
    const term = busqueda.trim().toLowerCase();
    return lista.filter((n) => {
      if (selectedIsla !== 'ALL' && n.isla !== selectedIsla) return false;
      if (!term) return true;
      return (
        n.nombre_normalizado.toLowerCase().includes(term) ||
        n.ciudad.toLowerCase().includes(term) ||
        n.estado.toLowerCase().includes(term) ||
        n.gatillos.some((g) => g.descripcion.toLowerCase().includes(term))
      );
    });
  }, [telarana, selectedIsla, busqueda]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keywords = palabrasClave
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await onLaunchHunt({
      vertical,
      ciudad: ciudad.trim() || 'Monterrey',
      estado: estado.trim() || 'Nuevo León',
      zona: zona.trim() || null,
      palabras_clave: keywords.length > 0 ? keywords : ['expansión', 'patrimonio'],
      limite_resultados: 12,
      requiere_js: false,
      fuente_url: fuenteUrl.trim() || null,
      fuente_formato: fuenteUrl.trim() ? 'Html' : null,
    });
  };

  const handleConfirmOptOut = async (nodo: NodoTelaranaDto) => {
    const motivo =
      optOutMotivo.trim() ||
      `Solicitud ARCO de oposición ejecutada desde Telaraña 4D (${nodo.nombre_normalizado})`;
    await onTriggerOptOut(nodo.prospecto_id, motivo);
    setConfirmingOptOutId(null);
    setOptOutMotivo('');
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Cacería OSINT en CPU/RAM & Ingesta 4D
            </h2>
            <p className="text-xs text-zinc-400">
              Extrae señales públicas con trazabilidad LFPDPPP obligatoria y perfila automáticamente en Córtex BOB.
            </p>
          </div>
          {lastHunt && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg">
              <span>Última campaña: {lastHunt.campana_id.slice(0, 8)}</span>
              <span>· {lastHunt.prospectos_ingestados} prospectos</span>
              <span>· {lastHunt.relaciones_creadas} aristas</span>
              <span>· {lastHunt.planes_encolados.length} a Gatekeeper</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 mr-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            Plazas rápidas:
          </span>
          {PRESETS_GEOGRAFICOS.map((preset) => {
            const active =
              ciudad.trim().toLowerCase() === preset.ciudad.toLowerCase() &&
              estado.trim().toLowerCase() === preset.estado.toLowerCase();
            return (
              <button
                key={preset.etiqueta}
                type="button"
                onClick={() => {
                  setCiudad(preset.ciudad);
                  setEstado(preset.estado);
                  setZona(preset.zona);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {preset.etiqueta}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <DarkSelect
            label="Sector"
            value={sector}
            options={SECTORES_OPCIONES}
            onChange={(val) => setSector(val)}
          />

          {sector === 'Inmobiliaria' ? (
            <DarkSelect
              label="Subvertical"
              value={subInmob}
              options={SUBVERTICALES_INMOBILIARIA}
              onChange={(val) => setSubInmob(val)}
            />
          ) : (
            <DarkSelect
              label="Subvertical"
              value={subSeg}
              options={SUBVERTICALES_SEGUROS}
              onChange={(val) => setSubSeg(val)}
            />
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              placeholder="Monterrey"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Estado
            </label>
            <input
              type="text"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              placeholder="Nuevo León"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Zona / Corredor
            </label>
            <input
              type="text"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              placeholder="Polanco / Valle Oriente"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!daemonOnline || launchingHunt}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs py-2 px-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5" />
              {launchingHunt ? 'Cazando OSINT...' : 'Lanzar Cacería'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Palabras clave (separadas por coma)
            </label>
            <input
              type="text"
              value={palabrasClave}
              onChange={(e) => setPalabrasClave(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              URL pública objetivo opcional (si se omite usa señales abiertas / radar OSINT local)
            </label>
            <input
              type="url"
              value={fuenteUrl}
              onChange={(e) => setFuenteUrl(e.target.value)}
              placeholder="https://directorio-publico.mx/expansion"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
            />
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Nodos en Telaraña 4D ({nodosFiltrados.length})
              </h3>
              {telarana && (
                <span className="text-[11px] text-zinc-500 font-mono">
                  λ={telarana.lambda_por_dia.toFixed(4)}/día
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar prospecto o gatillo..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {telarana && telarana.resumen_islas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedIsla('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                  selectedIsla === 'ALL'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                Todas ({telarana.total_nodos})
              </button>
              {telarana.resumen_islas.map((isla) => (
                <button
                  key={isla.isla}
                  onClick={() => setSelectedIsla(isla.isla)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                    selectedIsla === isla.isla
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {isla.isla} ({isla.cantidad})
                </button>
              ))}
            </div>
          )}

          {nodosFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              {daemonOnline
                ? 'Aún no hay prospectos en la Telaraña 4D. Lanza una cacería OSINT arriba para poblar el hipergrafo.'
                : 'Conecta aurora-daemon para visualizar prospectos y gatillos temporales 4D.'}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {nodosFiltrados.map((nodo) => {
                const seleccionado = subgrafo?.prospecto.id === nodo.prospecto_id;
                return (
                  <div
                    key={nodo.prospecto_id}
                    onClick={() => onSelectProspecto(nodo.prospecto_id)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${
                      seleccionado
                        ? 'bg-zinc-900 border-emerald-500/50'
                        : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-zinc-100">
                            {nodo.nombre_normalizado}
                          </h4>
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium">
                            {nodo.perfil_psicologico}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px]">
                            {nodo.isla}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          {nodo.ciudad}, {nodo.estado}
                          {nodo.zona ? ` · ${nodo.zona}` : ''} · Ingreso est.:{' '}
                          <span className="text-zinc-200 font-mono">
                            {formatearMxn(nodo.ingreso_anual_mxn)}
                          </span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                          4D {(nodo.relevancia_temporal_4d * 100).toFixed(0)}%
                        </span>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">
                          node #{nodo.node_id}
                        </p>
                      </div>
                    </div>

                    {nodo.gatillos.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {nodo.gatillos.slice(0, 3).map((g, idx) => (
                          <span
                            key={`${nodo.prospecto_id}-g-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300"
                          >
                            <span className="text-emerald-400 font-mono">
                              w={g.peso_vigente_4d.toFixed(2)}
                            </span>
                            <span>{g.tipo}:</span>
                            <span className="text-zinc-400 truncate max-w-[220px]">
                              {g.descripcion}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Inspector Subgrafo · Círculo Cercano
              </h3>
            </div>
            {loadingSubgrafo && (
              <span className="text-[11px] text-zinc-400">Calculando saltos...</span>
            )}
          </div>

          {!subgrafo ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              Selecciona un prospecto de la Telaraña 4D para inspeccionar su score híbrido,
              vecinos topológicos (1–2 saltos) y cumplimiento LFPDPPP.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">
                      {subgrafo.prospecto.nombre_normalizado}
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {subgrafo.prospecto.id}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-mono">
                    score {subgrafo.score_compuesto.toFixed(3)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="rounded-lg bg-zinc-900 px-2.5 py-1.5">
                    <span className="text-zinc-500 block">Similitud</span>
                    <span className="text-zinc-200 font-mono">
                      {subgrafo.similitud_vectorial.toFixed(3)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-zinc-900 px-2.5 py-1.5">
                    <span className="text-zinc-500 block">Vigencia 4D</span>
                    <span className="text-emerald-300 font-mono">
                      {subgrafo.score_temporal_4d.toFixed(3)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-zinc-900 px-2.5 py-1.5">
                    <span className="text-zinc-500 block">Boost Círculo</span>
                    <span className="text-sky-300 font-mono">
                      +{subgrafo.boost_circulo_cercano.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Fuente: {subgrafo.prospecto.lfpdppp.fuente_origen}
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-500 truncate max-w-[200px]">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {subgrafo.prospecto.lfpdppp.url_evidencia}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-zinc-300">
                  Círculo Cercano ({subgrafo.vecinos_circulo_cercano.length} vínculos)
                </h5>
                {subgrafo.vecinos_circulo_cercano.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Sin aristas relacionales registradas todavía para este nodo.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {subgrafo.vecinos_circulo_cercano.map((v) => (
                      <div
                        key={`${v.prospecto_id}-${v.salto}`}
                        className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-200 truncate">
                            {v.nombre_normalizado}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {v.tipo_vinculo} · {v.contexto_compartido}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[10px] font-mono">
                            salto {v.salto}
                          </span>
                          <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">
                            f={v.fuerza_vinculo.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Derecho de Oposición ARCO / LFPDPPP
                  </div>
                  {confirmingOptOutId !== subgrafo.prospecto.id && (
                    <button
                      onClick={() => setConfirmingOptOutId(subgrafo.prospecto.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-semibold border border-rose-500/40"
                    >
                      Purga Física Opt-Out
                    </button>
                  )}
                </div>

                {confirmingOptOutId === subgrafo.prospecto.id && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={optOutMotivo}
                      onChange={(e) => setOptOutMotivo(e.target.value)}
                      placeholder="Motivo auditable de baja LFPDPPP..."
                      className="w-full rounded-lg bg-zinc-950 border border-rose-500/40 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          void handleConfirmOptOut({
                            prospecto_id: subgrafo.prospecto.id,
                            node_id: 0,
                            nombre_normalizado: subgrafo.prospecto.nombre_normalizado,
                            isla: subgrafo.isla,
                            perfil_psicologico: subgrafo.prospecto.perfil_psicologico,
                            ciudad: subgrafo.prospecto.ubicacion.ciudad,
                            estado: subgrafo.prospecto.ubicacion.estado,
                            zona: subgrafo.prospecto.ubicacion.zona,
                            ingreso_anual_mxn:
                              subgrafo.prospecto.capacidad_adquisitiva.ingreso_anual_estimado_mxn,
                            patrimonio_estimado_mxn:
                              subgrafo.prospecto.capacidad_adquisitiva.patrimonio_estimado_mxn,
                            relevancia_temporal_4d: subgrafo.score_temporal_4d,
                            fuente_origen: subgrafo.prospecto.lfpdppp.fuente_origen,
                            url_evidencia: subgrafo.prospecto.lfpdppp.url_evidencia,
                            gatillos: [],
                          })
                        }
                        disabled={purgingId === subgrafo.prospecto.id}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-zinc-950 font-semibold text-xs disabled:opacity-50"
                      >
                        {purgingId === subgrafo.prospecto.id
                          ? 'Purgando WAL/HNSW...'
                          : 'Confirmar Borrado Físico'}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmingOptOutId(null);
                          setOptOutMotivo('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {lastHunt && (
            <p className="text-[11px] text-zinc-500">
              Vertical activa configurada: {formatearVertical(vertical)}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
