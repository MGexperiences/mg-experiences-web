# Cómo trabajar en este repo

Sitio de una sola página para MG Experiences. Es HTML/CSS/JS plano, sin
build ni dependencias: lo que está en `main` es exactamente lo que se
publica en https://mg-experiences.com vía GitHub Pages.

## Estructura

```
index.html                markup + el snippet del Meta Pixel (inline a propósito)
css/main.css              estilos generales
css/gate.css              modal de verificación
css/lightbox.css          lightbox de galería
css/floating-cta.css      botón flotante de presupuesto
js/ui-interactions.js     nav, reveal, contadores, parallax, carruseles
js/tarifario.js           tarifario, catálogo de villas, calendario, tracking
js/configurador.js        estado y pasos del configurador de presupuesto
js/verificacion.js        gate de verificación + Apps Script (JSONP)
js/resort-zones.js        datos de las zonas del resort
js/lightbox.js            lightbox de galería
js/asistente-drawer.js    drawer del asistente virtual
js/villa-gallery.js       galería fullscreen de villas
js/reviews-carousel.js    carrusel de reseñas
js/floating-cta.js        visibilidad del botón flotante
img/                      imágenes propias
CNAME                     dominio del sitio en GitHub Pages
```

Dos cosas del orden de carga que conviene no romper:

- Los cuatro `<link>` del `<head>` van en ese orden porque así queda la
  cascada. Si agregás un CSS nuevo, pensá dónde entra.
- Los `<script>` están **sin `defer` ni `async`** y en posiciones puntuales
  del `<body>`, no todos juntos al final. Varios corren en top level y
  buscan nodos del DOM que están arriba de ellos. Mover un `<script>` de
  lugar o agregarle `defer` cambia cuándo corre y puede romperlo.

## Ver el sitio local

No alcanza con abrir `index.html` con doble clic: en `file://` los
`fetch()` y algunos recursos fallan. Levantá un servidor:

```sh
python3 -m http.server 8000
# después: http://localhost:8000
```

Antes de dar por bueno un cambio, mirá la consola del navegador. Errores
de red hacia `connect.facebook.net`, `script.google.com` o
`docs.google.com` pueden ser normales si estás sin conexión o con un
bloqueador; errores de JavaScript propios no.

Probá siempre en desktop y en móvil (DevTools, ~390 px de ancho). Buena
parte del tráfico llega desde Instagram y WhatsApp, o sea desde el celular.

## Mensajes de commit

Formato:

```
<tipo>(<alcance opcional>): <resumen en imperativo, minúscula, sin punto final>

Cuerpo opcional a 72 columnas: qué cambió y por qué. El cómo está en el diff.
Si lo verificaste de alguna forma, decilo.
```

Tipos: `feat` `fix` `a11y` `perf` `seo` `content` `style` `refactor`
`build` `docs` `chore`.

Alcances habituales: `configurador`, `verificacion`, `tarifario`,
`lightbox`, `galeria`, `nav`, `reviews`, `asistente`, `hero`, `seo`,
`deploy`.

Sí:

```
fix(configurador): no permitir salida anterior a la entrada
content(tarifario): actualizar precios de embarcaciones a junio 2026
perf(hero): servir la imagen del hero desde img/ en vez de wsimg.com
```

No: `Update index.html`, `cambios varios`, `arreglos`.

El motivo no es estético. Cuando dentro de seis meses algo del
configurador se rompa, `git log --oneline js/configurador.js` te tiene
que contar la historia sin que abras un solo diff.

## Configurar el clon (una vez)

```sh
git config core.hooksPath .githooks     # valida el formato del commit
git config commit.template .gitmessage  # abre el editor con la guía
```

El hook rechaza mensajes fuera de formato y explica por qué. Para saltearlo
en un caso puntual: `git commit --no-verify`.

## Ramas y deploy

`main` es lo que está publicado: un push a `main` es un deploy. Trabajá en
una rama y abrí un PR, aunque sea de una línea — así queda el registro de
por qué se hizo el cambio.

```sh
git checkout -b fix/calendario-fechas
# ... cambios ...
git push -u origin fix/calendario-fechas
```
