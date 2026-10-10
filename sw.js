const CACHE_NAME = 'tasbeeh-pro-v1';

// قائمة الملفات الأساسية للتخزين المؤقت
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// مرحلة التثبيت: حفظ الملفات في الكاش فوراً
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// مرحلة التنشيط: حذف النسخ القديمة للكاش عند تحديث الإصدار
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// اعتراض الطلبات وتوفير تجربة Offline كاملة
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // إذا كان الطلب لواجهة برمجة خارجية (مثل مواقيت الصلاة AlAdhan API)
  if (requestUrl.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // للملفات الداخلية: البحث في الكاش أولاً، ثم جلبها من الشبكة
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => {
      // إرجاع الصفحة الرئيسية إذا انقطع الاتصال ولم يوجد مسار محدد
      if (event.request.headers.get('accept').includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});
