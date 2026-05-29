# [ ARKIV ] × PunaTech 2026 — Rúbrica de Evaluación
### Hackathon · Salta, Argentina · 28–30 de mayo de 2026

---

## Escala de puntuación

Cada sub-criterio se puntúa de **1 a 5**:

| Puntaje | Significado |
|---------|-------------|
| 1 | Ausente o no funciona |
| 2 | Esfuerzo mínimo, apenas funcional |
| 3 | Funciona, cumple con lo esperado |
| 4 | Bien — implementación reflexiva, por encima del promedio |
| 5 | Excelente — impresiona, creativo o de calidad producción |

---

## Criterio 1: Profundidad de integración con [ ARKIV ] (40%)

Este es el núcleo del Hackathon. Evaluamos qué tan significativamente se usa [ ARKIV ] como capa de datos — no solo si está presente.

| Sub-criterio | 1 (Débil) | 3 (Sólido) | 5 (Excelente) |
|-------------|-----------|------------|----------------|
| **Diseño del esquema de entidades** | Entidad blob sin estructura. `PROJECT_ATTRIBUTE` ausente o genérico. | Tipos de entidad separados con `PROJECT_ATTRIBUTE` único, atributos tipados y separación clara de responsabilidades. | Esquema bien diseñado con atributos correctamente tipados, payload estructurado para el caso de uso, project-namespace limpio. |
| **Uso de consultas** | Solo lectura por clave de entidad. | Filtra por `PROJECT_ATTRIBUTE` más 1–2 atributos temáticos. | Múltiples filtros de consulta, range queries sobre atributos numéricos, paginación de resultados grandes. |
| **Modelo de propiedad** | Sin asociación de billetera. | Usa `$owner` correctamente (solo el propietario puede actualizar/eliminar). | `$owner` del usuario final para control de escritura/actualización/eliminación, más `$creator` usado intencionalmente para atribución a prueba de manipulación donde corresponde. |
| **Relaciones entre entidades** | Sin relaciones. | Links padre → hijo via foreign keys de atributo compartido. | Atributos de foreign key usados consistentemente, relaciones mantenidas en creación/eliminación, usadas para navegación e integridad de datos. |
| **Fechas de expiración** | Sin expiración definida, o la misma en todo. | Duraciones `expiresIn` presentes y razonables para el dominio. | `expiresIn` diferenciadas y reflexivas por tipo de entidad, reflejando lógica de producto real. |
| **Funcionalidades avanzadas** | Ninguna. | Transiciones del ciclo de vida de entidades basadas en lógica de negocio. | Múltiples: creaciones en lote via `mutateEntities`, uso creativo de funcionalidades de [ ARKIV ]. |

**Puntaje de sección** = promedio de 6 sub-criterios, con peso del 40%

---

## Criterio 2: Funcionalidad (30%)

¿Funciona? ¿Puede un usuario real completar los flujos principales del tema elegido?

| Sub-criterio | 1 (Débil) | 3 (Sólido) | 5 (Excelente) |
|-------------|-----------|------------|----------------|
| **Flujos principales funcionan** | No se puede completar el flujo básico de creación o navegación. | Crear + navegar + ver detalles funcionan de punta a punta. | Todos los flujos funcionan de forma confiable: crear, navegar, filtrar, ver, interactuar, editar, gestionar. |
| **Filtrado y búsqueda** | Sin filtrado. | 1–2 filtros funcionan. | Múltiples filtros, búsqueda por palabra clave, filtros combinables, resultados se actualizan correctamente. |
| **Integración de billetera** | La billetera conecta pero no pasa nada. | Las funcionalidades con billetera funcionan. | Flujo de billetera fluido: conectar, verificar red, estados de error, desconectar. Complejidad blockchain abstraída. |
| **Manejo de errores** | Crashes o fallas silenciosas. | Mensajes de error básicos mostrados al usuario. | Estados de error manejados: problemas de red, transacciones fallidas, errores de validación. |
| **Integridad de datos** | Inconsistencias de datos, referencias rotas. | Los datos son consistentes dentro de la app. | Las transiciones de estado de entidades son confiables, sin datos huérfanos. |

**Puntaje de sección** = promedio de 5 sub-criterios, con peso del 30%

---

## Criterio 3: Diseño y UX (20%)

¿Alguien lo usaría realmente? ¿Se siente como un producto y no una demo?

| Sub-criterio | 1 (Débil) | 3 (Sólido) | 5 (Excelente) |
|-------------|-----------|------------|----------------|
| **Diseño visual** | Sin estilo, sin esfuerzo de diseño. | Estilo limpio y consistente. Se ve intencional. | Identidad visual distintiva, buena tipografía, paleta de colores cohesiva, se siente profesional. |
| **Experiencia de usuario** | Navegación confusa, no queda claro qué hacer. | Jerarquía de información clara, CTAs obvios, flujo razonable. | Intuitivo desde la primera visita, buenos estados vacíos, estados de carga, divulgación progresiva. |
| **Responsivo** | Roto en mobile. | Usable en mobile, layout responsivo básico. | Se ve y funciona bien en distintos tamaños de pantalla. |
| **Abstracción de blockchain** | El usuario necesita entender [ ARKIV ] o blockchain para usar la app. | Los detalles de blockchain están presentes pero no bloquean. | El usuario no necesita saber nada de [ ARKIV ] o blockchain para navegar y usar los flujos principales. |

**Puntaje de sección** = promedio de 4 sub-criterios, con peso del 20%

---

## Criterio 4: Calidad de código y documentación (10%)

¿Puede otra persona entender y correr tu proyecto?

| Sub-criterio | 1 (Débil) | 3 (Sólido) | 5 (Excelente) |
|-------------|-----------|------------|----------------|
| **README** | Ausente o "TODO". | Instrucciones de setup que funcionan, descripción básica. | README claro con resumen de arquitectura, pasos de setup, y explicación del enfoque de integración con [ ARKIV ]. |
| **Organización del código** | Archivo único o código espagueti. | Estructura de archivos razonable, componentes separados. | Arquitectura limpia, separación de responsabilidades, nombres descriptivos. |
| **Calidad del código** | Ilegible, sin manejo de errores. | Estilo consistente, manejo básico de errores. | Limpio, consistente, bien estructurado. Tipos donde corresponde. Sin problemas evidentes de seguridad. |

**Puntaje de sección** = promedio de 3 sub-criterios, con peso del 10%

---

## Cálculo del puntaje final

```
Puntaje Final = (Integración con Arkiv × 0,40) + (Funcionalidad × 0,30) + (Diseño y UX × 0,20) + (Calidad de código × 0,10)
```

Cada puntaje de sección es el promedio de sus sub-criterios (todos en escala 1–5), por lo que el puntaje final también está en escala 1–5.

---

## Premios

| Posición | Premio |
|----------|--------|
| 1° lugar | $600 USDC |
| 2° lugar | $450 USDC |
| 3° lugar | $300 USDC |
| 4° lugar | $150 USDC |

---

## Evaluación del Pitch

El pitch en español forma parte de la evaluación final como complemento cualitativo. No tiene peso numérico independiente, pero los jueces lo consideran para:

| Aspecto | Qué se observa |
|---------|---------------|
| **Claridad** | ¿Se entiende qué hace el proyecto y por qué importa? |
| **Comunicación del problema** | ¿Transmite un problema real y cómo lo resuelve? |
| **Demo en vivo** | Si aplica: ¿muestra el producto funcionando? |

