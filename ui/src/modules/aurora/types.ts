export type SubverticalInmobiliaria =
  | 'Preventa'
  | 'Residencial'
  | 'ComercialIndustrial';

export type SubverticalSeguros =
  | 'Vida'
  | 'Gmm'
  | 'HombreClave'
  | 'Educativo'
  | 'Patrimonial';

export type VerticalComercial =
  | { Inmobiliaria: SubverticalInmobiliaria }
  | { Seguros: SubverticalSeguros };

export type PerfilPsicologico =
  | 'AnaliticoFinanciero'
  | 'DinamicoVisual'
  | 'ConservadorPatrimonial';

export type EstadoAprobacion =
  | 'PendienteGatekeeper'
  | 'Aprobado'
  | 'Despachado'
  | 'Rechazado';

export type IslaVertical =
  | 'InmobiliariaPreventa'
  | 'InmobiliariaResidencial'
  | 'InmobiliariaComercialIndustrial'
  | 'SegurosVida'
  | 'SegurosGmm'
  | 'SegurosHombreClave'
  | 'SegurosEducativo'
  | 'SegurosPatrimonial'
  | 'GeneralAurora';

export type CanalContacto =
  | 'WhatsApp'
  | 'LinkedIn'
  | 'CorreoEjecutivo'
  | 'LlamadaDirecta';

export type PlataformaPulso =
  | 'CorreoEjecutivo'
  | 'WhatsApp'
  | 'LinkedIn'
  | 'Instagram'
  | 'X'
  | 'LlamadaDirecta'
  | 'CamaraEmpresarial';

export interface AuroraIpcError {
  code: string;
  message: string;
  daemon_url?: string;
  http_status?: number | null;
}

export interface AuroraHealthState {
  status: string;
  online: boolean;
  daemon_url: string;
  version?: string;
  bind_addr?: string;
  modo_offline?: boolean;
  bob_url?: string;
  bob_online?: boolean;
  bob_slot_id?: number;
  hardware_vram_modelo?: string;
  hardware_ram_sistema?: string;
  nodos_4d?: number;
  aristas_4d?: number;
  ordenes_pendientes?: number;
  calentamientos_pendientes?: number;
  telemetria_eventos?: number;
  uptime_s?: number;
  error?: string;
  mensaje?: string;
  detalle?: string;
}

export interface Ubicacion {
  ciudad: string;
  estado: string;
  zona?: string | null;
}

export interface RegistroCrudoSeed {
  fuente_origen: string;
  url_evidencia: string;
  capturado_en: string;
  formato: 'Html' | 'Json' | 'TextoPlano';
  contenido_crudo: string;
  nombre_detectado?: string | null;
  empresa_detectada?: string | null;
  ubicacion_detectada?: Ubicacion | null;
  co_mencionados: Array<{
    nombre: string;
    contexto: string;
    empresa?: string | null;
  }>;
  datos_extra: Record<string, string>;
  opt_out_detectado: boolean;
}

export interface HuntRequestPayload {
  vertical: VerticalComercial;
  ciudad: string;
  estado: string;
  zona?: string | null;
  palabras_clave: string[];
  limite_resultados?: number | null;
  requiere_js?: boolean | null;
  fuente_url?: string | null;
  fuente_formato?: 'Html' | 'Json' | 'TextoPlano' | null;
  registros_semilla?: RegistroCrudoSeed[] | null;
}

export interface GatilloTelaranaDto {
  tipo: string;
  descripcion: string;
  ocurrido_en: string;
  peso_urgencia: number;
  peso_vigente_4d: number;
}

export interface NodoTelaranaDto {
  prospecto_id: string;
  node_id: number;
  nombre_normalizado: string;
  isla: IslaVertical;
  perfil_psicologico: PerfilPsicologico;
  ciudad: string;
  estado: string;
  zona?: string | null;
  ingreso_anual_mxn: number;
  patrimonio_estimado_mxn?: number | null;
  relevancia_temporal_4d: number;
  fuente_origen: string;
  url_evidencia: string;
  gatillos: GatilloTelaranaDto[];
}

export interface AristaTelaranaDto {
  origen_id: string;
  destino_id: string;
  tipo_vinculo: string;
  fuerza: number;
  contexto_compartido: string;
}

export interface ResumenIslaDto {
  isla: IslaVertical;
  cantidad: number;
}

export interface TelaranaResponse {
  lambda_por_dia: number;
  total_nodos: number;
  total_aristas: number;
  resumen_islas: ResumenIslaDto[];
  nodos: NodoTelaranaDto[];
  aristas: AristaTelaranaDto[];
}

export interface GatilloVigente {
  gatillo: {
    tipo: string;
    descripcion: string;
    ocurrido_en: string;
    peso_urgencia: number;
  };
  peso_vigente_4d: number;
  antiguedad_horas: number;
}

export interface VecinoCirculoCercano {
  prospecto_id: string;
  nombre_normalizado: string;
  tipo_vinculo: string;
  fuerza_vinculo: number;
  contexto_compartido: string;
  salto: number;
  relevancia_propia_4d: number;
}

export interface Prospecto {
  id: string;
  nombre_normalizado: string;
  aliases: string[];
  ubicacion: Ubicacion;
  capacidad_adquisitiva: {
    ingreso_anual_estimado_mxn: number;
    patrimonio_estimado_mxn?: number | null;
  };
  perfil_psicologico: PerfilPsicologico;
  lfpdppp: {
    fuente_origen: string;
    url_evidencia: string;
    capturado_en: string;
    opt_out: boolean;
  };
  gatillos: Array<{
    tipo: string;
    descripcion: string;
    ocurrido_en: string;
    peso_urgencia: number;
  }>;
}

export interface SubgrafoProspecto {
  prospecto: Prospecto;
  isla: IslaVertical;
  score_compuesto: number;
  similitud_vectorial: number;
  score_temporal_4d: number;
  boost_circulo_cercano: number;
  gatillos_vigentes: GatilloVigente[];
  vecinos_circulo_cercano: VecinoCirculoCercano[];
  clusteres_afines: string[];
}

export interface DiagnosticoComercial {
  prospecto_id: string;
  vertical_optima: VerticalComercial;
  producto_gancho: string;
  dolor_principal: string;
  angulo_entrada: string;
  probabilidad_cierre: number;
  justificacion_topologica: string;
}

export interface EscenaReel {
  indice: number;
  duracion_segundos: number;
  descripcion_visual: string;
  texto_overlay: string;
}

export interface BriefCreativo {
  prospecto_id: string;
  perfil_psicologico: PerfilPsicologico;
  gancho_3s: string;
  tono_narrativo: string;
  guion_tts: string;
  escenas_reel: EscenaReel[];
  secciones_dossier_pdf: string[];
  canal_sugerido: CanalContacto;
}

export interface CalentamientoPendiente {
  calentamiento_id: string;
  campana_id: string;
  prospecto_id: string;
  plataforma: string;
  tipo_interaccion: string;
  contexto_publico: string;
  creado_en: string;
}

export interface MetadatosArtefacto {
  ruta_nvme: string;
  sha256_hex: string;
  hash_contenido_u64: number;
  tamano_bytes: number;
  duracion_ms?: number | null;
  tiempo_renderizado_ms: number;
}

export interface PaqueteManufacturado {
  orden_id: string;
  campana_id: string;
  prospecto_id: string;
  directorio_salida: string;
  dossier_pdf: MetadatosArtefacto;
  nota_voz_wav: MetadatosArtefacto;
  reel_vertical_mp4: MetadatosArtefacto;
  subtitulos_srt: MetadatosArtefacto;
  mensaje_directo_texto: string;
  generado_en: string;
}

export interface ComprobanteDespacho {
  tracking_id: string;
  orden_id: string;
  campana_id: string;
  prospecto_id: string;
  canal: CanalContacto;
  estado_campana: string;
  despachado_en: string;
  proximo_seguimiento_en: string;
  url_propuesta_tracking: string;
  referencia_externa: string;
}

export interface OrdenPendienteDto {
  orden_id: string;
  campana_id: string;
  prospecto_id: string;
  prospecto_nombre: string;
  perfil_psicologico: PerfilPsicologico;
  ubicacion: string;
  isla: IslaVertical;
  estado: EstadoAprobacion;
  motivo_rechazo?: string | null;
  diagnostico: DiagnosticoComercial;
  brief_creativo: BriefCreativo;
  calentamiento?: CalentamientoPendiente | null;
  paquete_manufacturado?: PaqueteManufacturado | null;
  comprobante_despacho?: ComprobanteDespacho | null;
  actualizado_en: string;
}

export interface HuntResponse {
  campana_id: string;
  isla: IslaVertical;
  registros_crudos_totales: number;
  prospectos_ingestados: number;
  relaciones_creadas: number;
  excluidos_opt_out: string[];
  planes_encolados: OrdenPendienteDto[];
}

export interface GatekeeperPendientesResponse {
  total_pendientes: number;
  total_en_cola: number;
  ordenes: OrdenPendienteDto[];
  historial_reciente: OrdenPendienteDto[];
}

export interface RegistroInteraccion {
  interaccion_id: string;
  calentamiento_id: string;
  campana_id: string;
  prospecto_id: string;
  plataforma: PlataformaPulso;
  tipo_interaccion: string;
  ejecutado_en: string;
  referencia_externa: string;
}

export interface AprobarOrdenResponse {
  orden_id: string;
  prospecto_id: string;
  campana_id: string;
  estado: EstadoAprobacion;
  paquete_manufacturado: PaqueteManufacturado;
  calentamiento_ejecutado?: RegistroInteraccion | null;
  comprobante_despacho?: ComprobanteDespacho | null;
}

export interface OptOutResponse {
  prospecto_id: string;
  purgado_de_wal: boolean;
  en_blacklist: boolean;
  ordenes_canceladas: number;
  mensaje: string;
}

export interface EstadoTasaPlataforma {
  plataforma: PlataformaPulso;
  usadas_ultima_hora: number;
  cuota_max_hora: number;
  usadas_ultimo_dia: number;
  cuota_max_dia: number;
  fallos_consecutivos: number;
  circuit_abierto_hasta?: string | null;
}

export interface ResumenGanchoTelemetria {
  gancho: string;
  guion_resumen: string;
  campana_id: string;
  isla?: IslaVertical | null;
  muestras: number;
  prospectos_asociados: string[];
  tasa_retencion_promedio: number;
  tasa_apertura_o_respuesta: number;
  es_alto_rendimiento: boolean;
}

export interface PulseEstadoResponse {
  plataformas: EstadoTasaPlataforma[];
  campanas_activas: string[];
  estadisticas_ganchos: ResumenGanchoTelemetria[];
  telemetria_eventos_totales: number;
  calentamientos_recientes: RegistroInteraccion[];
  despachos_recientes: ComprobanteDespacho[];
}

export interface DatasetPreferenciasDpo {
  ruta_jsonl: string;
  entradas: Array<Record<string, unknown>>;
  campanas_auditadas: Array<{
    campana_id: string;
    ajuste_ganador_factor?: number;
    acciones?: string[];
    [key: string]: unknown;
  }>;
  nodos_4d_recalibrados: number;
  aristas_4d_recalibradas: number;
  generado_en: string;
}

export interface DpoConsolidarResponse {
  dataset: DatasetPreferenciasDpo;
}

export interface EventoDaemon {
  tipo: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
