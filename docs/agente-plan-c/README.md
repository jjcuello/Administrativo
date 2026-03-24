# Plan C Híbrido — Ruta de Ejecución

## Objetivo
Implementar un agente conversacional para usuarios internos que responda preguntas sobre datos operativos y financieros de la organización, con arquitectura híbrida:

- Modelo principal administrado (Gemini por API).
- Capa de orquestación y seguridad propia en la app.
- Ruta de migración futura a inferencia local en servidor institucional.

## Principios de diseño
1. El agente no consulta tablas crudas de forma libre.
2. El acceso a datos se controla por dominio y por rol.
3. Toda respuesta debe ser trazable (pregunta, consulta, resultado).
4. El MVP privilegia seguridad y utilidad sobre cobertura total.

## Arquitectura objetivo
### 1) Frontend
- Vista de chat interna (módulo protegido).
- Historial por sesión/conversación.
- Confirmación explícita para preguntas sensibles.

### 2) Orquestador en Next.js
- Endpoint de chat (`/api/agente/chat`).
- Clasificación de intención y dominio.
- Evaluación de permisos por rol.
- Enrutamiento de proveedor (`gemini`, `local`, `hybrid`).

### 3) Capa de datos segura
- Consultas permitidas por catálogo de herramientas.
- Uso de vistas o RPC para respuestas de negocio.
- Bloqueo de consultas no autorizadas.

### 4) Persistencia y auditoría
- Conversaciones.
- Mensajes.
- Llamadas a herramientas y estado.

### 5) Proveedores LLM
- Primario: Gemini API.
- Secundario/futuro: endpoint local en servidor institucional.

## Ruta de implementación (6 semanas)
## Semana 1 — Fundaciones
- Confirmar dominios iniciales del agente: `personal`, `nomina`, `ingresos`, `egresos`.
- Definir matriz rol -> dominio permitido.
- Crear auditoría base (tablas de conversaciones/mensajes/tool calls).
- Definir contrato del endpoint de chat.

### Entregable
- Estructura técnica creada en código.
- Migración base aplicada.

## Semana 2 — Herramientas de datos v1
- Diseñar 4-8 herramientas SQL de lectura segura (KPIs y listados resumidos).
- Estandarizar salidas para lenguaje natural.
- Registrar latencia y errores por herramienta.

### Entregable
- Agente responde preguntas operativas comunes con datos reales.

## Semana 3 — Integración proveedor Gemini
- Integrar llamada real a Gemini API.
- Prompt de sistema con políticas y límites.
- Fallback controlado cuando no haya datos suficientes.

### Entregable
- Respuestas útiles en entorno de prueba interna.

## Semana 4 — Interfaz de chat interna
- Crear módulo protegido en la app.
- Historial por usuario.
- Estados de carga, error y fuente de respuesta.

### Entregable
- Piloto interno funcional.

## Semana 5 — Seguridad y calidad
- Pruebas con batería de preguntas reales.
- Endurecer guardrails (PII, dominios restringidos, rechazo de prompts inseguros).
- Métricas de calidad (exactitud, cobertura, tiempo de respuesta).

### Entregable
- Aprobación para uso controlado de equipo.

## Semana 6 — Habilitación híbrida con servidor propio
- Conector opcional a proveedor local.
- Regla de enrutamiento por tipo de consulta/costo.
- Manual operativo de fallback y observabilidad.

### Entregable
- Plan de escalado híbrido en producción.

## Criterios de Go/No-Go
- Exactitud mínima acordada en batería de pruebas internas.
- 0 filtraciones de datos fuera del permiso de rol.
- Trazabilidad completa por interacción.
- Tiempo de respuesta dentro de umbral definido por operación.

## Riesgos principales y mitigación
- Riesgo: respuestas inventadas.
  - Mitigación: respuestas solo con herramientas permitidas + evidencia de origen.
- Riesgo: acceso a datos sensibles.
  - Mitigación: matriz de acceso por rol + vistas agregadas + auditoría.
- Riesgo: costos de inferencia.
  - Mitigación: límites por usuario, caché de consultas y enrutamiento híbrido.

## Decisiones ya ejecutadas en este repositorio
- Se creó estructura base de agente en `src/lib/aiAgent`.
- Se crearon endpoints iniciales en `src/app/api/agente`.
- Se creó migración base de auditoría en `sql_migrations/20260317_schema_migration_v33_ai_agent_foundation.sql`.
- Se implementaron tools SQL v1 para `personal`, `nomina`, `ingresos`, `egresos` y `reportes`.
- El endpoint de chat valida sesión real por token y resuelve rol desde `user_roles`.
- Existe UI inicial de chat en `src/app/gestion/socios/agente/page.tsx`.
- Se integró respuesta enriquecida con Gemini API y fallback seguro.
- Se añadió adaptador de proveedor local en `scripts/ai_local_provider_adapter.mjs`.

## Configuración mínima de entorno
Puedes partir del archivo ejemplo:

- `docs/agente-plan-c/env.local.example`

Copiar contenido a `.env.local` y completar valores reales.

Variables clave:

- `AI_AGENT_PROVIDER_MODE=hybrid`
- `GEMINI_API_KEY=` (opcional en bootstrap; requerida para proveedor Gemini real)
- `AI_AGENT_GEMINI_MODEL=gemini-2.5-flash`
- `AI_AGENT_LOCAL_URL=` (opcional; URL del proveedor local en servidor institucional)
- `AI_AGENT_TIMEOUT_MS=15000`
- `SUPABASE_SERVICE_ROLE_KEY=` (requerida para tools SQL v1)

> Nota: `SUPABASE_SERVICE_ROLE_KEY` solo debe usarse en backend server-side, nunca en componentes cliente.
>
> Con `GEMINI_API_KEY` + `AI_AGENT_GEMINI_MODEL` configurados, el endpoint de chat ya genera respuesta final enriquecida por modelo usando el contexto de herramientas SQL.

## Paso a paso para tener funcionalidad completa

### Paso 1 — Confirmar prerequisitos
1. App Next corriendo localmente.
2. Migración v33 ya aplicada (conversaciones/mensajes/tool calls).
3. Variables públicas de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) configuradas.

### Paso 2 — Configurar backend del agente
1. Crear/editar `.env.local`.
2. Definir como mínimo:
  - `AI_AGENT_PROVIDER_MODE=hybrid`
  - `SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>`
3. Para Gemini real:
  - `GEMINI_API_KEY=<tu_api_key>`
  - `AI_AGENT_GEMINI_MODEL=gemini-2.5-flash`

### Paso 3 — (Opcional) activar proveedor local real
Si quieres usar local o híbrido con servidor propio desde ya:

1. Instalar y levantar Ollama:

```bash
ollama serve
```

2. Descargar modelo:

```bash
ollama pull llama3.1:8b
```

3. Levantar adaptador local del repo:

```bash
npm run agent:local-provider
```

4. Configurar URL local del agente en `.env.local`:

```bash
AI_AGENT_LOCAL_URL=http://localhost:5055/generate
```

### Paso 4 — Reiniciar app

```bash
npm run dev
```

### Paso 5 — Validar salud del módulo

```bash
curl -s http://localhost:3000/api/agente/health
```

Interpretación recomendada del JSON `status`:
- `hasServiceRole=true` → puede consultar data real.
- `hasGemini=true` → Gemini disponible.
- `hasLocal=true` → proveedor local configurado.
- `readyProvider=true` → al menos un proveedor LLM disponible según modo.
- `readyForData=true` / `ready=true` → listo para operación con datos reales.

### Paso 6 — Probar desde UI
1. Iniciar sesión en la app con usuario válido.
2. Ir a `/gestion/socios/agente`.
3. Probar preguntas tipo:
  - “Resumen de personal activo”
  - “Nómina más reciente”
  - “Ingresos de 2026-03”
  - “Egresos de 2026-03”

### Paso 7 — Probar por API (opcional)
1. Obtener token de sesión del usuario autenticado.
2. Ejecutar:

```bash
curl -s -X POST http://localhost:3000/api/agente/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Resumen de personal activo"}'
```

### Paso 8 — Elegir modo operativo recomendado
- **`gemini`**: mejor calidad inicial y despliegue rápido.
- **`hybrid`**: recomendado para transición (Gemini + local como fallback/escala).
- **`local`**: máximo control, mayor responsabilidad operativa.

## Troubleshooting rápido
- Si responde “falta SUPABASE_SERVICE_ROLE_KEY”: revisar `.env.local` y reiniciar servidor.
- Si responde fallback sin enriquecer: revisar `GEMINI_API_KEY` y salida de `/api/agente/health`.
- Si local falla: revisar `AI_AGENT_LOCAL_URL` y `curl http://localhost:5055/health`.
- Si retorna 401 en chat: token expirado o inválido (renovar sesión y reenviar).

## Smoke test rápido
1. Estado del módulo:

```bash
curl -s http://localhost:3000/api/agente/health
```

2. Consulta de personal (admin):

Antes de consultar chat, define token de sesión Supabase de un usuario autenticado:

```bash
TOKEN="<access_token_supabase>"
```

```bash
curl -s -X POST http://localhost:3000/api/agente/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Resumen de personal activo"}'
```

3. Consulta financiera mensual (operativo):

```bash
curl -s -X POST http://localhost:3000/api/agente/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Ingresos de 2026-03"}'
```

> El backend resuelve `roleCode` desde la sesión real del token y ya no confía en rol enviado por el cliente.

## Próximo paso recomendado
Agregar evaluación de calidad (set de preguntas esperadas + verificación automática) y panel básico de observabilidad por dominio/latencia.
