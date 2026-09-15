# Brief de investigación — UX/UI

## El problema que resolvemos

Hoy la fábrica gestiona todo con planillas sueltas y papeles. Cuando
alguien necesita reconstruir la historia completa de un trabajo — para
responder una consulta, investigar un error, o mostrar evidencia en una
auditoría — tiene que buscar en varios lugares distintos y a veces no
encuentra todo. QualityTrack existe para que esa reconstrucción se pueda
hacer desde una sola pantalla.

## Los 4 roles y qué necesita cada uno

### Comercial

Recibe el pedido del cliente, cotiza, registra la aprobación y cierra la
entrega al final. Es quien más entra y sale del sistema en el día a día.

**Necesita:** ver de un vistazo el estado de sus cotizaciones y trabajos
en curso, cargar una solicitud nueva rápido, sin fricción.

### Planta

Define cómo se va a fabricar la pieza (secuencia de operaciones) y
ejecuta esas operaciones.

**Necesita:** acceso rápido a las especificaciones técnicas de la pieza
(planos, materiales) sin perder tiempo buscando — probablemente
consultando desde el piso de planta, no desde un escritorio.

### Calidad

Inspecciona la pieza terminada y registra si está conforme o no. Si no
lo está, la pieza vuelve a producción y puede pasar por esta inspección
más de una vez.

**Necesita:** un formulario de inspección claro, y ver si esa pieza ya
pasó por acá antes (para no perder contexto de qué falló la vez
anterior).

### Auditor

No interviene en el proceso — solo consulta. Puede abrir cualquier
trabajo en cualquier momento, incluso a mitad de producción.

**Necesita:** reconstruir el historial completo de un trabajo sin
pedirle ayuda a nadie. Este rol es, en los hechos, el que valida si el
sistema cumplió su objetivo.

_Nota: el cliente pide y aprueba el trabajo, pero no es un usuario del
sistema — no tiene login. Es Comercial quien gestiona esa relación._

## El recorrido, en palabras simples

1. El cliente pide una pieza → Comercial cotiza.
2. El cliente aprueba → se genera el trabajo.
3. Planta define cómo se va a fabricar y la produce.
4. Calidad inspecciona la pieza terminada.
5. Si está todo bien, se entrega. Si no, vuelve a producción y se repite
   la inspección — esto puede pasar más de una vez sobre el mismo
   trabajo.
6. En cualquier momento de todo este recorrido, un auditor puede abrir
   ese trabajo y ver la historia completa hasta ese punto.

## La pantalla más importante: el expediente único

Sea cual sea el diseño que propongas, tiene que resolver esto: **cualquiera
de los 4 roles abre un trabajo y ve todo sin salir de esa pantalla** —
quién lo pidió, qué se cotizó, cómo se aprobó, qué operaciones se
hicieron, qué dijo cada inspección de calidad (incluso si hubo más de
una), qué documentos están adjuntos, y cuándo pasó cada cosa. Este es el
criterio de éxito de todo el proyecto — no es una pantalla más, es _la_
pantalla.

## Preguntas abiertas para tu investigación

- ¿Comercial y Administrativo son la misma persona en la práctica, o
  necesitan vistas/permisos distintos?
- ¿"Planta" es un solo rol, o conviene separar a quien planifica
  (define la secuencia de operaciones) de quien ejecuta?
- ¿Desde qué dispositivo consulta la información el personal de planta
  en su día a día — PC de oficina, tablet compartida, otra cosa?
- ¿Qué necesita cada rol de un vistazo (tipo dashboard) versus qué
  necesita buscar en detalle dentro de un trabajo puntual?
- ¿Cómo se muestra sin generar confusión un historial con reprocesos —
  una pieza que pasó por control de calidad más de una vez antes de
  salir bien?
