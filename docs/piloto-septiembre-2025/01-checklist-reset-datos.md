# Checklist de Reseteo Controlado (Borrado de Data Ficticia)

> Objetivo: dejar la base lista para cargar septiembre 2025 real, sin contaminación de datos ficticios.

## A. Precondiciones (obligatorias)
- [ ] Confirmar ambiente objetivo (piloto) y bloquear acceso operativo durante la ventana.
- [ ] Confirmar respaldo completo generado y verificable.
- [ ] Confirmar fecha/hora de inicio y fin de ventana de mantenimiento.
- [ ] Confirmar responsable técnico de ejecución.
- [ ] Confirmar responsable de control funcional (conciliación).

## B. Tablas a limpiar (negocio)
> Ajustar lista según tu esquema final. No incluir tablas de auth, migraciones ni configuración técnica.

- [ ] `ingresos`
- [ ] `egresos`
- [ ] `transacciones`
- [ ] `alumnos`
- [ ] `representantes`
- [ ] `inscripciones`
- [ ] `colegios`
- [ ] `clubes`
- [ ] `clientes_particulares`
- [ ] `clases_particulares`
- [ ] `servicios`
- [ ] `personal`
- [ ] `proveedores`
- [ ] `cuentas_financieras`
- [ ] `nominas_mensuales`
- [ ] `ventas`
- [ ] `socios`
- [ ] Otras tablas de carga ficticia identificadas

## C. Tablas que NO se tocan
- [ ] Estructura de esquema y migraciones.
- [ ] Usuarios de autenticación y permisos.
- [ ] Configuración técnica/base del sistema.
- [ ] Catálogos mínimos técnicos requeridos para arranque (si aplican).

## D. Verificación pre-limpieza
- [ ] Tomar conteo por tabla objetivo (snapshot pre).
- [ ] Guardar evidencia del snapshot (archivo/bitácora).
- [ ] Confirmar que el equipo entiende que se borrará data ficticia.

## E. Ejecución
- [ ] Ejecutar limpieza en transacción controlada (o por bloques aprobados).
- [ ] Registrar hora de inicio y fin.
- [ ] Registrar operador que ejecutó el proceso.

## F. Verificación post-limpieza
- [ ] Conteo por tabla objetivo en 0 (o estado esperado).
- [ ] Sin referencias huérfanas ni errores de integridad.
- [ ] UI arranca sin errores críticos.
- [ ] Se habilita inicio de carga maestra real.

## G. Criterio de aprobación de fase
- [ ] Responsable técnico aprueba limpieza.
- [ ] Responsable de control aprueba limpieza.
- [ ] Se autoriza inicio de Fase de Carga Maestra.

---

## Consulta sugerida para snapshot de conteos (adaptar)
```sql
select 'ingresos' as tabla, count(*) as total from public.ingresos
union all
select 'egresos', count(*) from public.egresos
union all
select 'transacciones', count(*) from public.transacciones
union all
select 'personal', count(*) from public.personal
union all
select 'colegios', count(*) from public.colegios
union all
select 'servicios', count(*) from public.servicios
union all
select 'cuentas_financieras', count(*) from public.cuentas_financieras;
```

## Nota
Si alguna tabla de la lista no existe en tu esquema, elimínala del checklist antes de ejecutar.