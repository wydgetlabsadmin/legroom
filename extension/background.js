chrome.runtime.onMessage.addListener(
    function(message, sender) {
      if (!message.type) {
        return; // No type. Probably not our message.
      }
      if (message.type == 'focus') {
        chrome.pageAction.show(sender.tab.id);
      }
      if (message.type == 'blur') {
        chrome.pageAction.hide(sender.tab.id);
      }
    });

