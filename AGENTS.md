# AGENTS.md - Documentacion Tecnica y Guia para Agentes de IA

Este documento define la arquitectura, convenciones de diseno, modelos de datos, flujos de operacion y reglas de contribucion para agentes de inteligencia artificial y desarrolladores que interactuen con el codigo de FreeTV Manager.

---

## 1. Vision General del Proyecto

FreeTV Manager es un sistema autonomo para la auditoria, agregacion, validacion de streaming y sincronizacion de catalogos IPTV. Su funcion principal es garantizar que los usuarios finales dispongan permanentemente de enlaces funcionales de television en vivo sin caidas ni transmisiones obsoletas.

### Objetivos Clave
- Diagnosticar flujos multimedia HLS (m3u8), DASH (mpd) y HTTP directos mediante sondas de red asincronas de baja sobrecarga.
- Persistir usuarios, fuentes, canales, configuraciones e historiales de escaneo en una base de datos relacional (PostgreSQL con fallback automatico a SQLite).
- Controlar el acceso mediante autenticacion criptografica robusta.
- Automatizar la exportacion de listas depuradas y sincronizarlas de forma directa con repositorios GitHub remotos a traves de su API REST.
- Ofrecer despliegue estandarizado en contenedores Docker y plataformas PaaS como Dokploy.

---

## 2. Pila Tecnologica y Dependencias

- Lenguaje: Python 3.11+.
- Framework de Interfaz: Flet (basado en Flutter / Material 3) ejecutado en modo Web (FastAPI / Uvicorn) o Desktop.
- ORM y Base de Datos: SQLAlchemy 2.0 con soporte dual:
  - Primario: PostgreSQL 16 via psycopg2-binary.
  - Contingencia: SQLite local (config/freetv.db).
- Cliente HTTP Asincrono: aiohttp y httpx para validaciones de red concurrentes y consumo de APIs REST.
- Parser de Playlists: m3u8 y parser regex interno optimizado.
- Criptografia y Seguridad: hashlib (PBKDF2-HMAC-SHA256), secrets, cryptography (Fernet AES-128 / HMAC-SHA256).
- Variables de Entorno: python-dotenv con persistencia asistida via set_key.
- Contenedores: Docker (python:3.11-slim) y Docker Compose.

---

## 3. Arquitectura del Sistema y Flujo de Datos

```
[Fuentes Remotas M3U / GitHub]
            │
            ▼ (core.parser)
   [PlaylistParser] ---> Normalizacion y parsing de metadatos
            │
            ▼ (core.aggregator)
  [ChannelAggregator] ---> Deduplicacion difusa por nombre y agrupamiento
            │
            ▼ (core.repository)
    [DBRepository] <---> [SQLAlchemy ORM: PostgreSQL / SQLite]
            │
            ├──────────────────────┬──────────────────────┐
            ▼                      ▼                      ▼
    (core.tester)           (core.exporter)       (core.github_sync)
    [StreamTester]        [ChannelExporter]          [GitHubSync]
            │                      │                      │
   Inspeccion HLS          Genera TS, JSON, M3U    Push a GitHub API
   Segmentos de 2KB        Copias de seguridad     tv.m3u en repo
            │                      │                      │
            └──────────────────────┴──────────────────────┘
                                   │
                                   ▼
                       [ui.app - FreeTV Manager]
                        Interfaz Web Bento Dark
```

---

## 4. Estructura de Base de Datos y Modelos ORM

Definidos en core/db_models.py:

### UserModel (Tabla: users)
- id: VARCHAR(64), Clave Primaria (formato usr_xxxxxxxx).
- username: VARCHAR(64), Unico, Not Null.
- email: VARCHAR(128), Opcional.
- password_hash: VARCHAR(128), Not Null (Hash hex PBKDF2).
- salt: VARCHAR(64), Not Null (Salt hex de 16 bytes).
- role: VARCHAR(32), Default: admin.
- is_active: BOOLEAN, Default: True.
- created_at: FLOAT (Timestamp Unix).
- last_login: FLOAT, Opcional.

### SourceModel (Tabla: sources)
- id: VARCHAR(64), Clave Primaria.
- name: VARCHAR(128), Not Null.
- url: TEXT, Not Null.
- type: VARCHAR(32), Default: m3u.
- enabled: BOOLEAN, Default: True.
- priority: INTEGER, Default: 50.
- description: TEXT.
- channels_count: INTEGER, Default: 0.
- last_synced: FLOAT, Timestamp Unix.

### ChannelModel (Tabla: channels)
- id: VARCHAR(128), Clave Primaria.
- title: VARCHAR(256), Not Null, Indexado.
- media_url: TEXT, Not Null (URL del stream).
- url: TEXT, Opcional (URL de referencia).
- group: VARCHAR(64), Default: Entretenimiento.
- country: VARCHAR(64), Default: Global.
- language: VARCHAR(64), Default: Spanish.
- thumb_square: TEXT, Logotipo del canal.
- author: VARCHAR(128).
- service: VARCHAR(64), Default: iptv.
- playlist_url: TEXT.
- tvg_url: TEXT.
- source_id: VARCHAR(64), Clave Foranea a sources.id con ondelete CASCADE.
- enabled: BOOLEAN, Default: True.
- status: VARCHAR(32), Default: untested (untested, online, slow, offline, error).
- latency_ms: FLOAT, Default: 0.0.
- http_code: INTEGER, Codigo HTTP retornado.
- stream_type: VARCHAR(64), Default: Desconocido (HLS, DASH, Direct, MP4).
- error_message: TEXT, Detalle tecnico en caso de falla.
- checked_at: FLOAT, Timestamp de la ultima verificacion.
- created_at: FLOAT, Timestamp de creacion.
- updated_at: FLOAT, Timestamp de actualizacion.

### ScanHistoryModel (Tabla: scan_history)
- id: INTEGER, Clave Primaria autoincrementable.
- channel_id: VARCHAR(128), Indexado.
- status: VARCHAR(32).
- latency_ms: FLOAT.
- http_code: INTEGER.
- error_message: TEXT.
- checked_at: FLOAT.

### SettingModel (Tabla: settings)
- key: VARCHAR(64), Clave Primaria.
- value: TEXT, Not Null.

---

## 5. Normas de Seguridad y Manejo de Credenciales

1. Prohibicion estricta de credenciales en texto plano:
   - Jamas escribir tokens de acceso (PAT de GitHub) o contrasenas en archivos versionados como settings.json, README.md o codigo fuente.
   - settings.json debe mantener de forma obligatoria el campo de token vacio: "token": "".
2. Gestion mediante variables de entorno:
   - Las credenciales deben residir en variables de entorno o en el archivo .env.
   - En ejecucion local, export_view.py utiliza set_key de python-dotenv para persistir cambios en .env sin tocar el repositorio.
3. Reglas de exclusion en Git:
   - .env, .env.* (excepto .env.example), *.db, *.bak* y carpetas venv/ estan excluidos en .gitignore.
4. Criptografia de usuarios:
   - Las contrasenas de administrador deben procesarse mediante hash_password(password) en core/security.py (100,000 iteraciones PBKDF2 con SHA-256).

---

## 6. Motor de Diagnostico de Streaming (core/tester.py)

El verificador de streaming opera de forma asincrona y no bloqueante:
- Timeout global: 15 segundos (10 segundos para conexion TCP, 12 segundos para lectura de socket).
- Cabeceras de red: Supresion de Origin fija para evitar bloqueos por CORS en CDNs restrictivas.
- Identificacion de cliente: Uso de User-Agent de navegador estandar con fallback automatico a VLC/3.0.18 LibVLC/3.0.18.
- Evaluacion de flujos HLS (.m3u8):
  1. Descarga la playlist y valida la etiqueta #EXTM3U.
  2. Si es Master Playlist (#EXT-X-STREAM-INF), extrae la primera variante resolviendo URLs relativas con urllib.parse.urljoin.
  3. Realiza una prueba de lectura parcial (probe de 2KB) sobre el primer segmento de video (.ts o .m4s).
- Criterios de clasificacion:
  - ONLINE: Latencia menor a 2500ms y datos de video verificados.
  - SLOW: Latencia entre 2500ms y 15000ms.
  - OFFLINE: Timeout, error HTTP 404/500/403, o formato corrupto.

---

## 7. Motor de Sincronizacion con GitHub (core/github_sync.py)

- Endpoint: PUT https://api.github.com/repos/{owner}/{repo}/contents/{path}
- Proceso:
  1. Consulta GET al endpoint para obtener el SHA actual del archivo remoto.
  2. Si el archivo existe, incluye sha en el cuerpo JSON de la solicitud para autorizar la actualizacion.
  3. Codifica el contenido M3U en Base64 UTF-8.
  4. Envia el commit con mensaje estructurado.
- Cabeceras inyectadas en tv.m3u:
  - #EXT-X-LAST-MODIFIED con formato ISO 8601 local.
  - #EXT-X-TOTAL-CHANNELS con la cantidad de canales activos exportados.
  - #EXT-X-SOURCE-URL con la URL publica del archivo en GitHub.

---

## 8. Arquitectura de Interfaz de Usuario (Flet)

- Patron estructural: Single Page Application (SPA) con shell de navegacion lateral en ui/app.py.
- Seleccionabilidad de texto: Todos los contenedores de vistas y componentes de lista estan envueltos en ft.SelectionArea y disponen de la propiedad selectable=True para facilitar la copia de URLs, nombres y diagnosticos.
- Paleta Bento Dark (ui/theme.py):
  - Fondo general: #0D0E11 (BG_DARK).
  - Superficie de tarjetas: #16181D (CARD_BG).
  - Bordes sutiles: #262930 (CARD_BORDER).
  - Color de acento: #F59E0B (BRAND_AMBER).
  - Estados: Verde #10B981 (ONLINE), Amarillo #F59E0B (SLOW), Rojo #EF4444 (OFFLINE).

---

## 9. Despliegue en Dokploy y Contenedores

- Puerto y Enlace: La aplicacion escucha en 0.0.0.0 y lee dinamicamente PORT o FLET_PORT (puerto por defecto 8550).
- Volumenes persistentes en Dokploy:
  - pgdata: /var/lib/postgresql/data (datos de PostgreSQL).
  - freetv_config: /app/config (configuraciones locales y SQLite de respaldo).
  - freetv_dist: /app/dist (archivos exportados tv.m3u).
- Healthcheck: curl -f http://localhost:${FLET_PORT:-8550}/ con intervalo de 20s y timeout de 5s.

---

## 10. Reglas de Interaccion para Agentes de IA

1. Sin emoticones en documentacion tecnica o commits cuando el usuario solicite estilo formal.
2. Mantener la integridad de los modelos de base de datos; si se agregan campos, asegurar valores por defecto y migraciones compatibles.
3. No alterar la logica de fallback de base de datos; la conmutacion a SQLite garantiza que la app funcione incluso si PostgreSQL no esta en ejecucion.
4. Siempre validar que las dependencias esten presentes en requirements.txt antes de usarlas en el codigo.
5. Preservar las cabeceras de auditoria y metadatos en core/exporter.py al generar playlists M3U.
