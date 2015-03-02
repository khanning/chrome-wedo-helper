function WebSocketServer(i,p) {

  var self = this;
  var server = chrome.sockets.tcpServer;
  var ip = i;
  var port = p;
  var clientId = null;
  var serverId = null;
  var eventList = {};
  self.connected = false;

  self.start = function() {
    server.create({}, onConnect);
  };

  self.sendMessage = function(str) {
    if (!clientId) return;
    var array = new Uint8Array(str.length+2);
    array[0] = 0x81;
    array[1] = str.length;
    for (var i=0; i<str.length; i++)
      array[i+2] = str.charCodeAt(i);
    send(clientId, array);
  };

  self.close = function() {
    if (serverId) {
      server.close(serverId);
      server.onAccept.removeListener(onAccept);
      server.onAcceptError.removeListener(onAcceptError);
    }
    if (clientId) {
      chrome.sockets.tcp.close(clientId);
      console.log('removing receive listener');
      chrome.sockets.tcp.onReceive.removeListener(onReceive);
    }
  };

  self.addListener = function(name, callback) {
    if (!eventList[name])
      eventList[name] = [];
    eventList[name].push(callback);
  };

  self.removeListener = function(name, callback) {
    if (!eventList[name]) return;
    var idx = eventList[name].indexOf(callback);
    if (idx > -1) eventList[name].splice(idx, 1);
  };

  self.emit = function(name, object) {
    if (!eventList[name]) return;
    for (var i=0; i<eventList[name].length; i++)
      eventList[name][i](object);
  };

  var onConnect = function(info) {
    server.listen(info.socketId, ip, port, function(resultCode) {
      console.log('WebSocket Server listening');
      if (resultCode > 0) {
        console.log('Error listening:', chrome.runtime.lastError.message);
        return;
      }
      serverId = info.socketId;
      server.onAccept.addListener(onAccept);
      server.onAcceptError.addListener(onAcceptError);
    });
  };

  var onAccept = function(info) {
    console.log('Accepted connection from:', info.clientSocketId);
    if (info.socketId != serverId)
      return;
    clientId = info.clientSocketId;
    chrome.sockets.tcp.onReceive.addListener(onReceive);
    chrome.sockets.tcp.setPaused(info.clientSocketId, false);
  };

  var onAcceptError = function(error) {
    console.log('Error accepting connection');
  };

  var onReceive = function(recvInfo) {
    if (recvInfo.socketId != clientId)
      return;
    parseData(recvInfo);
  };

  var getAcceptKey = function(key) {
    var hash = CryptoJS.SHA1(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
    var acceptKey = CryptoJS.enc.Base64.stringify(hash);
    return acceptKey;
  };

  var send = function(id, data) {
    chrome.sockets.tcp.send(id, data.buffer, function(){});
  };

  var str2array = function(str) {
    var array = new Uint8Array(str.length);
    for (var i=0; i<str.length; i++)
      array[i] = str.charCodeAt(i);
    return array;
  };

  var parseData = function(info) {
    var data = new Uint8Array(info.data);
    if (data[0] == 0x47) {

      var input = String.fromCharCode.apply(null, new Uint8Array(info.data));
      var lines = input.split('\n');
      for (var i=0; i<lines.length; i++) {
        if (lines[i].indexOf('Sec-WebSocket-Key') > -1) {

          var key = lines[i].split(' ')[1];
          key = key.substring(0, key.length-1);

          var response = 'HTTP/1.1 101 Switching Protocols\r\n';
          response += 'Upgrade: websocket\r\n';
          response += 'Connection: Upgrade\r\n';
          response += 'Sec-WebSocket-Accept: ' + getAcceptKey(key) + '\r\n\r\n';
          send(info.socketId, str2array(response));
          self.connected = true;
          self.emit('connect', {});
          server.onAccept.removeListener(onAccept);
        }
      }

    } else if (data[0] == 0x82) {

      var len = data[1] & 127;
      var masks = new Uint8Array(4);
      for (var i=0; i<4; i++)
        masks[i] = data[2+i];
      var decoded = new Uint8Array(len);
      var j = 6;
      for (var i=0; j<data.length; i++)
        decoded[i] = data[j++] ^ masks[i % 4];
      self.emit('receive', decoded.buffer);
    
    } else if (data[0] == 0x88) {

      self.connected = false;
      clientId = null;
      chrome.sockets.tcp.onReceive.removeListener(onReceive);
      server.onAccept.addListener(onAccept);
      self.emit('disconnect', {});

    }
  };
}
