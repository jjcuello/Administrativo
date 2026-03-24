# Matriz Operativa del Piloto (Septiembre 2025)

## Reglas de trabajo
1. Cada registro debe tener soporte de fuente oficial.
2. No se permite carga fuera del mes 2025-09.
3. Juan y José no deben solaparse en la misma partición operativa.
4. Toda incidencia se registra en la bitácora.

## Partición recomendada para evitar duplicados
- **Juan**: cuentas `Efectivo`, `Banco Provincial`, `Pago Móvil`.
- **José**: cuentas `Patria`, `Fondos Extranjeros`, `Binance`, `Banco Exterior`.

> Si su realidad operativa es distinta, mantener la regla: cada cuenta solo tiene un operador durante el piloto.

## Tabla RACI simplificada
| Fase | Tarea | Responsable primario | Soporte | Entregable | Criterio de aceptación |
|---|---|---|---|---|---|
| F0 | Preparación del piloto | Responsable de control | Todos | Ventana y plan aprobados | Checklists listos |
| F1 | Respaldo y limpieza de ficticios | Responsable técnico | Responsable de control | Base en cero (objetivo) | Conteos post-limpieza validados |
| F2 | Carga de personal/profesores | Nadia | Responsable de control | Maestros de personal | Sin duplicados, datos completos |
| F2 | Carga de colegios | José | Responsable de control | Catálogo de colegios | Registros consistentes |
| F2 | Carga de servicios (colegio+profesor) | Juan | Nadia/José | Servicios activos | Relaciones válidas |
| F3 | Carga operativa por cuentas (partición Juan) | Juan | Responsable de control | Registros septiembre | Sin registros fuera de partición |
| F3 | Carga operativa por cuentas (partición José) | José | Responsable de control | Registros septiembre | Sin registros fuera de partición |
| F4 | Conciliación diaria | Responsable de control | Juan/José | Plantilla diaria completa | Diferencias explicadas o corregidas |
| F5 | Conciliación final y cierre | Responsable de control | Todos | Informe final + Go/No-Go | Diferencia final dentro de tolerancia |

## Definición de “Terminado” por bloque
- Maestros: 100% de registros esperados cargados y validados.
- Operaciones: 100% de movimientos de septiembre cargados por partición.
- Conciliación: diferencia diaria explicada; diferencia final cerrada.

## Reunión diaria de control (15-20 min)
- Pendiente de ayer.
- Cargado hoy.
- Diferencias detectadas.
- Riesgos para el cierre.
- Acciones y responsable hasta el próximo corte.