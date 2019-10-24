(function() {

  /**
   * Flight cache.
   * location => {
   *   requestObj: Object, // Useful for sending detail requests.
   *   itineraries: Map<string, Object>, // Itinerary name to itinerary obj.
   * }
   */
  let flightCache = new Map();

  function getOrInit(cache, key) {
    let value = flightCache.get(key);
    if (!value) {
      value = {};
      flightCache.set(key, value);
    }
    return value;
  }

  window.taco5 = window.taco5 || {};
  window.taco5.flightdata = window.taco5.flightdata || {};
  window.taco5.flightdata.get = function(itineraryId) {
    let cacheKey = getLocationHash();
    let cache = flightCache.get(cacheKey);
    if (!cache || !cache.itineraries) {
      return; // Empty cache.
    }
    return cache.itineraries.get(itineraryId);
  }

  window.taco5.flightdata.printCache = function() {
    console.log(flightCache);
  }

  let listeners = [];

  window.taco5.flightdata.addListener = function(callback) {
    listeners.push(callback);
  }
    
  function updateCacheWithRequestObject(requestObj) {
    if (!requestObj) {
      return; // Do nothing.
    }
    let key = getLocationHash();
    let value = getOrInit(flightCache, key);
    value.requestObj = requestObj;
  }

  function updateCacheWithItineraries(itineraryMap) {
    if (!itineraryMap || itineraryMap.size == 0) {
      return; // Do nothing.
    }
    let key = getLocationHash();
    let value = getOrInit(flightCache, key);
    value.itineraries = value.itineraries || new Map();
    
    // Insert-replace itineraries.
    itineraryMap.forEach((v, k) => {
      value.itineraries.set(k, v);
      if (listeners.length > 0) {
        listeners.forEach(listener => {
          try {
            listener(k, v);
          } catch (e) {
            console.err(e);
          }
        });
      }
    });
  }

  function getLocationHash() {
    // Always return 1 for now. Used to use window.location for
    // this but it isn't reliable since it got updated after 
    // rpc and some elements draw.
    // TODO(dbugger): Figure out a neat way to purge unused.
    return 1;
    //return location.hash.substr(1);
  }

  function toQueryString(urlStr) {
    let linkElem = document.createElement('a');
    linkElem.href = urlStr;
    return linkElem.search.substr(1);
  }

  function decodeRequestData(reqDataStr) {
    let decoded = decodeURIComponent(reqDataStr);
    try {
      return JSON.parse(decoded);
    } catch (e) {
      // Not a json, probably continuation token.
      return null;
    }
  }

  function processRequest(requestUrl, requestHeaders) {
    let async = toQueryString(requestUrl)
        .split('&').find(s => s.startsWith("async="));
    if (!async) {
      return; // Not data that we want.
    }
    async = async.substr(6);

    let vStr = new Map(async.split(',').map(s => s.split(':'))).get('data');
    let reqDataObj = decodeRequestData(vStr);
    if (!reqDataObj) {
      return; // Do nothing.
    }
    updateCacheWithRequestObject(reqDataObj);
  }

  function processSearchResult(resultObj) {
    let itineraries = [];
    if (!resultObj[2]) {
      return;
    }

    if (resultObj[2][2]) {
      // Search result.
      let bestItineraries = resultObj[2][2][0];
      if (bestItineraries) {
        itineraries = itineraries.concat(bestItineraries);
      }
      let otherItineraries = resultObj[2][2][1];
      if (otherItineraries) {
        itineraries = itineraries.concat(otherItineraries);
      }
      let itineraryMap = new Map();
      itineraries.map(processItinerary).forEach(i => {
        itineraryMap.set(i.name, i);
      });
      updateCacheWithItineraries(itineraryMap);
    } else if (resultObj[2][1]) {
      // Bookings.
      let itineraryMap = new Map();
      resultObj[2][1].map(processBooking).forEach(i => {
        itineraryMap.set(i.name, i);
      });
      updateCacheWithItineraries(itineraryMap);
    }
  }

  function processResponse(jsonStr) {
    // Trunc gibberish.
    if (jsonStr.startsWith(')]}\'')) {
      jsonStr = jsonStr.substr(5);
    }
    let respObj;
    try {
      respObj = JSON.parse(jsonStr);
    } catch (e) {
      console.log('Error while parsing response as JSON.');
      console.log(e);
      console.log('Actual response.');
      console.log(json);
      return;
    }

    if (!respObj['_r']) {
      console.log('Unknown response:');
      console.log(respObj);
      return;
    }

    processSearchResult(respObj['_r']);
  }

  function processRpc(requestUrl, requestHeaders, jsonStr) {
    processRequest(requestUrl, requestHeaders);
    processResponse(jsonStr);
  };

  function processItinerary(itinArray) {
    return {
      name: itinArray[0][1],
      price: itinArray[0][6],
      flights: itinArray[0][4].map(toFlight),
      lookupId: itinArray[0][18]
    };
  }

  function processBooking(array) {
    return {
      name: array[1],
      flights: array[4].map(toFlight)
    };
  }

  function toFlight(flightPb) {
    return {
      origin: flightPb[0],
      destination: flightPb[1],
      airline: flightPb[2][0],
      number: flightPb[2][1],
      departure: flightPb[3][0],
      arrival: flightPb[4][0],
      durationMinutes: flightPb[5],
      aircraft: flightPb[15],
      legroomLength: flightPb[17],
      legroomInfo: LEGROOM_INFO[flightPb[7]] || flightPb[7],
      wifi: flightPb[6] && !!flightPb[6][0],
      power: flightPb[6] && !!flightPb[6][3],
      onDemandVideo: flightPb[6] && !!flightPb[6][9],
      streamVideo: flightPb[6] && !!flightPb[6][10],
      seatClass: toSeatClass(flightPb[11]),
      raw: flightPb
    }
  }
  
  const LEGROOM_INFO = Object.freeze({
    1: 'AVERAGE',
    2: 'BELOW',
    3: 'ABOVE',
    4: 'Extra Reclining',
    5: 'Lie Flat',
    6: 'Suite',
    8: 'Reclining',
    9: 'Angled Flat'
  });

  function processOffer(offerPb) {
    let booking = {};
    if (offerPb[5]) {
      booking.carryOnRestriction = parseBaggageInfo(offerPb[5]);
    }
    booking.tripBaggageFee = BaggageFee.parsePb(offerPb[7]);
    booking.ticket = Ticket.parsePb(offerPb[0][14]);
    return Object.freeze(booking);
  }

  function parseBaggageInfo(pb) {
    if (!pb || !pb.length) return;
    /** @type Object<string, Object> airline code to baggage info. */
    let map = {};
    pb.forEach(p => {
      let info = {};
      switch(p[1]) {
        case 0: // Like UA Basic Economy.
          info.carryOnIncluded = false;
          info.carryOnForFee = false;
          break;
        case 1: // Like Frontier.
          info.carryOnIncluded = false;
          info.carryOnForFee = true;
          break;
      }
      map[p[0]] = info;
    });
    return Object.freeze(map);
  }


  const TicketRules = Object.freeze({
    NOT_AVAILABLE: Symbol("not available"),
    FOR_FEE: Symbol("for fee"),
    INCLUDED: Symbol("included")
  });

  class Ticket {
    static parsePb(ticketPb) {
      if (!ticketPb) {
        return;
      }
      let ticket = new Ticket();
      ticket.baggageInfo = BaggageFee.parsePb(ticketPb[17]);
      ticket.upgrade = Upgrade.parsePb(ticketPb[11]);
      ticket.ingestRules(ticketPb[10]);
      return Object.freeze(ticket);
    }

    static toRuleValue(num) {
      switch (num) {
        case 0: return TicketRules.NOT_AVAILABLE;
        case 1: return TicketRules.FOR_FEE;
        case 2: return TicketRules.INCLUDED;
      }
    }

    constructor() {
      /** @type {BaggageFee} */ this.baggageInfo;
      /** @type {Ticket} */ this.upgrade;
    }
   
    ingestCarryOnStatus(pb) {
      if(!pb) return;
      switch(pb[0]) {
        case 0: // Like UA Basic Economy.
          this.isCarryOnIncluded = false;
          this.isCarryOnPurchaseable = false;
        case 1: // Like Frontier.
          this.isCarryOnIncluded = false;
          this.isCarryOnPurchaseable = true;
      }
    }

    /** @param {Array} rulePb 0: rule type, 1: rule state. */
    ingestRules(rulesPb) {
      if (!rulesPb || !rulesPb.length) return;
      rulesPb.forEach(rulePb => {
        let value = Ticket.toRuleValue(rulePb[1]);
        switch(rulePb[0]) {
          case 1:
            this.hasBinAccess = value; break;
          case 2:
            this.hasSeatSelection = value; break;
          case 3:
            this.isChangeable = value; break;
          case 4:
            this.isUpgradeable = value; break;
        }
      }, this);
    }
  }

  class Upgrade {
    static parsePb(upgradePb) {
      if(!upgradePb) {
        return;
      }
      let u = new Upgrade();
      u.ticket = Ticket.parsePb(upgradePb[0]);
      u.additionalCost = upgradePb[1];
      return Object.freeze(u);
    }

    constructor() {
      /** @type {Ticket} */ this.ticket;
      /** @type {string} */ this.additionalCost;
    }
  }

  class BaggageFee {
    static parsePb(baggagePb) {
      if (!baggagePb) {
        return undefined;
      }
      let info = new BaggageFee();
      baggagePb.slice(0, 2).forEach(bagPb=> {
        info.bags.push(Object.freeze(new Bag(
            !!bagPb[1],
            bagPb[0] && Money.parsePb(bagPb[0]) || undefined)));
      });
      return Object.freeze(info);
    }

    constructor() {
      /** @type {Array<Bag>} */ this.bags = [];
    }
  }

  class Bag {
    constructor(isIncluded, opt_fee) {
      this.isIncluded = isIncluded;
      if (opt_fee) {
        /** @type {Money} */ this.fee = opt_fee;
      }
    }
  }

  class Money {
    static parsePb(pb) {
      return Object.freeze(new Money(pb[0], pb[1], pb[2], pb[3]));
    }
    static free() {
      return Object.freeze(new Money('Free', 0, 0, 'USD'));
    }
    static noData() {
      return Object.freeze(
          new Money('No info', undefined, undefined, undefined));
    }
    constructor(text, integer, fractionDigits, currency) {
      this.text = text;
      this.integer = integer;
      this.fractionDigits = fractionDigits;
      this.currency = currency;
    }
    toString() {
      return this.text;
    }
  }

  function toSeatClass(val) {
    if (val == 1) {
      return 'ECONOMY';
    } else if (val == 2) {
      return 'PREMIUM';
    } else if (val == 3) {
      return 'BUSINESS';
    } else if (val == 4) {
      return 'FIRST';
    }
    return 'UNKNOWN';
  }

  function addXhrProxyInterceptor(callback) {
    /** Override XMLHttpRequest#open. */
    var open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
      var method = arguments[0];
      var url = arguments[1]; 
      if (method == 'GET' &&
          (url.match(/\/flights\/search/) ||
          url.match(/\/flights\/booking/))) {
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
  }

  // Register processRpc to proxyXhr.
  addXhrProxyInterceptor(processRpc);
})();

