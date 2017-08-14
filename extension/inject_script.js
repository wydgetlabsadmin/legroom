console.log('Enhancing Google Flights search with amenities extension.');

(function() {
  // Class prefix. Changes per GWT deployment, so need to figure out
  // from #root.
  var prefix = '';
  var isInch = false;

  /**
   * Adds classname prefix to given string or array of strings.
   */
  var pfx = function(s) {
    if (s.map) {
      return s.map(function(a) {
        return '.' + prefix + a;
      });
    }
    return '.' + prefix + s;
  }

  /**
   * @param {string} jsonStr Data from backend.
   * @param {=number} opt_itineraryNumber Itinerary this data is for.
   * @return {Map<number, Itinerary>} Itinerary number to legroom
   *     dimension text, or null if passed in data is not parseable.
   */
  function parse(jsonStr, opt_itineraryNumber) {
    var json = JSON.parse(jsonStr);
    var dataJsonStr = json['1'][0]['2'];
    if (!dataJsonStr) {
      return null;
    }
    try {
      var dataJson = JSON.parse(dataJsonStr);
      if (!dataJson['8']) {
        return null;
      }
      var trips = dataJson['8']['1'];
      if (!trips) {
        return null;
      }
      let tickets = dataJson[8] && dataJson[8][4] && dataJson[8][4][2];
      /** @type {!Map<number, Itinerary>} */
      var itiLegroomMap = new Map();
      trips.forEach((trip, index) => {
        let ticket = tickets && tickets[index];
        /** @type {!Itinerary} */
        let itinerary = {
          // trip[2][1] are list of flights.
          flights: trip[2][1].map((flight, fi) => {
              let info = toFlightInfo(flight);
              if (ticket && ticket[1] && ticket[1][fi]) {
                info.carry_on_restricted = !!ticket[1][fi][2];
              }
              return info;
          })
        };
        itinerary.has_detail = !isDetailNeeded(itinerary) ||
            opt_itineraryNumber !== undefined
        let num = opt_itineraryNumber || trip[1];
        itiLegroomMap.set(num, itinerary);
      });
      return itiLegroomMap;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  const AIRLINES_NEED_DETAILS = ['UA', 'F9', 'NK', 'WW', 'AA'];

  /** Only fetch detail for UA. */
  function isDetailNeeded(itinerary) {
    return itinerary.flights.some(
        (f) => (AIRLINES_NEED_DETAILS.includes(f.airline)));
  }

  /**
   * @return {!FlightInfo} from RPC data.
   */
  function toFlightInfo(flightData) {
    let retVal = {};
    let amenities = flightData['12'];
    retVal.seat_type = amenities['6'];
    retVal.seat_description = seatTypeMap[amenities['6']];
    let legroomCm = amenities['7'];
    if (legroomCm) {
      retVal.inch = Math.round(legroomCm * 0.3937) + '"';
      retVal.cm = legroomCm + ' cm';
    };
    retVal.departure = flightData[1];
    retVal.arrival = flightData[3];
    retVal.departure_time = flightData[2];
    retVal.arrival_time = flightData[4];
    retVal.airline = flightData[5];
    retVal.flight_number = flightData[6];
    retVal.aircraft = flightData[9];
    let delayInfo = flightData[11];
    if (delayInfo) {
      retVal.delayInfo = {
        by_15min_pct: delayInfo[1],
        by_30min_pct: delayInfo[2],
        by_45min_pct: delayInfo[3],
        cancelled_pct: delayInfo[4]
      };
    }
      
    return retVal;
  };

  var seatTypeMap = {
    '0': 'No seat type',
    '1': 'Who knows',
    '2': 'Average',
    '3': 'Below Average',
    '4': 'Above Average',
    '5': 'Lie Flat',
    '6': 'Suite',
    '7': 'Recliner',
    '8': 'Extra Recliner',
    '9': 'Angled Flat'
  };

  function findItineraryNode(itineraryNumber) {
    return (itineraryNumber == 0) ?
        document.querySelector(pfx('-d-Lb') +
            ':not([iti]):not(' + pfx('-d-cc') + ')' +
            ':not(' + pfx('-d-X') + ')') :
        document.querySelector(
            pfx('-d-Lb') + '[iti="' + itineraryNumber + '"]');
  }

  /**
   * @return {boolean} True if node is updated, false otherwise.
   */
  function updateNode(n, opt_ignoreDetail) {
    var itinMap = cachedItinerary.get(window.location.hash);
    if (!itinMap) {
      return false;
    }
    var itin = n.getAttribute('iti');
    itin = (!itin || itin == '') ? 0 : Number(itin);
    var itinerary = itinMap.get(itin);
    if (!itinerary) {
      return false;
    }
    // Is detail loaded?
    if (!opt_ignoreDetail && !itinerary.has_detail) {
      window.setTimeout(function() {
          loadDetail(Number(itin), () => updateNode(n, true));
      }, 250);
    }

    // Remote existing node.
    var existing = n.querySelector('.legroom-s');
    if (existing) {
      existing.parentNode.removeChild(existing);
    }
    var elem = document.createElement('div');
    elem.classList.add('legroom-s');
    elem.title = 'Legroom';
    itinerary.flights.forEach(flight => {
      if (!flight) {
        return;
      }
      let text = (isInch) && flight.inch || flight.cm;
      let green = (flight.seat_type == '4');
      let yellow = (flight.seat_type == '3');
      if (!text) {
        text = flight.seat_description || '?';
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
      if (flight.carry_on_restricted) {
        let noCarryOn = document.createElement('div');
        noCarryOn.classList.add(prefix + '-d-kb');
        noCarryOn.classList.add('legroom-carryon');
        span.appendChild(noCarryOn);
      }
    });
    let a = n.querySelector(pfx('-d-X') + '>' + pfx('-d-Sb')); // Child link.
    a.after(elem);
    return true;
  };

  var cachedItinerary = new Map();

  function processRpc(json, opt_itineraryNumber) {
    var map = parse(json, opt_itineraryNumber);
    if (!map) {
      return;
    }
    var key = window.location.hash;
    var existingMap = cachedItinerary.get(key);
    if (existingMap) {
      map.forEach(function(v, k) {
        existingMap.set(k, v);
      });
    } else {
      cachedItinerary.set(key, map);
    }
  };

  var searchJson;
  var searchHeaders;
  var detailFlag = true;

  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    var method = arguments[0];
    var url = arguments[1]; 
    if (method == 'POST' && url == 'rpc') {
      this.addEventListener('loadend', function() {
        if (this.status >= 200 && this.status < 300) {
          processRpc(this.responseText, this.itineraryNumber);
          if (this.node_callback) {
            this.node_callback();
          }
        }
      }.bind(this));
    }
    return open.apply(this, arguments);
  };
  var xhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function() {
    this.dreHeaders = this.dreHeaders || {};
    this.dreHeaders[arguments[0]] = arguments[1];
    return xhrSetRequestHeader.apply(this, arguments);
  };
  var xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    if (this.itineraryNumber === undefined && // Ignore detail rpc.
        arguments[0] && arguments[0].match(/"1":"fs"/)) {
      searchJson = arguments[0];
      searchHeaders = this.dreHeaders;
    }
    return xhrSend.apply(this, arguments);
  };

  function loadDetail(itineraryNumber, opt_callback) {
    let itinMap = cachedItinerary.get(window.location.hash);
    let itinerary = itinMap.get(itineraryNumber);
    if (!itinerary) {
      return; // Do nothing.
    }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'rpc', true);
    xhr.setRequestHeader('Content-type', 'application/json');
    for (var name in searchHeaders) {
      xhr.setRequestHeader(name, searchHeaders[name]);
    }
    xhr.node_callback = opt_callback;
    xhr.itineraryNumber = itineraryNumber;
    var reqJson = enhanceSearch(searchJson, itinerary);
    if (reqJson) {
      xhr.send(reqJson);
    }
  };

  var enhanceSearch = function(reqJson, itinerary) {
    var reqObj = JSON.parse(reqJson);
    var actTxt = reqObj['1'][0]['2'];
    if (!actTxt) {
      return reqJson;
    }
    var actObj = JSON.parse(actTxt);
    let itinMap = cachedItinerary.get(window.location.hash);
    if (!itinerary.flights) {
      return null;
    }
    let flights = itinerary.flights.map(f => {
      return {1: f.airline,
        2: f.flight_number,
        3: f.departure,
        4: f.arrival,
        5: f.departure_time.replace(/T.*$/, '')
      };
    });

    // Find empty slots. For roundtrip or multi-city trip
    // when user already choose one or a few flight, we want
    // to get info for the next one.
    let flightIndex = actObj[1][1].findIndex(f => !f['4']);

    // Clear out the remainder, as if this is the last flight.
    actObj[1][1] = actObj[1][1].slice(0, flightIndex + 1);
    actObj[1][1][flightIndex]['4'] = { 1: flights };
    delete actObj[1][8];
    actObj['2'] = {2:1};
    reqObj['1'][0]['2'] = JSON.stringify(actObj);
    return JSON.stringify(reqObj);
  };

  var requestDetail = function() {
    var data = enhanceSearch(searchJson);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'rpc');
    xhr.send(data);
  };

  var addNotice = function(header) {
    var header = document.querySelector(pfx('-d-cc') + pfx('-d-S'));
    var notice = document.createElement('a');
    notice.href = 'https://chrome.google.com/webstore/detail/legroom-please/nhonfddkgankhjilponlbdccpabaaknp';
    notice.target = 'extension';
    notice.classList.add('legroom-notice');
    notice.textContent =
        'Enhanced by Legrooms for Google Flights.';
    header.appendChild(notice);
  };

  var observeForClassPrefix = function(callback) {
    var root = document.querySelector('#root');
    new MutationObserver(function(mutations, o) {
      mutations.forEach(function(m) {
        if (m.type == 'attributes' && m.attributeName == 'class') {
          var c = findMatchingClass(m.target, /.+-f-w/);
          callback(c.match(/[A-Z]+/)[0]);
          o.disconnect(); // No need to observe anymore.
        }
      });
    }).observe(root, { attributes: true });
  };

  window.addEventListener('load', function() {
    if (window.location.host.match(/\.com$/)) {
      isInch = true;
    }
    observeForClassPrefix(function(p) {
      prefix = p;
      injectStyles();
    });
      
    new MutationObserver(function(mutations, o) {
      mutations.forEach(function(m) {
        if (m.type != 'childList' || m.addedNodes.length <= 0) {
          return;
        }
        for (var i = 0; i < m.addedNodes.length; i++) {
          var n = m.addedNodes.item(i);
          // -d-cc is table header.
          if (!n.classList || !n.classList.contains(prefix + '-d-Lb') ||
              n.classList.contains(prefix + '-d-X')) {
            continue;
          }
          if (n.classList.contains(prefix + '-d-cc')) {
            addNotice(n);
          } else {
            updateNode(n);
          }
        }

      });
    }).observe(document.body, { childList: true, subtree: true });

  });
 
  // Utility functions.
  var findMatchingClass = function(elem, regex) {
    if (!elem.classList) {
      return null;
    }
    for (var i = 0, list = elem.classList; i < list.length; i++) {
      var c = list.item(i);
      if (c.match(regex)) {
        return c;
      }
    }
    return null;
  };
 
  var injectStyles = function() {
    var styleElem = document.createElement('style');
    document.head.appendChild(styleElem);

    var ss = styleElem.sheet;

    var rules = [
        'table.pfx-f-i {width: 940px}', // Layout table.
        'div.pfx-f-e {width: 750px}', // Middle column.
        /* Columns. */ 
        '.pfx-d-Lb>.pfx-d-X>div.pfx-d-Bb { width: 15.2%; }',
        '.pfx-d-Lb>.pfx-d-X>div.pfx-d-ac { width: 36.2%; }',
        '.pfx-d-Lb>.pfx-d-X>div.pfx-d-Jb { width: 15.5%; }',
        '.pfx-d-Lb>.pfx-d-X>div.pfx-d-Sb { width: 17.1%; }',
    ];

    rules.forEach(function(rule) {
      rule = rule.replace(/pfx/g, prefix);
      ss.insertRule(rule, ss.cssRules.length);
    });
  };

})();

