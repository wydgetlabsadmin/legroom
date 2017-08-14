chrome.runtime.onMessage.addListener(
    function(message, sender) {
      if (!message.type) {
        return; // No type. Probably not our message.
      }
      if (message.type == 'activate') {
        chrome.browserAction.setPopup({
          tabId: sender.tab.id,
          popup: "flight_popup.html"
        });
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
        chrome.browserAction.setPopup({
          tabId: sender.tab.id,
          popup: "no_flight_popup.html"
        });
        chrome.browserAction.setIcon({
          tabId: sender.tab.id,
          path: {
            '16':'seat_16_grey.png',
            '48':'seat_48_grey.png',
            '128':'seat_128_grey.png'
          }
        });
      }
    });

