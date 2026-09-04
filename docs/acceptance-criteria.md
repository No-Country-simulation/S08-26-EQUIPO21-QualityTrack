# Criterios de aceptación preliminares del MVP

Basado en el documento original de QA, adaptado para reflejar
`docs/architecture.md` y las decisiones de `docs/adr/`. Las épicas 1 a 4
son las de QA sin cambios de contenido — ya estaban alineadas con el
modelo una vez que se sumó `REQUEST` (ADR-0003). La épica 5 se completó,
y las épicas 6 a 8 son nuevas: cubren la mitad del flujo que todavía no
tenía criterios escritos.

Flujo completo:

Cliente → Solicitud → Cotización → OT → Hoja de Ruta → Producción →
Control de Calidad → Entrega

(La documentación técnica es transversal: se asocia a la OT en
cualquier etapa, no es un paso final del flujo.)

## Convención de roles

Cada criterio que involucra una acción humana indica entre corchetes qué
rol la realiza. Los cuatro roles están definidos en
`docs/ux-research-brief.md`: **Comercial**, **Planta**, **Calidad**,
**Auditor**. `[Todos los roles]` significa que los cuatro pueden hacerlo
(típicamente consultar). Los criterios sin corchetes son comportamiento
del sistema, no la acción de un usuario puntual.

## Épica 1. Clientes y solicitudes

**Alta de cliente**

- **[Comercial]** Puede crear un cliente.
- El sistema solicita los datos obligatorios definidos.
- El sistema no permite guardar un cliente si faltan datos obligatorios.
- El cliente creado queda disponible para futuras solicitudes.

**Alta de solicitud**

- **[Comercial]** Puede crear una solicitud asociada a un cliente
  existente.
- La solicitud contiene los datos mínimos del trabajo solicitado.
- Una solicitud no puede guardarse sin cliente asociado.
- La solicitud queda identificada de forma única.
- **[Comercial]** Puede consultar una solicitud creada.

## Épica 2. Cotizaciones

- **[Comercial]** Puede crear una cotización asociada a una solicitud.
- La cotización queda vinculada al cliente y a la solicitud
  correspondiente.
- Una cotización tiene un estado.
- **[Comercial]** Puede registrar la aprobación de una cotización (la
  aprobación del cliente ocurre fuera del sistema; Comercial la
  registra).
- **[Comercial]** Puede registrar el rechazo de una cotización.
- El sistema registra el estado actual de la cotización.
- Solo una cotización aprobada puede generar una OT.

## Épica 3. Órdenes de Trabajo

- **[Comercial]** Puede generar una OT a partir de una cotización
  aprobada.
- La OT recibe un identificador único.
- La OT mantiene la relación con la cotización que la originó.
- La OT mantiene la relación con el cliente.
- **[Todos los roles]** Pueden consultar los datos básicos de la OT.
- Una cotización pendiente o rechazada no puede generar una OT.
- Una misma cotización no debería generar OTs duplicadas, salvo que se
  defina explícitamente lo contrario.

## Épica 4. Documentación técnica

- **[Comercial, Planta, Calidad]** Pueden asociar documentación a una
  OT (cada rol adjunta lo que le corresponde: Comercial documentación
  comercial y de entrega, Planta planos y certificados, Calidad
  registros de inspección).
- El sistema permite identificar el tipo de documento.
- **[Todos los roles]** Pueden consultar los documentos asociados a una
  OT.
- Un documento debe quedar asociado a una OT existente.
- Los documentos de una OT no deben aparecer asociados a otra OT.
- **[Todos los roles]** Pueden acceder al documento posteriormente.

_A definir: formatos permitidos, tamaño máximo de archivos y si se
permite la visualización y/o descarga._

## Épica 5. Consulta y trazabilidad

- **[Todos los roles]** Pueden buscar una OT.
- **[Comercial, Auditor]** Pueden buscar un cliente.
- Al consultar una OT, el sistema muestra el cliente asociado.
- Al consultar una OT, el sistema muestra la solicitud que la originó.
- Al consultar una OT, el sistema muestra la cotización asociada.
- Al consultar una OT, el sistema muestra los documentos técnicos
  asociados.
- Al consultar una OT, el sistema muestra la hoja de ruta y las
  operaciones realizadas.
- Al consultar una OT, el sistema muestra todos los controles de calidad
  registrados, incluso si hubo más de uno por reprocesos.
- Al consultar una OT, el sistema muestra el historial completo de
  cambios de estado, en orden cronológico.
- La información mostrada corresponde a la OT seleccionada.
- **[Todos los roles, en particular Auditor]** Pueden reconstruir de
  punta a punta el recorrido completo del trabajo — desde la solicitud
  original hasta la entrega — sin salir de la pantalla de la OT.

## Épica 6. Hoja de ruta y producción

_Nueva — a validar con QA._

- **[Planta]** Puede definir la hoja de ruta de una OT, indicando la
  secuencia de operaciones necesarias.
- Una hoja de ruta solo puede definirse sobre una OT ya generada.
- **[Planta]** Puede registrar el inicio y la finalización de cada
  operación de la hoja de ruta.
- El sistema registra qué usuario ejecutó cada operación.
- **[Planta]** Puede consultar el estado de avance de las operaciones de
  una OT (el resto de los roles lo consulta vía el expediente único,
  épica 5).
- Una OT no puede pasar a control de calidad si tiene operaciones sin
  completar.

## Épica 7. Control de calidad

_Nueva — a validar con QA._

- **[Calidad]** Puede registrar una inspección de control de calidad
  sobre una OT.
- El resultado de la inspección puede ser conforme o no conforme.
- Si el resultado es no conforme, la OT vuelve al estado de producción
  para reproceso (ver ADR-0002).
- Una OT puede tener más de un registro de control de calidad si hubo
  reprocesos.
- El sistema conserva todos los registros de inspección, no solo el
  último.
- Solo una OT con control de calidad conforme puede pasar a entrega.

## Épica 8. Entrega

_Nueva — a validar con QA._

- **[Comercial]** Puede marcar una OT como entregada.
- Una OT solo puede marcarse como entregada si su control de calidad más
  reciente es conforme.
- El sistema registra la fecha de entrega.
- Una vez entregada, la OT queda disponible para consulta
  (**[Todos los roles]**) pero no admite más cambios de estado.
