
function init() {
  if (chrome.tabs) {
    chrome.tabs.query(
        { active: true, currentWindow: true },
        onActiveTabResult);
  }
}

function onActiveTabResult(tabs) {
  if (!tabs || !tabs[0]) {
    return; // Do nothing.
  }
  chrome.runtime.sendMessage(
      { type: 'fetch_setting', caller: 'popup' },
      function(setting) {
        checkFlightTab(
            tabs[0].id, displayActivePanel, displayInactivePanel);
        new SettingControls(setting, cssQuery_('.info .controls'));
      });
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
  constructor(setting, container) {
    this.setting_ = setting;
    // Init each checkbox control.
    container.querySelectorAll('input[type="checkbox"]')
      .forEach(input => {
        if (this.setting_[input.name]) {
          input.checked = this.setting_[input.name];
        } else {
          this.setting_[input.name] = false;
        }
        input.addEventListener('change', this.handleChange_.bind(this));
      }, this);
    // Init inch toggle.
    container.querySelectorAll('input[type="radio"][name="inch"]')
      .forEach(radio => {
        if (radio.id == 'inchTrue') {
          radio.checked = !!this.setting_.inch;
        } else if (radio.id == 'inchFalse') {
          radio.checked = !this.setting_.inch;
        } else {
          console.log('Found unknown radio button. ' + radio);
          return;
        }
        radio.addEventListener(
            'change', this.handleInchChange_.bind(this));
      });
  }

  handleChange_(evt) {
    this.setting_[evt.target.name] = evt.target.checked;
    chrome.runtime.sendMessage(
        { type: 'setting_updated', setting: this.setting_ });
  }

  handleInchChange_(evt) {
    if (!evt.target.checked) {
      return; // Ignore this.
    }
    if (evt.target.id == 'inchTrue') {
      this.setting_.inch = true;
    } else if (evt.target.id == 'inchFalse') {
      this.setting_.inch = false;
    }
    chrome.runtime.sendMessage(
        { type: 'setting_updated', setting: this.setting_ });
  }
}

function cssQuery_(selector) {
  return document.querySelector(selector);
}

init();

