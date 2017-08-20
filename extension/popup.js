
function init() {
  chrome.tabs.query(
      { active: true, currentWindow: true },
      onActiveTabResult);
}

function onActiveTabResult(tabs) {
  if (!tabs || !tabs[0]) {
    return; // Do nothing.
  }
  checkFlightTab(tabs[0].id, displayActivePanel, displayInactivePanel);
}

function checkFlightTab(tabId, positiveCallback, negativeCallback) {
  chrome.runtime.sendMessage(
      { type: 'is_active', tab_id: tabId },
      function(response) {
        if (response) {
          positiveCallback && positiveCallback();
        } else {
          negativeCallback && negativeCallback();
        }
      });
}

function displayActivePanel() {
  var body = document.querySelector('body');
  body.classList.add('active');
}

function displayInactivePanel() {
  var body = document.querySelector('body');
  body.classList.remove('active');
}

init();

