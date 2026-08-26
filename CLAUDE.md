# MG Experiences — notas para Claude Code

Sitio de una sola página en HTML/CSS/JS plano, sin build ni dependencias.
GitHub Pages sirve `main` tal cual en https://mg-experiences.com, así que
un push a `main` es un deploy.

Leé `CONTRIBUTING.md` para la estructura de archivos y la convención de
commits (obligatoria: hay un hook en `.githooks/commit-msg` que la valida).

## Cosas que se rompen fácil

- **Orden de los `<script>`.** Están sin `defer` ni `async` y en posiciones
  puntuales del `<body>`, no agrupados al final. Varios corren en top level
  y buscan nodos que están arriba de ellos en el documento. No los muevas
  ni les agregues `defer` sin verificar.
- **Orden de los `<link>` del `<head>`.** Define la cascada.
- **`url()` en CSS** resuelve contra `css/`, no contra el documento: las
  imágenes van como `../img/...`. En JS es al revés, resuelve contra el
  documento: `img/...`.
- **Finales de línea CRLF** en todo el repo, fijados en `.gitattributes`.
  Si escribís un archivo con LF, el diff se vuelve ilegible.
- **El Meta Pixel queda inline** en `index.html` a propósito: moverlo a un
  `.js` propio lo expone a que lo bloqueen las listas de filtros.

## Verificar un cambio

No hay tests. Levantá `python3 -m http.server 8000` y mirá el sitio en
desktop y en ~390 px de ancho, con la consola abierta. Errores de red hacia
`connect.facebook.net`, `script.google.com` o `docs.google.com` pueden ser
normales; errores de JavaScript propios no.

Para cambios de CSS o de estructura, comparar capturas antes/después con
las animaciones ya asentadas es la forma más rápida de confirmar que no se
movió nada.

## Datos externos

- El tarifario y el catálogo de villas se leen de un CSV público de Google
  Sheets (`js/tarifario.js`): cambiar precios se hace en la planilla, no acá.
- La verificación por código va contra un Google Apps Script por JSONP
  (`js/verificacion.js`), porque Apps Script redirige a un host sin CORS.
