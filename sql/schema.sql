
-- ============================================
-- TABLA: PERSONAL
-- Personas que pueden marcar asistencia
-- ============================================
create table if not exists public.personal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cargo text,
  activo boolean not null default true,
  pin_hash text, -- PIN de 4 dígitos, siempre cifrado (nunca texto plano)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- TABLA: ASISTENCIA
-- Un registro por persona por cada día
-- ============================================
create table if not exists public.asistencia (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personal(id),
  fecha date not null,
  hora_entrada timestamptz,
  hora_salida timestamptz,
  ubicacion_entrada jsonb,
  ubicacion_salida jsonb,
  tardanza_minutos int not null default 0
    check (tardanza_minutos >= 0),
  tiempo_adicional_minutos int not null default 0
    check (tiempo_adicional_minutos >= 0),
  salida_anticipada_minutos int not null default 0
    check (salida_anticipada_minutos >= 0),
  saldo_minutos int not null default 0, -- puede ser negativo (tiempo adeudado)
  tipo text not null default 'normal'
    check (tipo in ('normal', 'permiso', 'falta', 'incidencia')),
  estado text not null default 'aprobado'
    check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo text,
  observacion text,
  created_at timestamptz not null default now(),
  -- Regla clave: solo un registro de asistencia por persona y por día
  unique (persona_id, fecha),
  -- Evita que la salida quede registrada antes que la entrada
  check (
    hora_salida is null
    or hora_entrada is null
    or hora_salida >= hora_entrada
  )
);

-- ============================================
-- TABLA: AUDITORIA
-- Trazabilidad de correcciones administrativas
-- ============================================
create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  asistencia_id uuid references public.asistencia(id) on delete set null,
  accion text not null,
  realizado_por text not null
    check (realizado_por in ('Encargada del área', 'Jefa general')),
  detalle text,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  fecha_hora timestamptz not null default now()
);

-- ============================================
-- TABLA: AVISOS
-- Mensajes temporales para todo el Personal (ej. "permiso aprobado")
-- ============================================
create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  mensaje text not null,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null
);

create index if not exists idx_avisos_expira on public.avisos(expira_en);

-- Índices para que el Historial filtre rápido (RF-13)
create index if not exists idx_asistencia_persona on public.asistencia(persona_id);
create index if not exists idx_asistencia_fecha on public.asistencia(fecha);
create index if not exists idx_asistencia_tipo on public.asistencia(tipo);
create index if not exists idx_asistencia_motivo on public.asistencia(motivo);
create index if not exists idx_asistencia_estado on public.asistencia(estado);

-- Datos iniciales de ejemplo (puedes editarlos o borrarlos)
insert into public.personal (nombre, cargo) values
  ('Milagros', 'Personal'),
  ('Yohana', 'Personal'),
  ('Jubitza', 'Personal')
on conflict do nothing;

-- Actualiza "updated_at" automáticamente cada vez que se modifica una fila
-- de PERSONAL (por ejemplo, cuando alguien crea su PIN o Administración lo
-- restablece), sin que el código de la aplicación tenga que hacerlo a mano.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_personal_updated_at on public.personal;
create trigger trg_personal_updated_at
  before update on public.personal
  for each row
  execute function public.set_updated_at();

-- El PIN de cada persona empieza en NULL (sin PIN). La propia persona lo crea
-- la primera vez que entra a la pantalla de marcación y selecciona su nombre.
-- Administración solo puede restablecerlo (volverlo NULL) si alguien lo olvida,
-- nunca verlo ni asignarlo ella misma.

-- IMPORTANTE: la app solo accede a estas tablas desde el servidor (con la
-- "service role key", que ignora RLS), nunca directamente desde el navegador.
-- Por eso activamos RLS sin agregar políticas: queda todo cerrado para
-- cualquier acceso público o anónimo, tal como recomienda el Advisor de Supabase.
alter table public.personal enable row level security;
alter table public.asistencia enable row level security;
alter table public.auditoria enable row level security;
alter table public.avisos enable row level security;
