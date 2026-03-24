# Backlog MVP — Agente Híbrido

## Epic A — Gobierno de datos
### Historia A1
Como responsable de control, quiero que el agente consulte solo dominios autorizados para evitar exposición indebida.

#### Criterios de aceptación
- Existe matriz rol -> dominios en código.
- Solicitudes fuera de dominio devuelven rechazo explícito.

### Historia A2
Como equipo de auditoría, quiero trazabilidad completa de conversaciones para revisar decisiones del agente.

#### Criterios de aceptación
- Se guardan conversaciones, mensajes y tool calls.
- Cada respuesta tiene referencia de conversación.

## Epic B — Orquestación de chat
### Historia B1
Como usuario interno, quiero enviar una pregunta y recibir una respuesta en lenguaje natural.

#### Criterios de aceptación
- Endpoint `POST /api/agente/chat` acepta mensaje y rol.
- Se devuelve respuesta estructurada con proveedor y dominios permitidos.

### Historia B2
Como plataforma, quiero tener un endpoint de estado para validar configuración.

#### Criterios de aceptación
- Endpoint `GET /api/agente/health` devuelve modo y disponibilidad de proveedor.

## Epic C — Integración de proveedores
### Historia C1
Como organización, quiero usar Gemini como proveedor principal para lanzar rápido.

#### Criterios de aceptación
- Integración con API key por variable de entorno.
- Respuestas exitosas para casos de prueba definidos.

### Historia C2
Como organización, quiero opción de proveedor local para escalar en servidor propio.

#### Criterios de aceptación
- Existe endpoint configurable de proveedor local.
- Enrutamiento híbrido habilitable por configuración.

## Epic D — Capa de consultas permitidas
### Historia D1
Como usuario de finanzas, quiero preguntar por KPIs de ingresos/egresos y obtener cifras verificables.

#### Criterios de aceptación
- Herramientas SQL de lectura para `ingresos` y `egresos`.
- Respuestas incluyen período consultado.

### Historia D2
Como usuario de personal, quiero consultar métricas de nómina y estatus de personal por categoría.

#### Criterios de aceptación
- Herramientas SQL de lectura para `personal` y `nomina`.
- Se respetan permisos por rol.

## Epic E — UI interna
### Historia E1
Como usuario autenticado, quiero acceder a un chat desde módulo protegido.

#### Criterios de aceptación
- Vista de chat dentro de ruta protegida.
- Manejo de estados: enviando, error, respuesta.

### Historia E2
Como responsable, quiero ver historial por conversación para seguimiento.

#### Criterios de aceptación
- Listado de conversaciones por usuario.
- Apertura y continuación de conversación existente.
