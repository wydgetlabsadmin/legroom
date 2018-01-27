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
    });
  }

  function getLocationHash() {
    return location.hash.substr(1);
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

    console.log(flightCache);
  };

  function processItinerary(itinArray) {
    return {
      name: itinArray[0][1],
      price: itinArray[0][6],
      flights: itinArray[0][4].map(toFlight),
      lookupId: itinArray[0][18]
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
      legroomCompare: decodeLegroomCompare(flightPb[7]),
      wifi: !!flightPb[6][0],
      power: !!flightPb[6][3],
      onDemandVideo: !!flightPb[6][9],
      streamVideo: !!flightPb[6][10],
      raw: flightPb
    }
  }

  function decodeLegroomCompare(val) {
    if (val == 3) {
      return 'ABOVE';
    } else if (val == 1) {
      return 'AVERAGE';
    } else if (val == 2) {
      return 'BELOW';
    }
    return null;
  }

  // Register processRpc to proxyXhr.
  taco5.proxyXhr(processRpc);
})();

