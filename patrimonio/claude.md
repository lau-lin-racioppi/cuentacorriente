# CLAUDE.md — Patrimonio Personal

Este archivo define el comportamiento esperado de Claude Code en este proyecto.
Leelo completo antes de cualquier intervención.

---

## Qué es este proyecto

Una herramienta web personal para registrar y visualizar patrimonio real.
Corre en el navegador, sin backend, sin servidor. Todo persiste en `localStorage`.
No es una app financiera, no es un producto comercial, no es una simulación.

---

## Antes de tocar código

1. Leé `ARCHITECTURE.md`. Es la fuente de verdad del modelo de datos y las reglas de negocio.
2. Si `ARCHITECTURE.md` no existe todavía, crealo antes que cualquier otro archivo.
3. Si hay una contradicción entre `ARCHITECTURE.md` y el código existente, señalala antes de resolver nada.

---

## Reglas de negocio — nunca las violes sin consultarme

- ARS y USD no se mezclan ni convierten en ningún punto de la app.
- Un activo con `linkedLiabilityId` no se computa como activo neto de forma aislada.
- El patrimonio neto es estrictamente `totalActivos - totalPasivos`, por moneda, sin ajustes.
- Todo valor numérico en pantalla lleva su moneda explícita. Ningún número aparece solo.

---

## Estructura de archivos
```
patrimonio/
├── index.html
├── CLAUDE.md
├── ARCHITECTURE.md
├── css/
│   └── main.css
└── js/
    ├── storage.js   → CRUD sobre localStorage
    ├── model.js     → lógica de negocio, validaciones, cálculos
    ├── ui.js        → DOM, formularios, renderizado
    └── main.js      → inicialización y coordinación
```

No crear archivos fuera de esta estructura sin consultarme.

---

## Responsabilidades de cada módulo

- `storage.js` no conoce el modelo de negocio. Solo lee y escribe.
- `model.js` no conoce el DOM. Solo opera sobre datos.
- `ui.js` no accede a `localStorage` directamente. Siempre pasa por `storage.js`.
- `main.js` coordina, no implementa lógica propia.

---

## Stack

- HTML, CSS y JavaScript puro. Sin frameworks.
- Sin librerías de UI (no Bootstrap, no Tailwind).
- Única excepción permitida: Chart.js desde CDN para el gráfico histórico.

---

## Criterios de código

- Nombres de funciones y variables en inglés.
- Comentarios en español cuando aporten algo no obvio.
- Funciones cortas y con responsabilidad única.
- Sin efectos secundarios en `model.js`.

---

## Criterios de diseño visual

- Interfaz utilitaria: los datos son el centro, no el diseño.
- Sin gráficos de torta, sin paletas festivas, sin estética fintech.
- Tipografía legible, alto contraste, un solo color de acento funcional.

---

## Cómo trabajar conmigo

- Si algo del modelo es ambiguo, preguntá antes de asumir.
- Si vas a tomar una decisión de arquitectura que no está documentada acá, avisame primero.
- No "mejores" funcionalidades por iniciativa propia. Implementá lo que está definido.
- Si encontrás algo roto o inconsistente, señalalo antes de corregirlo.