let activeTabIds = new Set();

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
    });

