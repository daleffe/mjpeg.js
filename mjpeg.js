var MJPEG = (function (module) {
    "use strict";

    module.Stream = function (args) {
        var self = this;

        self.controller = undefined;

        self.url = new URL(args.url);
        self.cors = args.cors || 'cors';

        self.username = args.username || '';
        self.password = args.password || '';
        self.token = args.token || '';

        self.onStart = args.onStart || null;
        self.onStop = args.onStop || null;
        self.onError = args.onError || null;

        self.setFrame = args.setFrame || null;

        self.running = false;

        self.timeout = args.timeout || 20000;
        self.connectionTimer = 0;

        self.refreshInterval = args.refreshInterval || 500;
        self.refreshTimer = 0;

        async function getFrame(isSnapshot = false) {
            clearInterval(self.connTimer);
            clearInterval(self.refreshTimer);

            self.controller = new AbortController();

            const options = { method: 'GET', mode: self.cors, cache: 'no-store', 'signal': self.controller.signal }

            if ((typeof self.token === "string" || self.token instanceof String) || ((typeof self.username === "string" || self.username instanceof String) && (typeof self.password === "string" || self.password instanceof String))) {
                options.headers = new Headers({ Authorization: ((self.username.length > 0 && self.password.length > 0) ? "Basic " + btoa(self.username + ':' + self.password) : "Bearer " + self.token) });
            }

            if (self.timeout > 0) self.connectionTimer = setTimeout(() => { if (self.controller) self.controller.abort(); }, self.timeout);

            fetch(self.url.href, options).then(async (response) => {
                if (response.ok) {
                    if (response.body) {
                        clearInterval(self.connectionTimer);

                        const contentType = response.headers.get('content-type');

                        if (contentType == null) {
                            self.onError(response.status, JSON.stringify({ 'code': 0 }));
                        } else if (contentType.startsWith('text/plain') || contentType.includes('xml') || contentType.includes('json') || contentType.includes('html')) {
                            self.onError(response.status, JSON.stringify({ 'code': 1, 'contentType': contentType, 'message': await response.text() }));
                        } else if (contentType.startsWith('image')) {
                            self.setFrame(await response.blob());

                            if (!isSnapshot && self.refreshInterval > 0) self.refreshTimer = setInterval(getFrame, self.refreshInterval);
                        } else if (contentType.startsWith('multipart/x-mixed-replace;')) {
                            let headers = '';
                            let data = null;

                            let partType = "";
                            let partLen = -1;
                            let readed = 0;

                            const reader = response.body.getReader();
                            const read = () => {
                                reader.read().then(({ done, value }) => {
                                    if (done) return;

                                    for (let index = 0; index < value.length; index++) {
                                        // we've found start of the frame. Everything we've read till now is the header.
                                        if (value[index] === 0xFF && value[index + 1] === 0xD8) {
                                            headers.split('\n').forEach((header, _) => {
                                                const pair = header.trim().split(':');
                                                // Fix for issue https://github.com/aruntj/mjpeg-readable-stream/issues/3 suggested by martapanc
                                                if (pair[0].toLowerCase() === "content-length") {
                                                    partLen = pair[1].trim();
                                                    data = new Uint8Array(new ArrayBuffer(partLen));
                                                }
                                                if (pair[0].toLowerCase() == "content-type") partType = pair[1].trim();
                                            });
                                        }

                                        // we're still reading the header.
                                        if (partLen <= 0) {
                                            headers += String.fromCharCode(value[index]);
                                        } else if (readed < partLen) {
                                            // we're now reading the jpeg.
                                            if (data) data[readed++] = value[index];
                                        } else {
                                            // we're done reading, time to render it.
                                            const file = new Blob([data], { type: partType });

                                            if (file.type.startsWith('image')) {
                                                readed = 0;
                                                partLen = 0;
                                                partType = '';
                                                headers = '';

                                                self.setFrame(file);

                                                if (isSnapshot) return;
                                            } else {
                                                self.onError(response.status, JSON.stringify({ 'code': 99, 'type': file.type, 'size': file.size }));
                                                return;
                                            }
                                        }
                                    }

                                    read();
                                }).catch(error => {
                                    if (error.name !== "AbortError") {
                                        console.warn("Stream read error", error);
                                        self.onError(response.status, JSON.stringify({ 'code': 98, 'message': error.message, 'name': error.name }));
                                    }
                                });
                            }

                            read();
                        }
                    } else { self.onError(response.status); }
                } else { self.onError(response.status); }
            }).catch(error => {
                self.onError(-1, JSON.stringify({ 'code': -1, 'message': error.message, 'name': error.name }));
            }).finally(() => clearInterval(self.connectionTimer));
        }

        function takeSnapshot() {
            getFrame(true);
        }

        function setRunning(running) {
            self.running = running;

            if (self.running) {
                if (self.onStart) self.onStart();

                getFrame();
            } else {
                if (self.onStop) self.onStop();

                clearInterval(self.refreshTimer);
                clearInterval(self.connectionTimer);

                if (self.controller) self.controller.abort();
            }
        }

        self.snapshot = function () { takeSnapshot(); }
        self.start = function () { setRunning(true); }
        self.stop = function () { setRunning(false); }
    };

    module.Player = function (container, url, username, password, options) {
        var self = this;

        function updateFrame(data) {
            if (onFrame) onFrame(data);

            if (container) {
                const frame = URL.createObjectURL(data);
                container.src = frame;

                window.setTimeout(() => { URL.revokeObjectURL(frame); }, 1000);
            }
        }

        if (typeof container === "string" || container instanceof String) {
            container = window.document.getElementById(container);
        }

        if ((container instanceof Image) == false) {
            console.error("The container must be a <img> element");
            return new Error("<img> element required");
        }

        if (!options) options = {};

        options.url = url;
        options.username = username || undefined;
        options.password = password || undefined;

        options.setFrame = updateFrame;
        const onFrame = (typeof options.onFrame !== 'function') ? null : options.onFrame;
        if (container.onload == undefined || container.onload == null) container.onload = (typeof options.onLoad !== 'function') ? undefined : options.onLoad;

        if (typeof options.onError !== 'function') options.onError = null;
        if (typeof options.onStart !== 'function') options.onStart = null;
        if (typeof options.onStop !== 'function') options.onStop = null;

        self.stream = new module.Stream(options);

        self.start = function () { self.stream.start(); }
        self.stop = function () { self.stream.stop(); }
        self.snapshot = function () { self.stream.snapshot(); }
    };

    return module;
})(MJPEG || {});