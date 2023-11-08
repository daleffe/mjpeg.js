# MJPEG/JPEG client for JavaScript

Client to provide authenticated MJPEG/JPEG streams and snapshot.

The **<img>** tag are unable to do authentication (_e.g. http://user:pass@ip:port/path.mjpg_) due to browser limitations.

Inspired by [this project](https://github.com/aruntj/mjpeg-readable-stream) [we improve JPEG client](https://github.com/daleffe/jpeg.js),allowing authenticated MJPEG streams and enabling continuous request of new frames, emulating stream playback for cameras that only have snapshot feature.

## How to use

Add the *mjpeg.js* script to your HTML page:
```html
<script src="mjpeg.js"></script>
```

Create the player and set connection parameters/events as needed:
```javascript
var player = new MJPEG.Player("player", "http://<address>:<port>/<path>", "<username>", "<password>", {onError:  onErr, onStart: onStarted, onStop: onStopped, onFrame: onFrame, onLoad: onLoad});
```
Parameters available:
1. container element
2. URL
3. Username (_optional_)
4. Password (_optional_)
5. Options
* Timeout (_in ms_)
* Refresh Rate
* Events (_see below_)

## Methods
* _start()_
* _stop()_
* _snapshot()_

### **start()**
Start sequential capture, if the content is a static JPEG image, or perform authentication and play MJPEG stream:
```javascript
var player = new MJPEG.Player("player", "http://<address>:<port>/<path>", "<username>", "<password>", {onStart: onStarted});
player.start();
```

### **stop()**
Stop sequential capture or abort current connection:
```javascript
var player = new MJPEG.Player("player", "http://<address>:<port>/<path>", "<username>", "<password>", {onStop: onStopped});
player.stop();
```

### **snapshot()**
Take snapshot (_unavailable for MJPEG streams_):
```javascript
var player = new MJPEG.Player("player", "http://<address>:<port>/<path>", "<username>", "<password>", {onError:  onErr, onStart: onStarted, onStop: onStopped});
player.snapshot();
```

## Events
Events are assigned at object creation:
* **onStart**
* **onStop**
* **onError**(_status code_, _payload_)
  * _status code_: Response / arbitrary status codes;
  * _payload_: Displays detailed error message.
* **onFrame**
  * _raw frame_: Raw blob data.
* **onLoad**
  * _event_: Triggered by ***<img>*** onload.

```javascript
function onErr(status, payload) {
  console.error(status);
  console.error(payload);

  player.stop();
}

function onStarted() {
  console.log('Started');
}

function onStopped() {
  console.warn('Stopped');
}

function onFrame(frame) {
  console.log('New frame',frame);
}

function onLoad(e) {
  e.preventDefault();
  e.stopPropagation();

  console.log('Image loaded',e);

  if (e.target instanceof Image) e.target.onload = undefined;
}
```