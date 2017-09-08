
function init() {
  if (chrome.tabs) {
    chrome.tabs.query(
        { active: true, currentWindow: true },
        onActiveTabResult);
  }
  new SettingControls(cssQuery_('.info .controls'));
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

class SettingControls {
  constructor(container) {
    this.settings_ = {};
    // Defaults.
    this.settings_['legroom'] = true;
    this.settings_['carryon'] = true;
    // Init each control.
    container.querySelectorAll('input[type="checkbox"]')
      .forEach(input => {
        if (this.settings_[input.name]) {
          input.checked = this.settings_[input.name];
        } else {
          this.settings_[input.name] = false;
        }
        input.addEventListener('change', this.handleChange_.bind(this));
      }, this);
  }

  handleChange_(evt) {
    this.settings_[evt.target.name] = evt.target.checked;
    console.log('update!');
    chrome.runtime.sendMessage(
        { type: 'settings_updated', settings: this.settings_ });
  }
}

function cssQuery_(selector) {
  return document.querySelector(selector);
}

init();

