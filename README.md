# MJPEG/JPEG Client for JavaScript

Client to provide authenticated MJPEG streams / JPEG snapshot, enabling the continuous request of new frames, emulating the playback of a stream.

> Yes, I know this is just a hack to allow the work to get done. The appropriate way would be to connect via TCP to the endpoint and parse the response, extracting the frames and decoding them sequentially, but via the browser isn't possible to manage socket connection (i'm not talking about WebSockets). AFAIK Chrome [have an API for this situation](https://developer.chrome.com/docs/extensions/reference/sockets_tcp/) (_deprecated by the way_).

Using the standard **<img>** tag, we are unable to include authentication (_e.g. http://user:pass@ip:port/path.mjpg_), if necessary, due to browser limitations.

To solve this problem, [we improving JPEG client](https://github.com/daleffe/js-jpegclient), allowing authenticated MJPEG streams and cameras that only have the snapshot feature (_without MJPEG stream availability_) to be transmitted using sequential requests.

## How to use

Add the *mjpeg.js* script to your HTML page:
```html
<script src="mjpeg.js"></script>
```

Create the player and set connection parameters/events you want to control:
```javascript
var player = new MJPEG.Player("player", "http://<address>:<port>/<path>", "<username>", "<password>", {onError:  onErr, onStart: onStarted, onStop: onStopped});
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
var player = new MJPEG.Player("player", "http://<address>:<port>/<path>", "<username>", "<password>", {onError:  onErr, onStart: onStarted, onStop: onStopped});
player.start();
```

### **stop()**
Stop sequential capture or abort current connection:
```javascript
var player = new MJPEG.Player("player", "http://<address>:<port>/<path>", "<username>", "<password>", {onError:  onErr, onStart: onStarted, onStop: onStopped});
player.stop();
```

### **snapshot()**
Take snapshot (_not available for MJPEG streams_):
```javascript
var player = new MJPEG.Player("player", "http://<address>:<port>/<path>", "<username>", "<password>", {onError:  onErr, onStart: onStarted, onStop: onStopped});
player.snapshot();
```

## Events
Events are assigned upon object creation:
* **onStart**
* **onStop**
* **onError**(_JSON_)
  * _JSON_: Displays the returned status code and request body text.

```javascript
function onErr(text) {
  console.error(text);
  player.stop();
}

function onStarted() {
  console.log('Started');
}

function onStopped() {
  console.warn('Stopped');
}
```