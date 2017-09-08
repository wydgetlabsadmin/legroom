let activeTabIds = new Set();

// Connection to webpages.
let pageConnectionManager = (function() {
  let activeConnections = [];

  function connectListener(port) {
    if (port.name == 'injected') {
      activeConnections.push(port);
      port.onDisconnect.addListener(unregisterPort);
    } else {
      port.disconnect();
    }
  }

  function unregisterPort(port) {
    for (let i = activeConnections.length - 1; i >= 0; i--) {
      if (activeConnections[i] === port) {
        activeConnections.splice(i, 1);
      }
    }
  }

  /* Send to all active connections. */
  function postMessage(message) {
    activeConnections.forEach(function(port) {
      port.postMessage(message);
    });
  }

  return {
    postMessage: postMessage,
    connectListener: connectListener
  };
})();
chrome.runtime.onConnectExternal
    .addListener(pageConnectionManager.connectListener);


chrome.runtime.onMessage.addListener(
    function(message, sender, responseFn) {
      if (!message.type) {
        return; // No type. Probably not our message.
      }
      if (message.type == 'activate') {
        activeTabIds.add(sender.tab.id);
        chrome.browserAction.setIcon({
          tabId: sender.tab.id,
          path: {
            '16':'seat_16.png',
            '48':'seat_48.png',
            '128':'seat_128.png'
          }
        });
      }
      if (message.type == 'disactivate') {
        activeTabIds.delete(sender.tab.id);
        chrome.browserAction.setIcon({
          tabId: sender.tab.id,
          path: {
            '16':'seat_16_grey.png',
            '48':'seat_48_grey.png',
            '128':'seat_128_grey.png'
          }
        });
      }

      if (message.type == 'is_active' && message.tab_id) {
        responseFn(activeTabIds.has(message.tab_id));
      }

      if (message.type == 'settings_updated') {
        pageConnectionManager.postMessage(message);
      }
    });


/**
 * Generates a unique ID and store it in local storage.
 * @return {string} unique ID for this installation.
 */
function generateUniqueId() {
  if (!window.localStorage) {
    return; // Local storage unsupported. Do nothing.
  }
  let existingId = window.localStorage.getItem('installId');
  if (existingId) {
    return existingId; // Exist. Return it.
  }
  let uniqueId = ((new Date()).getTime()).toString(32) +
      Math.round(Math.random() * 1e6).toString(32);
  window.localStorage.setItem('installId', uniqueId);
  return uniqueId;
}
chrome.runtime.onInstalled.addListener(generateUniqueId);
chrome.runtime.onStartup.addListener(generateUniqueId);


