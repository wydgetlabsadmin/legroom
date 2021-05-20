(function() {
  function insertScript(name) {
    var s = document.createElement('script');
    s.src = chrome.runtime.getURL(name);
    (document.head || document.documentElement).appendChild(s);
  }
  insertScript('flight_data.js');
  insertScript('inject_script_beta.js');
})();

(function() {
  function insertCss(name) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = chrome.runtime.getURL(name);
    (document.head || document.documentElement).appendChild(l);
  }
  insertCss('inject_style_beta.css');
})();

window.addEventListener('load', function() {
  chrome.runtime.sendMessage(
      chrome.runtime.id, { type:'activate' });
});

window.addEventListener('unload', function() {
  chrome.runtime.sendMessage(
      chrome.runtime.id, { type:'disactivate' });
});

