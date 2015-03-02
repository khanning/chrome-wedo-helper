var server = null;
var wedo = null;
var sender = null;
var win = null;

var exit = function() {
  clearInterval(sender);
  wedo.stop();
  server.close();
};

var init = function(w) {
  win = w;
  wedo = new WeDo();
  wedo.addListener('connect', function() {
    sendMessage({type:'wedo', conn:true});
  });
  wedo.addListener('disconnect', function() {
    sendMessage({type:'wedo', conn:false});
  });
  wedo.start();

  server = new WebSocketServer('127.0.0.1', 8080);
  server.addListener('connect', function() {
    sendMessage({type:'scratch', conn:true});
  });
  server.addListener('disconnect', function() {
    sendMessage({type:'scratch', conn:false});
  });
  server.addListener('receive', function(buffer) {
    if (wedo.connected) wedo.write(buffer);
  });
  server.start();
  
  sender = setInterval(sendData, 50);

  win.onClosed.addListener(function() {
    setTimeout(exit, 10)
  });
};

var sendMessage = function(msg) {
  chrome.runtime.sendMessage(msg, function() {});
};

var sendData = function() {
  if (!server.connected || !wedo.connected) return;
  var rawData = wedo.read();
  if (!rawData) return;
  var input = new Uint8Array(rawData);
  var i = 0;
  // Convert data to string before sending
  // since chrome.sockets.tcp.send transmits 
  // a DOMString instead of an ArrayBuffer
  var str = input[i++];
  while (i<input.length)
    str += ',' + input[i++];
  server.sendMessage(str);
};

chrome.app.runtime.onLaunched.addListener(function() {
  if (win && !win.contentWindow.closed) {
    win.focus();
  } else {
    chrome.app.window.create('window.html', {
      'innerBounds': {
        'width': 350,
        'height': 175,
      }
    }, init);
  }
});
