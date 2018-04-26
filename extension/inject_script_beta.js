(function() {

/*
window.addEventListener('load', function() {
*/
function observeDom() {
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

  function handleAddedNode(node) {
    if (node.classList &&
        node.classList.contains('gws-flights-results__heading-disclaimer')) {
      handleHeader(node);
      return;
    }
    if (node.classList &&
        node.classList.contains('gws-flights-widgets-expandablecard__body')) {
      handleExpandableCard(node);
      return;
    }
    if (node.childNodes) {
      for (var i = 0; i < node.childNodes.length; i++) {
        handleAddedNode(node.childNodes.item(i));
      }
    }
  }
}

function handleHeader(header) {
  header = header ||
      document.querySelector('.gws-flights-results__heading-disclaimer');
  if (!header) {
    return;  // No need to do anything.
  }
  // Append spacer.
  let div = document.createElement('div');
  div.classList.add('legroom-header');
  div.innerText = 'Enhanced by Legroom for Google Flights.';
  header.appendChild(div);
}

function handleExpandableCard(node) {
  let legs = [];
  let legElems = node.querySelectorAll('.gws-flights-results__leg');
  legElems.forEach((legElem) => {
    let amenitiesElems =
        legElem.querySelectorAll('.gws-flights-results__leg-amenities>ul li');
    let amenities = {};
    amenitiesElems.forEach(item => {
      let a = extractAmenities(item);
      if (a) {
        amenities[a.name] = a;
      }
    });
    let aircraftElem = legElem.querySelector('.gws-flights-results__aircraft-type');
    if (aircraftElem) {
      amenities.aircraft = {
        text: aircraftElem.innerText
      };
    }
    legs.push({ amenities: amenities });
  });

  let rowLi = node.closest('li.gws-flights-results__result-item');
  let row = rowLi.querySelector('div.gws-flights-results__itinerary-card-summary');
  extendRow(row, legs);
}

function findCssClass(elem, regex) {
  for (let i = 0; i < elem.classList.length; i++) {
    let cssClass = elem.classList.item(i);
    if (cssClass.match(regex)) {
      return cssClass;
    }
  }
  return null;
}

function extractAmenities(item) {
  if (!item.classList) {
    return;
  }
  let resultCssClass = findCssClass(item, /gws-flights-results__.*/);
  if (!resultCssClass || item.style.display == 'none') {
    // ignore display:none items.
    return;
  }
  let name = resultCssClass.match(/__(.*)$/)[1];
  if (name.match(/seat-.*/)) {
    let m = item.innerText.match(/\(([^\)]*)\)/) ||
        item.innerText.match(/(.*) seat/);
    return {
      name: 'seat',
      cssClass: resultCssClass,
      text: m && m[1] || item.innerText
    };
  }
  if (name.match(/on-demand-video|live-tv|streaming-video/)) {
    return {
      name: 'video',
      cssClass: resultCssClass,
      alt: item.innerText
    };
  }
  // known names: wifi, power.
  return { name: name, cssClass: resultCssClass, alt: item.innerText };
}

let settings = {
  legroom: true,
  aircraft: true,
  carryon: true,
  wifi: true,
  power: true,
  inch: false
};

function extendRow(rowElem, legs) {
  // Do not repeat.
  if (rowElem.querySelector('.legroom-row-extend')) {
    return;
  }
  let wrap = document.createElement('div');
  wrap.classList.add('legroom-row-extend');
  if (settings.legroom) {
    wrap.appendChild(buildAmenitiesElement(legs, 'seat'));
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

function buildAmenitiesElement(legs, amenityName) {
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
    let amenity = leg.amenities[amenityName];
    elem.appendChild(legElem(amenity));
  });
  return elem;
}

function queryAndExtend() {
  let nodes = document.querySelectorAll('.gws-flights-widgets-expandablecard__body');
  if (nodes.length > 0) {
    nodes.forEach(handleExpandableCard);
    handleHeader();
  } else {
    observeDom();
  }
}

console.log('Legroom extension for Google Flights.');
// Do it at least once.
queryAndExtend();

})(); // Close closure wrap.
