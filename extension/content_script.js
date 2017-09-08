
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
  chrome.runtime.sendMessage(null, {type:'activate'});
});

window.addEventListener('unload', function() {
  chrome.runtime.sendMessage(null, {type:'disactivate'});
});

