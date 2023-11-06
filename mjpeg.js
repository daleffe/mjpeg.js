var MJPEG = (function (module) {
    "use strict";

    module.Stream = function (args) {
        var self = this;

        self.url = args.url;
        self.username = args.username || '';
        self.password = args.password || '';

        self.onStart = args.onStart || null;
        self.onStop = args.onStop || null;
        self.onFrame = args.onFrame || null;
        self.onError = args.onError || null;

        self.refreshRate = args.refreshRate || 500;

        self.running = false;
        self.frameTimer = 0;

        self.img = new Image();
        self.img.alt = args.alt || '';
        self.img.title = args.title || '';
        self.imgClass = args.class || '';

        self.contentType = "";

        self.request = new XMLHttpRequest();
        self.request.responseType = 'arraybuffer';
        self.request.timeout = args.timeout || 20000;

        function getFrame(isSnapshot = false) {
            if (self.frameTimer != 0) clearInterval(self.frameTimer);

            if (self.imgClass.length > 0) if (!self.img.hasAttribute('class')) self.img.setAttribute('class', self.imgClass.trim());

            self.request.onreadystatechange = function () {
                if (self.request.readyState == self.request.LOADING || self.request.readyState == self.request.DONE) {
                    try {
                        if (self.request.status == 200) {
                            self.contentType = self.request.getResponseHeader('content-type').toLowerCase();

                            if (self.contentType.startsWith('multipart/x-mixed-replace;') && self.request.readyState == self.request.LOADING) {
                                self.img.src = isSnapshot ? '#' : self.url;
                                self.onFrame(self.img);

                                return self.request.abort();
                            } else if (self.contentType.startsWith('image/') && self.request.readyState == self.request.DONE) {
                                self.img.src = URL.createObjectURL(new Blob([self.request.response], { type: self.contentType }));
                                self.onFrame(self.img);

                                if (self.refreshRate > 0 && !isSnapshot) self.frameTimer = setInterval(getFrame, self.refreshRate);
                                return;
                            }
                        }

                        if (self.request.readyState == self.request.DONE) {
                            var charset = "utf-8";
                            var text = "";

                            if (self.contentType.length > 0) {
                                if (self.contentType.startsWith('multipart/x-mixed-replace;')) return;

                                self.contentType = self.contentType.split(';', 2).map(function (item) {
                                    return item.trim();
                                });

                                if (self.contentType[1] !== undefined) if (self.contentType[1].startsWith("charset=")) charset = self.contentType[1].replace("charset=", "");

                                if (self.contentType[0].includes("text") || self.contentType.includes("json") || self.contentType[1].includes("xml")) {
                                    text = new TextDecoder(charset).decode(self.request.response);
                                }
                            }

                            self.onError(JSON.stringify({ status: self.request.status, message: text }));
                        }
                    } catch (e) {
                        self.onError(JSON.stringify({ status: -1, message: JSON.stringify(e) }));
                    }
                }
            }

            try {
                self.request.open("GET", self.url, true);
                if ((typeof self.username === "string" || self.username instanceof String) && (typeof self.password === "string" || self.password instanceof String)) {
                    if (self.username.length > 0 && self.password.length > 0) self.request.setRequestHeader("Authorization", "Basic " + btoa(self.username + ':' + self.password));
                }
                self.request.send();
            } catch (e) {
                self.onError(JSON.stringify({ status: -2, message: JSON.stringify(e) }));
            }
        }

        function takeSnapshot() {
            getFrame(true);
        }

        function setRunning(running) {
            self.running = running;

            if (self.running) {
                if (self.onStart) self.onStart();

                if (self.frameTimer == 0) getFrame();
            } else {
                if (self.onStop) self.onStop();

                clearInterval(self.frameTimer);

                self.request.abort();

                self.img.src = "";
                self.img.alt = "";
                self.img.title = "";
            }
        }

        self.snapshot = function () { takeSnapshot(); }
        self.start = function () { setRunning(true); }
        self.stop = function () { setRunning(false); }
    };

    module.Player = function (container, url, username, password, options) {
        var self = this;

        function updateFrame(img) {
            if (container) {
                const el = container.getElementsByTagName('img');

                if (el.length == 0) {
                    container.append(img);
                } else { if (el[0].src != img.src) el[0].src = img.src; }
            }
        }

        if (typeof container === "string" || container instanceof String) {
            container = document.getElementById(container);
        }

        if (!options) options = {};

        options.url = url;
        options.username = username;
        options.password = password;

        options.onFrame = updateFrame;

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