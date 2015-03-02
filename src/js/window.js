var scratchIndicator = null;
var wedoIndicator = null;

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.conn) var indicator = 'res/ext-status-green.png';
    else var indicator = 'res/ext-status-yellow.png';
    
    if (request.type == 'wedo')
      wedoIndicator.src = indicator;
    else if (request.type == 'scratch')
      scratchIndicator.src = indicator;
});

var init = function() {
  
  scratchIndicator = document.getElementById('scratch-indicator');
  wedoIndicator = document.getElementById('wedo-indicator');

  var helpButton = document.getElementById('help-button');
  helpButton.onclick = function() {
    window.open('http://github.com/khanning/chrome-wedo-helper');
    helpButton.disabled = true;
    setTimeout(function() {
      helpButton.disabled = false;
    }, 2000);
  };

  var exitButton = document.getElementById('exit-button');
  exitButton.onclick = function() {
    window.close();
  };

};

window.onload = init;
