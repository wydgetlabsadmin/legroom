console.log('Enhancing Google Flights search with amenities extension.');

(function() {
  /**
   * @param {string} jsonStr Data from backend.
   * @return {Map<number, string>} Itinerary number to legroom
   *     dimension text, or null if passed in data is not parseable.
   */
  var parse = function(jsonStr) {
    var json = JSON.parse(jsonStr);
    try {
      var dataJsonStr = json['1'][0]['2'];
      var dataJson = JSON.parse(dataJsonStr);
      if (!dataJson['8']) {
        return null;
      }
      var trips = dataJson['8']['1'];
      var itiLegroomMap = new Map();
      trips.forEach(function(trip) {
        var itin = trip['1'];
        var flights = trip['2']['1'];
        var seats = [];
        flights.forEach(function(flight, i) {
          var legroom = toSeatInfo(flight['12']);
          seats.push(legroom);
        });
        itiLegroomMap.set(itin, seats);
      });
      return itiLegroomMap;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  var seatTypeMap = {
    '5': 'Lie Flat',
    '6': 'Suite',
    '7': 'Recliner',
    '8': 'Extra Recliner',
    '9': 'Angled Flat'
  };
  var toSeatInfo = function(obj) {
    var legroomCm = obj['7'];
    if (legroomCm) {
      // to inches.
      return {
        inch: Math.round(legroomCm * 0.3937) + '"',
        type: obj['6']
      };
    }
    var seatType = obj['6'];
    return { type: seatType };
  };

  /**
   * @return {boolean} True if node is updated, false otherwise.
   */
  var updateNode = function(n) {
    var itinMap = cachedItinerary.get(window.location.hash);
    if (!itinMap) {
      return false;
    }
    var itin = n.getAttribute('iti');
    itin = (!itin || itin == '') ? 0 : Number(itin);
    var seats = itinMap.get(itin);
    if (!seats) {
      return false;
    }
    var elem = document.createElement('div');
    elem.classList.add('legroom-s');
    elem.title = 'Legroom';
    seats.forEach(function(seat) {
      if (!seat) {
        return;
      }
      var text = seat.inch;
      var green = (seat.type == '4');
      var yellow = (seat.type == '3');
      if (!text) {
        text = seatTypeMap[seat.type] || '?';
      }
      var span = document.createElement('span');
      span.textContent = text;
      if (green) {
        span.classList.add('green');
      }
      if (yellow) {
        span.classList.add('yellow');
      }
      elem.appendChild(span);
    });
    var a = n.querySelector('.OMOBOQD-d-X>.OMOBOQD-d-Sb'); // Child link.
    a.after(elem);
    return true;
  };

  var cachedItinerary = new Map();

  var processRpc = function(json) {
    var map = parse(json);
    if (map != null) {
      var key = window.location.hash;
      var existingMap = cachedItinerary.get(key);
      if (existingMap) {
        map.forEach(function(v, k) {
          existingMap.set(k, v);
        });
      } else {
        cachedItinerary.set(key, map);
      }
    }
  };

  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    var method = arguments[0];
    var url = arguments[1]; 
    if (method == 'POST' && url == 'rpc') {
      this.addEventListener('loadend', function() {
        processRpc(this.responseText);
      }.bind(this));
    }
    return open.apply(this, arguments);
  };

  var addNotice = function(header) {
    var header =
        document.querySelector('.OMOBOQD-d-cc.OMOBOQD-d-S');
    var notice = document.createElement('a');
    notice.href = 'https://chrome.google.com/webstore/detail/legroom-please/nhonfddkgankhjilponlbdccpabaaknp';
    notice.target = 'extension';
    notice.classList.add('legroom-notice');
    notice.textContent =
        'Enhanced by Legrooms for Google Flights.';
    header.appendChild(notice);
  };

  window.addEventListener('load', function() {
    new MutationObserver(function(mutations, o) {
      mutations.forEach(function(m) {
        if (m.type != 'childList' || m.addedNodes.length <= 0) {
          return;
        }
        for (var i = 0; i < m.addedNodes.length; i++) {
          var n = m.addedNodes.item(i);
          // -d-cc is table header.
          if (!n.classList || !n.classList.contains('OMOBOQD-d-Lb') ||
              n.classList.contains('OMOBOQD-d-X')) {
            continue;
          }
          if (n.classList.contains('OMOBOQD-d-cc')) {
            addNotice(n);
          } else {
            updateNode(n);
          }
        }

      });
    }).observe(document.body, { childList: true, subtree: true });
  });
})();

