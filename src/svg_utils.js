export function $(expr, con) {
  return typeof expr === "string"
    ? (con || document).querySelector(expr)
    : expr || null;
}

export function createSVG(tag, attrs) {
  const elem = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (let attr in attrs) {
    if (attr === "append_to") {
      const parent = attrs.append_to;
      parent.appendChild(elem);
    } else if (attr === "innerHTML") {
      elem.innerHTML = attrs.innerHTML;
    } else if (attr === 'clipPath') {
      elem.setAttribute('clip-path', 'url(#' + attrs[attr] + ')');
    } else {
      elem.setAttribute(attr, attrs[attr]);
    }
  }
  return elem;
}

export function animateSVG(svgElement, attr, from, to) {
  const animatedSvgElement = getAnimationElement(svgElement, attr, from, to);

  if (animatedSvgElement === svgElement) {
    // triggered 2nd time programmatically
    // trigger artificial click event
    const event = document.createEvent("HTMLEvents");
    event.initEvent("click", true, true);
    event.eventName = "click";
    animatedSvgElement.dispatchEvent(event);
  }
}

function getAnimationElement(
  svgElement,
  attr,
  from,
  to,
  dur = "0.4s",
  begin = "0.1s",
) {
  const animEl = svgElement.querySelector("animate");
  if (animEl) {
    $.attr(animEl, {
      attributeName: attr,
      from,
      to,
      dur,
      begin: "click + " + begin, // artificial click
    });
    return svgElement;
  }

  const animateElement = createSVG("animate", {
    attributeName: attr,
    from,
    to,
    dur,
    begin,
    calcMode: "spline",
    values: from + ";" + to,
    keyTimes: "0; 1",
    keySplines: cubic_bezier("ease-out"),
  });
  svgElement.appendChild(animateElement);

  return svgElement;
}

function cubic_bezier(name) {
  return {
    ease: ".25 .1 .25 1",
    linear: "0 0 1 1",
    "ease-in": ".42 0 1 1",
    "ease-out": "0 0 .58 1",
    "ease-in-out": ".42 0 .58 1",
  }[name];
}

$.on = (element, event, selector, callback) => {
  if (!callback) {
    callback = selector;
    $.bind(element, event, callback);
  } else {
    $.delegate(element, event, selector, callback);
  }
};

$.off = (element, event, handler) => {
  element.removeEventListener(event, handler);
};

$.bind = (element, event, callback) => {
  event.split(/\s+/).forEach(function (event) {
    element.addEventListener(event, callback);
  });
};

$.delegate = (element, event, selector, callback) => {
  element.addEventListener(event, function (e) {
    const delegatedTarget = e.target.closest(selector);
    if (delegatedTarget) {
      e.delegatedTarget = delegatedTarget;
      callback.call(this, e, delegatedTarget);
    }
  });
};

$.closest = (selector, element) => {
  if (!element) return null;

  if (element.matches(selector)) {
    return element;
  }

  return $.closest(selector, element.parentNode);
};

$.attr = (element, attr, value) => {
  if (!value && typeof attr === "string") {
    return element.getAttribute(attr);
  }

  if (typeof attr === "object") {
    for (let key in attr) {
      $.attr(element, key, attr[key]);
    }
    return;
  }

  element.setAttribute(attr, value);
};

$.throttle = function (delay, noTrailing, callback, debounceMode) {
    // After wrapper has stopped being called, this timeout ensures that
    // `callback` is executed at the proper times in `throttle` and `end`
    // debounce modes.
    var timeoutID;

    // Keep track of the last time `callback` was executed.
    var lastExec = 0;

    // `noTrailing` defaults to falsy.
    if (typeof noTrailing !== 'boolean') {
        debounceMode = callback;
        callback = noTrailing;
        noTrailing = undefined;
    }

    // The `wrapper` function encapsulates all of the throttling / debouncing
    // functionality and when executed will limit the rate at which `callback`
    // is executed.
    function wrapper() {
        var self = this;
        var elapsed = Number(new Date()) - lastExec;
        var args = arguments;

        // Execute `callback` and update the `lastExec` timestamp.
        function exec() {
            lastExec = Number(new Date());
            callback.apply(self, args);
        }

        // If `debounceMode` is true (at begin) this is used to clear the flag
        // to allow future `callback` executions.
        function clear() {
            timeoutID = undefined;
        }

        if (debounceMode && !timeoutID) {
            // Since `wrapper` is being called for the first time and
            // `debounceMode` is true (at begin), execute `callback`.
            exec();
        }

        // Clear any existing timeout.
        if (timeoutID) {
            clearTimeout(timeoutID);
        }

        if (debounceMode === undefined && elapsed > delay) {
            // In throttle mode, if `delay` time has been exceeded, execute
            // `callback`.
            exec();
        } else if (noTrailing !== true) {
            // In trailing throttle mode, since `delay` time has not been
            // exceeded, schedule `callback` to execute `delay` ms after most
            // recent execution.
            //
            // If `debounceMode` is true (at begin), schedule `clear` to execute
            // after `delay` ms.
            //
            // If `debounceMode` is false (at end), schedule `callback` to
            // execute after `delay` ms.
            timeoutID = setTimeout(
                debounceMode ? clear : exec,
                debounceMode === undefined ? delay - elapsed : delay,
            );
        }
    }

    // Return the wrapper function.
    return wrapper;
};
