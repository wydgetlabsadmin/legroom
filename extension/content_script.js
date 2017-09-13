
(function() {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL('inject_script.js');
  (document.head || document.documentElement).appendChild(s);
})();

(function() {
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = chrome.runtime.getURL('inject_style.css');
  (document.head || document.documentElement).appendChild(l);
})();

// Pass in chrome extension ID.
(function() {
  let sharedElem = document.body.querySelector('.' + chrome.runtime.id);
  sharedElem = document.createElement('div');
  sharedElem.classList.add('shared-elem');
  sharedElem.textContent = chrome.runtime.id;
  document.body.append(sharedElem);
})();

window.addEventListener('load', function() {
  chrome.runtime.sendMessage(
      chrome.runtime.id, { type:'activate' });
});

window.addEventListener('unload', function() {
  chrome.runtime.sendMessage(
      chrome.runtime.id, { type:'disactivate' });
});

window.addEventListener('message', function(messageEvent) {
  let message = messageEvent.data;
  if (message.type == 'legroom_setting') {
    if (message.action == 'fetch') {
      fetchSettingAndInject();
    }
  }
});

// Listen to events from extension.
function setupExtensionConnection() {
  let port = chrome.runtime.connect({ name: 'content' });
  port.onMessage.addListener(function(message) {
    if (message.type == 'setting_updated') {
      injectSetting(message.setting);
    }
  });
  port.onDisconnect.addListener(function() {
    // Reopen again.
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError);
    } else {
      window.setTimeout(setupExtensionConnection, 500);
    }
  });
}
setupExtensionConnection();

function fetchSettingAndInject() {
  chrome.runtime.sendMessage(
      chrome.runtime.id, { type: 'fetch_setting', caller: 'content' },
      injectSetting);
}

function injectSetting(setting) {
  window.postMessage(
      { type: 'legroom_setting', action: 'setting', setting: setting },
      window.origin);
}

