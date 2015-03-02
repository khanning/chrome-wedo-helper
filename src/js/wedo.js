var WeDo = function() {
  
  var WEDO = { vendorId: 1684, productId: 3 };

  var self = this;
  var poller = null;
  var connId = null;
  var deviceId = null;
  var rawData = null;
  var eventList = {};

  // Temporary workaround since onDeviceAdded/Removed is missing
  // from the chrome.hid API in the stable branch
  var lastRead = null;

  self.connected = false;
  
  self.start = function() {
    poller = setInterval(function() {
      if (self.connected) return;
      chrome.hid.getDevices(WEDO, function(devices) {
        if (devices && devices.length > 0) {
          clearInterval(poller);
          connect(devices[0].deviceId);
        }
      });
    }, 500);
  };

  self.stop = function() {
    clearInterval(poller);
    poller = null;
    if (connId) {
      chrome.hid.disconnect(connId, function(){});
    }
    self.connected = false;
    connId = null;
    deviceId = null;
  };

  self.read = function() {
    return rawData;
  };

  self.write = function(buffer) {
    chrome.hid.send(connId, 0, buffer, function(){});
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

  self.emit = function(name) {
    if (!eventList[name]) return;
    for (var i=0; i<eventList[name].length; i++)
      eventList[name][i]();
  };

  var connect = function(id) {
    chrome.hid.connect(id, function(conn) {
      if (!conn.connectionId) return;
      self.emit('connect');
      deviceId = id;
      connId = conn.connectionId;
      self.connected = true;
      lastRead = Date.now();
      receiveData();
      poller = setInterval(checkDevice, 50);
    });
  };

  var receiveData = function() {
    if (!self.connected) return;
    chrome.hid.receive(connId, function(id, data) {
      rawData = data;
      lastRead = Date.now();
      receiveData();
    });
  };

  // Temporary workaround since onDeviceAdded/Removed is missing
  // from the chrome.hid API in the stable branch
  var checkDevice = function() {
    if (Date.now()-lastRead >= 500)
      deviceDisconnected();
  };
    
  var deviceDisconnected = function() {
    self.stop();
    self.emit('disconnect');
    self.start();
  }

};
