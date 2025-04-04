const CACHE_NAME = 'subtitle-translator-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// نصب سرویس ورکر و ذخیره‌سازی فایل‌های مورد نیاز
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('کش‌های مورد نیاز باز شدند');
        return cache.addAll(urlsToCache);
      })
  );
});

// استراتژی کش: ابتدا کش، سپس شبکه
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // اگر در کش موجود باشد، از کش برگردان
        if (response) {
          return response;
        }
        
        // در غیر این صورت، درخواست را به شبکه ارسال کن
        return fetch(event.request)
          .then(response => {
            // اگر پاسخ معتبر نیست، آن را برگردان
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // کپی پاسخ برای ذخیره در کش
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(() => {
            // اگر آفلاین باشیم، صفحه اصلی را برگردان
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// به‌روزرسانی کش هنگام نصب نسخه جدید
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});