/* Service worker de "Se me fue": instalable, offline y notificaciones en segundo plano. */
var CACHE = "nodori-v8";
var ASSETS = ["./", "index.html", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Red primero (siempre fresco); si no hay conexión, tira de caché. */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { try { c.put(e.request, copy); } catch (err) {} });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) { return hit || caches.match("index.html"); });
    })
  );
});

/* Recibe el push del servidor y muestra la notificación (funciona con la app cerrada / móvil bloqueado). */
self.addEventListener("push", function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { body: (e.data && e.data.text()) || "Recuerda" }; }
  e.waitUntil(self.registration.showNotification(data.title || "💭 Se me fue", {
    body: data.body || "", icon: "icon.svg", badge: "icon.svg",
    requireInteraction: true, tag: data.tag || ("push-" + Date.now()), vibrate: [250, 120, 250]
  }));
});

/* Al tocar la notificación: enfoca la app (o la abre) y le pide reproducir el audio. */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var id = e.notification.data && e.notification.data.id;
  e.waitUntil((async function () {
    var all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (all.length) {
      var c = all[0];
      try { await c.focus(); } catch (err) {}
      c.postMessage({ type: "show", id: id });
    } else {
      await self.clients.openWindow("./");
    }
  })());
});
