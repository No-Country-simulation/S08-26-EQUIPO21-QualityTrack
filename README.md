# S08-26-EQUIPO21-QualityTrack

## Descripción / Contexto

La empresa se dedica al **mecanizado de piezas para clientes industriales**. Cada trabajo comienza a partir de una solicitud de un cliente que requiere fabricar o mecanizar una determinada pieza de acuerdo con especificaciones técnicas.

El proceso involucra diferentes etapas y personas: el área comercial o administrativa recibe el requerimiento, se analiza la factibilidad y se genera una cotización. Una vez que el cliente aprueba el trabajo, se debe transformar esa solicitud en una **Orden de Trabajo (OT)** que permita al personal de planta ejecutar correctamente las operaciones necesarias.

Durante este proceso se generan y utilizan diferentes tipos de documentación:

- Planos de ingeniería.
- Especificaciones técnicas.
- Certificados de materia prima.
- Órdenes de compra.
- Facturas y comprobantes.
- Registros de producción.
- Controles de calidad.
- Documentación asociada a la entrega.

Actualmente, gran parte de esta información se administra mediante archivos físicos, documentos independientes y planillas, lo que dificulta mantener una relación clara entre el cliente, el trabajo solicitado, la cotización, la Orden de Trabajo, los documentos técnicos, las operaciones realizadas y el resultado final.

El problema no está únicamente en la cantidad de información, sino en la falta de una trazabilidad centralizada.

Ante una consulta, un error de producción, una no conformidad o una auditoría, la empresa necesita poder responder rápidamente:

> **¿Qué trabajo se realizó, para qué cliente, bajo qué especificaciones, con qué material, qué operaciones se realizaron, quién intervino, qué controles se efectuaron y qué documentación respalda el proceso?**

QualityTrack busca resolver esta problemática mediante un sistema centralizado de **gestión, trazabilidad y documentación de las órdenes de trabajo.**

---

## Problema / Dolor del negocio

La gestión mediante archivos físicos y planillas independientes genera una serie de problemas operativos.

### 🔻 Falta de trazabilidad

La información relacionada con un trabajo puede encontrarse distribuida en diferentes lugares.
Esto dificulta reconstruir el historial completo de una pieza desde que se recibe el pedido hasta que se entrega.

### 🔻 Información dispersa

Planos, certificados, órdenes de compra, cotizaciones y otros documentos no necesariamente se encuentran vinculados directamente con la Orden de Trabajo correspondiente.

### 🔻 Riesgo de errores manuales

La transferencia manual de información entre cotización, Orden de Trabajo y Hoja de Ruta puede generar:

- Datos incorrectos.
- Información incompleta.
- Duplicación de información.
- Pérdida de documentación.
- Errores en la ejecución.

### 🔻 Dificultad para consultar información en planta

El personal que trabaja en las operaciones necesita acceder rápidamente a la información técnica de la pieza.
La consulta de documentación física o almacenada en diferentes ubicaciones puede generar demoras y errores.

### 🔻 Dificultad para demostrar el proceso

Ante una auditoría o una revisión interna, la empresa necesita disponer de evidencia organizada del proceso.
Actualmente, obtener esa evidencia puede requerir buscar información en diferentes archivos y registros.

### 🔻 Falta de indicadores

La información existente no está necesariamente estructurada para generar indicadores sobre:

- Órdenes de trabajo.
- Tiempos.
- Estados.
- No conformidades.
- Producción.
- Entregas.
- Calidad.

---

## Oportunidad

La oportunidad consiste en transformar el proceso actual en un flujo digital trazable, donde cada trabajo tenga un expediente único y toda la información relacionada permanezca vinculada durante las diferentes etapas.

El sistema debería permitir pasar de:

<p align="center">
<strong>Solicitud del cliente → Cotización → Aprobación → Orden de Trabajo → Hoja de Ruta → Operaciones → Control de Calidad → Entrega</strong>
</p>

manteniendo la información asociada durante todo el ciclo.

El objetivo no es simplemente reemplazar papeles por una pantalla.
El objetivo es construir una fuente única de información para cada trabajo, donde las personas puedan consultar rápidamente qué se debe hacer, cómo se debe hacer y qué documentación respalda cada etapa.

---

## ✅ Criterio de éxito del proyecto

El proyecto será exitoso si un usuario puede tomar una Orden de Trabajo y, sin necesidad de buscar información en diferentes sistemas, planillas o carpetas, reconstruir el historial completo del trabajo y acceder a la documentación asociada.
