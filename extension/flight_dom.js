(function() {
  
function observeDom() {
  let amenitiesClass = 'gws-flights-results__leg-amenities';
  new MutationObserver(function(mutations, o) {
    mutations.forEach(function(m) {
      if (m.type != 'childList' || m.addedNodes.length <= 0) {
        return;
      }
      for (var i = 0; i < m.addedNodes.length; i++) {
        handleAddedNode(m.addedNodes.item(i));
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
}

function handleAddedNode(node) {
  if (node.classList &&
      node.classList.contains(
          'gws-flights-results__heading-disclaimer')) {
    handleHeader(node);
    return;
  }
  if (node.classList &&
      node.classList.contains('gws-flights-results__result-item')) {
    handleResultItem(node);
    return;
  }
  if (node.childNodes) {
    for (var i = 0; i < node.childNodes.length; i++) {
      handleAddedNode(node.childNodes.item(i));
    }
  }
}

function handleHeader(header) {
  header = header ||
      document.querySelector(
          '.gws-flights-results__heading-disclaimer');
  if (!header) {
    return;  // No need to do anything.
  }
  // Append spacer.
  let div = document.createElement('div');
  div.classList.add('legroom-header');
  div.innerText = 'Enhanced by Legroom for Google Flights.';
  header.appendChild(div);
}

function handleResultItem(node) {
  console.log(node);
  let itineraryKey = node.getAttribute('data-fp');
  let itinerary = window.taco5.flightdata.get(itineraryKey);
  extendRow(node, itinerary);
}

let settings = {
  legroom: true,
  aircraft: false,
  carryon: false,
  wifi: false,
  power: false,
  inch: false
};

function extendRow(rowLi, itinerary) {
  console.log(itinerary);
  let legs = itinerary.flights;
  let rowElem = rowLi.querySelector(
      'div.gws-flights-results__itinerary-card-summary');
  // Do not repeat.
  if (rowElem.querySelector('.legroom-row-extend')) {
    return;
  }
  let wrap = document.createElement('div');
  wrap.classList.add('legroom-row-extend');
  if (settings.legroom) {
    wrap.appendChild(buildAmenitiesElement(legs, 'seat', 'legroomLength'));
  }
  if (settings.wifi) {
    wrap.appendChild(buildAmenitiesElement(legs, 'wifi'));
  }
  if (settings.power) {
    wrap.appendChild(buildAmenitiesElement(legs, 'power'));
  }
  if (settings.aircraft) {
    wrap.appendChild(buildAmenitiesElement(legs, 'aircraft'));
  }
  rowElem.appendChild(wrap);
}

function buildAmenitiesElement(legs, amenityName, opt_propertyName) {
  opt_propertyName = opt_propertyName || amenitityName;
  function legElem(amenity) {
    let leg = document.createElement('div');
    leg.classList.add('leg');
    if (amenity) {
      if (amenity.text) {
        leg.innerText = amenity.text;
        if (amenity.text && amenity.text.length > 10) {
          leg.title = amenity.text;
        }
      }
      if (amenity.cssClass) {
        leg.classList.add(amenity.cssClass);
      }
    }
    return leg;
  }

  let elem = document.createElement('div')
  elem.classList.add(amenityName);
  legs.forEach((leg) => {
    console.log(leg);
    let amenity = leg[amenityName];
    elem.appendChild(legElem(amenity));
  });
  return elem;
}

observeDom();

})();

