const CACHE_NAME = 'bendit-cache-v4';

// 1. При первой загрузке сохраняем основные файлы в память телефона
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll([
                './',
                './index.html',
                './manifest.json'
            ]);
        })
    );
    self.skipWaiting();
});

// 2. Активация и удаление старого кэша (если потом будешь обновлять аппку)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    event.waitUntil(self.clients.claim());
});

// 3. Перехват запросов (если нет интернета - отдаем из памяти)
self.addEventListener('fetch', event => {
    // Игнорируем гугл-аналитику и базу данных (им кэш не нужен)
    if (event.request.url.includes('google-analytics') || 
        event.request.url.includes('googletagmanager') || 
        event.request.url.includes('script.google.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Если нашли картинку или страницу в памяти — отдаем мгновенно
            if (cachedResponse) {
                return cachedResponse;
            }

            // Если в памяти нет — качаем из интернета и заодно сохраняем на будущее
            return fetch(event.request).then(networkResponse => {
                // Если ответ с ошибкой, просто возвращаем как есть
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                    return networkResponse;
                }

                // Сохраняем скачанный файл (например, фотку гайда) в память
                let responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                console.log('Нет интернета, и файла нет в кэше');
            });
        })
    );
});
