# export_metadata.sql

Uso rápido

- Abre Supabase → SQL Editor.
- Crea una nueva query y pega el contenido de `scripts/export_metadata.sql`.
- Ejecuta la query (puede tardar segundos/minutos según la cantidad de tablas).

Descargar resultados

Después de ejecutar, en SQL Editor ejecuta y descarga cada tabla (botón "Download CSV"):

- `SELECT * FROM public._tables;`
- `SELECT * FROM public._columns;`
- `SELECT * FROM public._primary_keys;`
- `SELECT * FROM public._foreign_keys;`
- `SELECT * FROM public._indexes;`
- `SELECT * FROM public._functions;`
- `SELECT * FROM public._constraints;`
- `SELECT * FROM public._row_estimates;`
- `SELECT * FROM public._samples;`

Notas de seguridad

- El script no extrae datos completos; guarda hasta 10 filas por tabla en `public._samples` y reemplaza campos identificables por `REDACTED` o los trunca.
- Revisa los CSVs antes de compartirlos públicamente y borra las tablas temporales si lo deseas:

```sql
DROP TABLE IF EXISTS public._samples, public._tables, public._columns, public._primary_keys,
  public._foreign_keys, public._indexes, public._functions, public._constraints, public._row_estimates,
  public._views, public._sequences, public._target_tables;
```

Si quieres que guarde esto en otra ubicación o ajuste el nivel de muestreo (ej. 2 filas por tabla), dime y lo modifico.

## Adaptador de proveedor local para el agente IA

También puedes ejecutar un adaptador local para `Plan C` del agente híbrido:

- Archivo: `scripts/ai_local_provider_adapter.mjs`
- Script npm: `npm run agent:local-provider`

### Flujo sugerido con Ollama

1. Levanta Ollama en tu máquina/servidor (`ollama serve`).
2. Descarga un modelo, por ejemplo: `ollama pull llama3.1:8b`.
3. Inicia el adaptador local:

```bash
npm run agent:local-provider
```

4. Verifica salud:

```bash
curl -s http://localhost:5055/health
```

5. Configura en `.env.local`:

```bash
AI_AGENT_LOCAL_URL=http://localhost:5055/generate
```

Con eso, el backend del agente podrá enrutar respuestas al proveedor local cuando el modo esté en `local` o `hybrid`.
