/**
 * Adds proxy on XMLHttpRequest.
 * @param {Function(Object, string, string)} callback Where
 *     callback is a function that takes 3 parameters:
 *     request URL, request headers and responseText.
 */
window.taco5 = window.taco5 || {};
window.taco5.proxyXhr = function(callback) {
  /** Override XMLHttpRequest#open. */
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    var method = arguments[0];
    var url = arguments[1]; 
    if (method == 'GET' && url.match(/\/flights\/search/)) {
      this.addEventListener('loadend', function() {
        if (this.status >= 200 && this.status < 300) {
          callback(url, this.__headers, this.responseText);
        }
      }.bind(this));
    }
    return open.apply(this, arguments);
  };

  /** Capture any set request headers. */
  var xhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function() {
    this.__headers = this.__headers || {};
    this.__headers[arguments[0]] = arguments[1];
    return xhrSetRequestHeader.apply(this, arguments);
  };
};

