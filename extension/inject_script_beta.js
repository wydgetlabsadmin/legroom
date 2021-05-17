(function() {

function observeDom() {
  new MutationObserver(function(mutations, o) {
    mutations.forEach(function(m) {
      if (m.type != 'childList' || m.addedNodes.length <= 0) {
        return;
      }
      try {
        for (var i = 0; i < m.addedNodes.length; i++) {
          handleAddedNode(m.addedNodes.item(i));
        }
      } catch(e) {
        console.log(e);
      }
    });
  }).observe(document.body, { childList: true, subtree: true });

  function handleAddedNode(node) {
    if (node.classList &&
        node.classList.contains('tEXind')) {
        //node.classList.contains('gws-flights-results__heading-disclaimer')) {
      handleHeader(node);
      return;
    }
    if (node.tagName = 'DIV' &&
        node.getAttribute && node.getAttribute('role') == 'listitem' &&
        node.hasAttribute && node.hasAttribute('data-id')) {
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
  if (document.querySelector('.legroom-header')) {
    // Already added. Skip.
    return;
  }
  header = header ||
      document.querySelector('.i01GId');
      //document.querySelector('.gws-flights-results__heading-disclaimer');
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
  let itineraryId = node.getAttribute('data-id');
  let row = node.querySelector('div.OgQvJf');

  extendRow(row, itineraryId);
  return;
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
  video: true,
  inch: false
};

function extendRow(rowElem, itineraryId) {
  // Do not repeat.
  if (rowElem.querySelector('.legroom-row-extend')) {
    return;
  }
  let wrap = document.createElement('div');
  wrap.classList.add('legroom-row-extend');
  wrap.setAttribute('itin-id', itineraryId);
  rowElem.appendChild(wrap);
}

function updateRow(rowExtend, value) {
  // Clearup existing children.
  rowExtend.replaceChildren();
  let legs = value.flights;
  if (settings.aircraft) {
    rowExtend.appendChild(buildAmenitiesIcon(legs, 'wifi'));
  }
  if (settings.aircraft) {
    rowExtend.appendChild(buildAmenitiesIcon(legs, 'power'));
  }
  if (settings.aircraft) {
    rowExtend.appendChild(buildAmenitiesIcon(legs, 'video'));
  }
  if (settings.aircraft) {
    rowExtend.appendChild(buildAmenitiesElement(legs, 'aircraft'));
  }
  if (settings.legroom) {
    rowExtend.appendChild(buildAmenitiesElement(legs, 'legroomLength'));
  }
}

if (!Object.clone) {
  Object.clone = function(that) {
    if (!that) return that;
    let o = {};
    Object.keys(that).forEach(key => o[key] = that[key]);
    return o;
  }
}

function buildAmenitiesElement(legs, amenityName) {
  function legElem(amenity) {
    let leg = document.createElement('div');
    leg.classList.add('leg');
    if (amenity) {
      leg.innerText = amenity;
      leg.title = amenity;
      if (amenity.cssClass) {
        leg.classList.add(amenity.cssClass);
      }
    }
    return leg;
  }

  let elem = document.createElement('div')
  elem.classList.add(amenityName);
  legs.forEach((leg) => {
    let amenity = leg[amenityName];
    elem.appendChild(legElem(amenity));
  });
  return elem;
}

function buildAmenitiesIcon(legs, amenityName) {
  function legElem(amenity) {
    let leg = document.createElement('div');
    leg.classList.add('leg');
    if (isBoolean(amenity)) {
      if (!amenity) {
        leg.classList.add('none');
      }
    } else { // Not boolean. Add the value into classname instead.
      leg.classList.add(amenity);
    }
    return leg;
  }

  let elem = document.createElement('div')
  elem.classList.add(amenityName);
  legs.forEach((leg) => {
    let amenity = leg[amenityName];
    elem.appendChild(legElem(amenity));
  });
  return elem;
}

function isBoolean(value) {
  if ((!!value).toString() == value) {
    return true;
  }
  return false;
}

// Look for expandable list items and augment them all.
function queryAndExtend() {
  let nodes = document.querySelectorAll('div[role="listitem"][data-id]');
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

window.taco5.flightdata.addListener(function(id, data) {
  let extensionElem =
      document.querySelector('div.legroom-row-extend[itin-id="' + id + '"]');
  if (extensionElem) {
    updateRow(extensionElem, data);
  }
});

})(); // Close closure wrap.
