console.log('Enhancing Google Flights search with amenities extension.');

(function() {
  // Class prefix. Changes per GWT deployment, so need to figure out
  // from #root.
  var prefix = '';

  // User settings. Default values to use when persisted storage fail.
  let settings = {
    legroom: true,
    aircraft: false,
    carryOn: true,
    wifi: false,
    power: false,
    inch: false
  };

  /**
   * Adds classname prefix to given string or array of strings.
   */
  function cpfx(s) {
    if (s.map) {
      return s.map(function(a) {
        return '.' + prefix + a;
      });
    }
    return prefix + s;
  }
  function pfx(s) {
    let c = cpfx(s);
    if (c.map) {
      return c.map((a) => '.' + a);
    }
    return '.' + c;
  }

  /** Map of aircraft code and full name. */
  let aircraftMap = new Map();

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
      extractAuxData(dataJson); // Such as code-name mappings.
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
    retVal.wifi = (amenities[1] || 0) > 1; // 1:no, 2:yes.
    retVal.power = (amenities[2] || 0) > 1; // 1:no, 2:yes.
    retVal.usb = (amenities[3] || 0) > 1; // 1:no, 2:yes.
    retVal.video = amenities[8] || 0; // 1:on-demand, 2:stream.
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

  function extractAuxData(dataJson) {
    if (dataJson[9]) {
      let aircrafts = dataJson[9];
      aircrafts.forEach((aircraft) => {
        aircraftMap.set(aircraft[1], aircraft[3]);
      });
    }
  }

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

    // Remove existing node.
    var existing = n.querySelector('.legroom-s');
    if (existing) {
      existing.parentNode.removeChild(existing);
    }
    var elem = document.createElement('div');
    elem.classList.add('legroom-s');
    itinerary.flights.forEach(flight => {
      if (!flight) {
        return;
      }
      enhanceRow(elem, flight);
    });
    // Child link.
    let a = n.querySelector(pfx('-d-X') + '>' + pfx('-d-Sb'));
    a.after(elem);
    return true;
  };

  function enhanceRow(elem, flight) {
    var line = document.createElement('div');
    elem.appendChild(line);
    // Legroom.
    if (settings.legroom) {
      line.appendChild(legroomIcon(flight));
    }
    // Carry-on.
    if (settings.carryOn) {
      line.appendChild(binaryIcon(
          flight.carry_on_restricted,
          'legroom-carryon', cpfx('-d-kb'), 'none',
          'Restricted Carry-On'));
    }
    // Aircraft.
    if (settings.aircraft) {
      let aircraft = document.createElement('span');
      aircraft.classList.add('aircraft');
      aircraft.textContent = flight.aircraft;
      aircraft.title = aircraftMap.get(flight.aircraft);
      line.appendChild(aircraft);
    }
    // Wifi
    if (settings.wifi) {
      line.appendChild(binaryIcon(
        flight.wifi, 'legroom-wifi', cpfx('-d-kc'), cpfx('-d-qb')));
    }
    // Power
    if (settings.power) {
      line.appendChild(powerIcon(flight.power, flight.usb));
    }
  };

  function legroomIcon(flight) {
    let legroom = document.createElement('div');
    legroom.classList.add('legs');
    let text = (settings.inch) && flight.inch || flight.cm;
    if (!text) {
      text = flight.seat_description || '?';
    }
    legroom.textContent = text;
    legroom.title = 'Legroom';
    let green = (flight.seat_type == '4');
    let yellow = (flight.seat_type == '3');
    if (green) {
      legroom.classList.add('green');
    }
    if (yellow) {
      legroom.classList.add('yellow');
    }
    return legroom;
  };

  function binaryIcon(flag, elemClass, onClass, offClass, title) {
    let icon = document.createElement('div');
    icon.classList.add(elemClass);
    if (flag) {
      icon.classList.add(onClass);
    } else {
      icon.classList.add(offClass);
    }
    return icon;
  }

  function powerIcon(outlet, usb) {
    let icon = document.createElement('div');
    icon.classList.add('power');
    if (outlet && usb) {
      icon.classList.add('outlet-usb');
    } else if (outlet) {
      icon.classList.add('outlet');
    } else if (usb) {
      icon.classList.add('usb');
    } else {
      icon.classList.add('none');
    }
    return icon;
  }

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
          if (!c) return;
          callback(c.match(/[A-Z]+/)[0]);
          o.disconnect(); // No need to observe anymore.
        }
      });
    }).observe(root, { attributes: true });
  };

  window.addEventListener('load', function() {
    if (window.location.host.match(/\.com$/)) {
      settings.inch = true;
    }
    setupExtensionConnection();

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

  var COLUMN_WIDTHS = {
    legroom: 96,
    aircraft: 42,
    carryOn: 25,
    wifi: 25,
    power: 23
  };

  var injectStyles = function() {
    var styleElem = document.createElement('style');
    document.head.appendChild(styleElem);

    var ss = styleElem.sheet;

    let enhWidth = Object.keys(COLUMN_WIDTHS).reduce((total, col) => {
      return total + ((settings[col] && COLUMN_WIDTHS[col]) || 0);
    }, 0);
    let layoutWidth = 840 + enhWidth;
    let middleW = 650 + enhWidth;
    
    var rules = [
        'table.pfx-f-i {width: ' + layoutWidth + 'px}', // Layout table.
        'div.pfx-f-e {width: ' + middleW + 'px}', // Middle layout.
        /* Columns. */ 
        '.pfx-d-Lb>.pfx-d-X>div.pfx-d-Bb { width:' + 9900/middleW + '%; }',
        '.pfx-d-Lb>.pfx-d-X>div.pfx-d-ac { width:' + 25500/middleW + '%; }',
        '.pfx-d-Lb>.pfx-d-X>div.pfx-d-Jb { width:' + 13300/middleW + '%; }',
        '.pfx-d-Lb>.pfx-d-X>div.pfx-d-Sb { width:' + 13700/middleW + '%; }',
        '.legroom-s {width:' + enhWidth + 'px}', // Enhancement column.
    ];

    rules.forEach(function(rule) {
      rule = rule.replace(/pfx/g, prefix);
      ss.insertRule(rule, ss.cssRules.length);
    });
  };

  function setupExtensionConnection() {
    let elem = document.querySelector('.shared-elem');
    if (!elem) {
      console.log('Extension ID element is missing.');
      return;
    }
    let extensionId = elem.textContent;
    if (!extensionId) {
      console.log('Extension ID is missing.');
      return;
    }
    // Listen to events from extension.
    let port = chrome.runtime.connect(extensionId, { name: 'injected' });
    port.onMessage.addListener(function(message) {
      if (message.type == 'setting_updated') {
        updateSetting(message.setting);
      }
    });
    port.onDisconnect.addListener(function() {
      // Reopen again.
      window.setTimeout(setupExtensionConnection, 500);
    });
  }

  function updateSetting(newSetting) {
    console.log(newSetting);
    settings = newSetting;
  }
})();

