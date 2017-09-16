let activeTabIds = new Set();

// "Storage" for setting when local storage is not available.
let ephemerealSetting = null;

// Connection to webpages.
let pageConnectionManager = (function() {
  let activeConnections = [];

  function connectListener(port) {
    if (port.name == 'content') {
      activeConnections.push(port);
      port.onDisconnect.addListener(unregisterPort);
      sendInit(port);
    } else {
      port.disconnect(); // Unknown port.
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
chrome.runtime.onConnect
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

      if (message.type == 'setting_updated') {
        saveSetting(message.setting);
        pageConnectionManager.postMessage(message);
      }

      if (message.type == 'fetch_setting') {
        let setting = loadSetting();
        if (message.caller == 'popup') {
          incrementPopupCounter();
        } else {
          if (setting.inch === undefined) {
            // inch not set. Let's default it. inch = true
            // for google.com, false otherwise.
            setting.inch = !!sender.url.match(/google.com\//);
            saveSetting(setting);
          }
        }
        responseFn(setting);
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


function setupDefaultSetting() {
  if (!window.localStorage) {
    // Local storage unsupported. Ephemereal state then.
    ephemerealSetting = getDefaultSetting();
    return;
  }
  let storedSetting = loadSetting();
  if (storedSetting) {
    if (storedSetting.version == 1) {
      return; // Latest. Do nothing.
    }
  }
  saveSetting(getDefaultSetting());
}
chrome.runtime.onInstalled.addListener(setupDefaultSetting);
chrome.runtime.onStartup.addListener(setupDefaultSetting);

function getDefaultSetting() {
  // inch is omitted so it will be filled in later.
  return {
    version: 1,
    legroom: true,
    carryon: true,
    aircraft: false,
    wifi: false,
    power: false
  };
}

function loadSetting() {
  if (window.localStorage) {
    try {
      return JSON.parse(window.localStorage.getItem('setting'));
    } catch (e) {
      // Bad setting or non-JSON. Just replace it.
      return null;
    }
  }
  // Local storage unsupported. Ephemereal state then.
  if (!ephemerealSetting) {
    ephemerealSetting = getDefaultSetting();
  }
  return ephemerealSetting;
}

function saveSetting(newSetting) {
  if (window.localStorage) {
    window.localStorage.setItem('setting', JSON.stringify(newSetting));
    return;
  }
  // Local storage unsupported. Ephemereal state then.
  ephemerealSetting = newSetting;
}

function sendInit(port) {
  port.postMessage({ type: 'setting_updated', setting: loadSetting() });
}

function incrementPopupCounter() {
  let count = window.localStorage.getItem('popup_counter') || 0;
  count = Number(count) || 0;
  count = count + 1;
  window.localStorage.setItem('popup_counter', count);
}

