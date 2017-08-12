
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

function sendFocusMessage() {
  chrome.runtime.sendMessage(null, {type:'focus'});
}

function sendBlurMessage() {
  chrome.runtime.sendMessage(null, {type:'blur'});
}

window.addEventListener('focus', sendFocusMessage);
window.addEventListener('load', sendFocusMessage);

window.addEventListener('blur', sendBlurMessage);
window.addEventListener('unload', sendBlurMessage);

