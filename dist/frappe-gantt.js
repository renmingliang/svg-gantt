var Gantt = (function () {
  'use strict';

  const YEAR = "year";
  const MONTH = "month";
  const DAY = "day";
  const HOUR = "hour";
  const MINUTE = "minute";
  const SECOND = "second";
  const MILLISECOND = "millisecond";

  const SHORTENED = {
    January: "Jan",
    February: "Feb",
    March: "Mar",
    April: "Apr",
    May: "May",
    June: "Jun",
    July: "Jul",
    August: "Aug",
    September: "Sep",
    October: "Oct",
    November: "Nov",
    December: "Dec"
  };

  var date_utils = {
    parse_duration(duration) {
      const regex = /([0-9]{1,})+(y|m|d|h|min|s|ms)/gm;
      const matches = regex.exec(duration);

      if (matches !== null) {
        if (matches[2] === 'y') {
          return { duration: parseInt(matches[1]), scale: `year` };
        } else if (matches[2] === 'm') {
          return { duration: parseInt(matches[1]), scale: `month` };
        } else if (matches[2] === 'd') {
          return { duration: parseInt(matches[1]), scale: `day` };
        } else if (matches[2] === 'h') {
          return { duration: parseInt(matches[1]), scale: `hour` };
        } else if (matches[2] === 'min') {
          return { duration: parseInt(matches[1]), scale: `minute` };
        } else if (matches[2] === 's') {
          return { duration: parseInt(matches[1]), scale: `second` };
        } else if (matches[2] === 'ms') {
          return { duration: parseInt(matches[1]), scale: `millisecond` };
        }
      }
    },
    parse(date, date_separator = '-', time_separator = /[.:]/) {
      if (date instanceof Date) {
        return date;
      }
      if (typeof date === 'string') {
        let date_parts, time_parts;
        const parts = date.split(' ');
        date_parts = parts[0]
          .split(date_separator)
          .map((val) => parseInt(val, 10));
        time_parts = parts[1] && parts[1].split(time_separator);

        // month is 0 indexed
        date_parts[1] = date_parts[1] ? date_parts[1] - 1 : 0;

        let vals = date_parts;

        if (time_parts && time_parts.length) {
          if (time_parts.length === 4) {
            time_parts[3] = '0.' + time_parts[3];
            time_parts[3] = parseFloat(time_parts[3]) * 1000;
          }
          vals = vals.concat(time_parts);
        }
        return new Date(...vals);
      }
    },

    to_string(date, with_time = false) {
      if (!(date instanceof Date)) {
        throw new TypeError('Invalid argument type');
      }
      const vals = this.get_date_values(date).map((val, i) => {
        if (i === 1) {
          // add 1 for month
          val = val + 1;
        }

        if (i === 6) {
          return padStart(val + '', 3, '0');
        }

        return padStart(val + '', 2, '0');
      });
      const date_string = `${vals[0]}-${vals[1]}-${vals[2]}`;
      const time_string = `${vals[3]}:${vals[4]}:${vals[5]}.${vals[6]}`;

      return date_string + (with_time ? ' ' + time_string : '');
    },

    format(date, format_string = 'YYYY-MM-DD HH:mm:ss.SSS', lang = 'en') {
      const dateTimeFormat = new Intl.DateTimeFormat(lang, {
        month: 'long',
      });
      const month_name = dateTimeFormat.format(date);
      const month_name_capitalized =
        month_name.charAt(0).toUpperCase() + month_name.slice(1);

      const values = this.get_date_values(date);
      const format_map = {
        YYYY: values[0],
        MM: padStart(values[1] + 1, 2, 0),
        DD: padStart(values[2], 2, 0),
        HH: padStart(values[3], 2, 0),
        mm: padStart(values[4], 2, 0),
        ss: padStart(values[5], 2, 0),
        M: values[1] + 1,
        D: values[2],
        h: values[3],
        m: values[4],
        s: values[5],
        SSS: values[6],
        Q: Math.floor(values[1] / 3) + 1,
        MMMM: month_name_capitalized,
        MMM: SHORTENED[month_name_capitalized] || month_name_capitalized,
      };

      let str = format_string;
      const formatted_values = [];

      Object.keys(format_map)
        .sort((a, b) => b.length - a.length) // big string first
        .forEach((key) => {
          if (str.includes(key)) {
            str = str.replaceAll(key, `$${formatted_values.length}`);
            formatted_values.push(format_map[key]);
          }
        });

      formatted_values.forEach((value, i) => {
        str = str.replaceAll(`$${i}`, value);
      });

      return str;
    },

    diff(date_a, date_b, scale = DAY) {
      let milliseconds, seconds, hours, minutes, days, months, years;

      milliseconds = date_a - date_b;
      seconds = milliseconds / 1000;
      minutes = seconds / 60;
      hours = minutes / 60;
      days = hours / 24;
      months = days / 30;
      years = months / 12;

      if (!scale.endsWith('s')) {
        scale += 's';
      }

      return Math.floor(
        {
          milliseconds,
          seconds,
          minutes,
          hours,
          days,
          months,
          years,
        }[scale],
      );
    },

    today() {
      const vals = this.get_date_values(new Date()).slice(0, 3);
      return new Date(...vals);
    },

    now() {
      return new Date();
    },

    add(date, qty, scale) {
      qty = parseInt(qty, 10);
      const vals = [
        date.getFullYear() + (scale === YEAR ? qty : 0),
        date.getMonth() + (scale === MONTH ? qty : 0),
        date.getDate() + (scale === DAY ? qty : 0),
        date.getHours() + (scale === HOUR ? qty : 0),
        date.getMinutes() + (scale === MINUTE ? qty : 0),
        date.getSeconds() + (scale === SECOND ? qty : 0),
        date.getMilliseconds() + (scale === MILLISECOND ? qty : 0),
      ];
      return new Date(...vals);
    },

    start_of(date, scale) {
      const scores = {
        [YEAR]: 6,
        [MONTH]: 5,
        [DAY]: 4,
        [HOUR]: 3,
        [MINUTE]: 2,
        [SECOND]: 1,
        [MILLISECOND]: 0,
      };

      function should_reset(_scale) {
        const max_score = scores[scale];
        return scores[_scale] <= max_score;
      }

      const vals = [
        date.getFullYear(),
        should_reset(YEAR) ? 0 : date.getMonth(),
        should_reset(MONTH) ? 1 : date.getDate(),
        should_reset(DAY) ? 0 : date.getHours(),
        should_reset(HOUR) ? 0 : date.getMinutes(),
        should_reset(MINUTE) ? 0 : date.getSeconds(),
        should_reset(SECOND) ? 0 : date.getMilliseconds(),
      ];

      return new Date(...vals);
    },

    clone(date) {
      return new Date(...this.get_date_values(date));
    },

    get_date_values(date) {
      return [
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
      ];
    },

    get_days_in_month(date) {
      const no_of_days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      const month = date.getMonth();

      if (month !== 1) {
        return no_of_days[month];
      }

      // Feb
      const year = date.getFullYear();
      if ((year % 4 === 0 && year % 100 != 0) || year % 400 === 0) {
        return 29;
      }
      return 28;
    },

    get_days_in_quarter_year(date) {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      let days = 0;
      let start = (quarter - 1) * 3;
      for (let index = start; index < 3 * quarter; index++) {
        days += this.get_days_in_month(new Date(date.setMonth(index)));
      }
      return days;
    },

    get_days_in_year(date) {
      const feb_date = date.setMonth(1);
      return this.get_days_in_month(new Date(feb_date)) + 337;
    },
  };

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
  function padStart(str, targetLength, padString) {
    str = str + "";
    targetLength = targetLength >> 0;
    padString = String(typeof padString !== "undefined" ? padString : " ");
    if (str.length > targetLength) {
      return String(str);
    } else {
      targetLength = targetLength - str.length;
      if (targetLength > padString.length) {
        padString += padString.repeat(targetLength / padString.length);
      }
      return padString.slice(0, targetLength) + String(str);
    }
  }

  function $(expr, con) {
    return typeof expr === "string"
      ? (con || document).querySelector(expr)
      : expr || null;
  }

  function createSVG(tag, attrs) {
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

  function animateSVG(svgElement, attr, from, to) {
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

  const VIEW_MODE = {
    HOUR: "Hour",
    QUARTER_DAY: "Quarter Day",
    HALF_DAY: "Half Day",
    DAY: "Day",
    WEEK: "Week",
    MONTH: "Month",
    QUARTER_YEAR: "Quarter Year",
    YEAR: "Year",
  };

  const getLang = function(lan) {
    if (lan === 'zh') {
      return LAN_ZH;
    } else {
      return LAN_EN;
    }
  };

  const LAN_ZH = {
    HOUR: "时",
    QUARTER_DAY: "季时",
    HALF_DAY: "半天",
    DAY: "日",
    WEEK: "周",
    MONTH: "月",
    QUARTER_YEAR: "季",
    YEAR: "年",
    TODAY: "今天"
  };

  const LAN_EN = {
    HOUR: 'Hour',
    QUARTER_DAY: 'Quarter Day',
    HALF_DAY: 'Half Day',
    DAY: 'Day',
    WEEK: 'Week',
    MONTH: 'Month',
    QUARTER_YEAR: 'Quarter Year',
    YEAR: 'Year',
    TODAY: "Today"
  };

  const version = '1.0.0';

  class Bar {
    constructor(gantt, task) {
      this.set_defaults(gantt, task);
      this.prepare();
      this.draw();
      this.bind();
    }

    set_defaults(gantt, task) {
      this.action_completed = false;
      this.gantt = gantt;
      this.task = task;
    }

    prepare() {
      this.prepare_doms();
      this.prepare_values();
      this.prepare_helpers();
    }

    prepare_doms() {
      this.group = createSVG("g", {
        class: "bar-wrapper" + (this.task.custom_class ? " " + this.task.custom_class : "") + (this.task.important ? ' important' : ''),
        "data-id": this.task._id,
      });
      this.bar_group = createSVG("g", {
        class: "bar-group",
        append_to: this.group,
      });
      this.handle_group = createSVG("g", {
        class: "handle-group",
        append_to: this.group,
      });
    }

    prepare_values() {
      this.empty = this.task._empty;
      this.invalid = this.task._invalid;
      this.height = this.gantt.options.bar_height;
      this.image_size = this.height - 5;
      this.compute_x();
      this.compute_y();
      this.compute_duration();
      this.corner_radius = this.gantt.options.bar_corner_radius;
      this.width = this.gantt.options.column_width * this.duration;
      this.progress_width =
        this.gantt.options.column_width *
        this.duration *
        (this.task._progress / 100) || 0;
    }

    prepare_helpers() {
      SVGElement.prototype.getX = function () {
        return +this.getAttribute("x");
      };
      SVGElement.prototype.getY = function () {
        return +this.getAttribute("y");
      };
      SVGElement.prototype.getWidth = function () {
        return +this.getAttribute("width");
      };
      SVGElement.prototype.getHeight = function () {
        return +this.getAttribute("height");
      };
      SVGElement.prototype.getEndX = function () {
        return this.getX() + this.getWidth();
      };
    }

    prepare_expected_progress_values() {
      this.compute_expected_progress();
      this.expected_progress_width =
        this.gantt.options.column_width *
        this.duration *
        (this.expected_progress / 100) || 0;
    }

    draw() {
      if (this.empty) return;
      this.draw_bar();
      this.draw_progress_bar();
      if (this.gantt.options.show_expected_progress) {
        this.prepare_expected_progress_values();
        this.draw_expected_progress_bar();
      }
      this.draw_label();
      this.draw_resize_handles();

      if (this.task.thumbnail) {
        this.draw_thumbnail();
      }
    }

    draw_bar() {
      this.$bar = createSVG("rect", {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        rx: this.corner_radius,
        ry: this.corner_radius,
        class: "bar-inner",
        append_to: this.bar_group,
      });

      animateSVG(this.$bar, "width", 0, this.width);

      if (this.invalid) {
        this.$bar.classList.add("bar-invalid");
      }
    }

    draw_expected_progress_bar() {
      if (this.invalid) return;
      this.$expected_bar_progress = createSVG("rect", {
        x: this.x,
        y: this.y,
        width: this.expected_progress_width,
        height: this.height,
        rx: this.corner_radius,
        ry: this.corner_radius,
        class: "bar-expected-progress",
        append_to: this.bar_group,
      });

      animateSVG(
        this.$expected_bar_progress,
        "width",
        0,
        this.expected_progress_width,
      );
    }

    draw_progress_bar() {
      if (this.invalid) return;
      this.$bar_progress = createSVG("rect", {
        x: this.x,
        y: this.y,
        width: this.progress_width,
        height: this.height,
        rx: this.corner_radius,
        ry: this.corner_radius,
        class: "bar-progress",
        append_to: this.bar_group,
      });
      animateSVG(this.$bar_progress, "width", 0, this.progress_width);
    }

    draw_label() {
      let x_coord = this.x + this.$bar.getWidth() / 2;

      if (this.task.thumbnail) {
        x_coord = this.x + 10 + this.image_size + 5;
      }

      createSVG("text", {
        x: x_coord,
        y: this.y + this.height / 2,
        innerHTML: this.task.name,
        class: "bar-label",
        append_to: this.bar_group,
      });
      // labels get BBox in the next tick
      requestAnimationFrame(() => this.update_label_position());
    }

    draw_thumbnail() {
      let x_offset = 10, y_offset = 2;
      let defs, clipPath;

      defs = createSVG('defs', {
        append_to: this.bar_group
      });

      createSVG('rect', {
        id: 'rect_' + this.task._id,
        x: this.x + x_offset,
        y: this.y + y_offset,
        width: this.image_size,
        height: this.image_size,
        rx: '15',
        class: 'img_mask',
        append_to: defs
      });

      clipPath = createSVG('clipPath', {
        id: 'clip_' + this.task._id,
        append_to: defs
      });

      createSVG('use', {
        href: '#rect_' + this.task._id,
        append_to: clipPath
      });

      createSVG('image', {
        x: this.x + x_offset,
        y: this.y + y_offset,
        width: this.image_size,
        height: this.image_size,
        class: 'bar-img',
        href: this.task.thumbnail,
        clipPath: 'clip_' + this.task._id,
        append_to: this.bar_group
      });
    }

    draw_resize_handles() {
      const bar = this.$bar;
      const handle_width = this.gantt.options.handle_width;

      const gw = bar.getWidth();

      createSVG("rect", {
        x: bar.getX() + 1,
        y: bar.getY() + 1,
        width: handle_width,
        height: this.height - 2,
        rx: this.corner_radius,
        ry: this.corner_radius,
        class: "handle left",
        append_to: this.handle_group,
      });

      createSVG("rect", {
        x: bar.getX() + (gw > handle_width ? (gw - handle_width - 1) : gw),
        y: bar.getY() + 1,
        width: handle_width,
        height: this.height - 2,
        rx: this.corner_radius,
        ry: this.corner_radius,
        class: "handle right",
        append_to: this.handle_group,
      });

      if (this.gantt.options.drag_bar_progress) {
        this.$handle_progress = createSVG('polygon', {
          points: this.get_progress_polygon_points().join(','),
          class: 'handle progress',
          append_to: this.handle_group,
        });
      }
    }

    get_progress_polygon_points() {
      const bar_progress = this.$bar_progress;
      if (!bar_progress) return [];

      const icon_width = 10;
      const icon_height = 15;
      return [
        bar_progress.getEndX() - icon_width / 2,
        bar_progress.getY() + bar_progress.getHeight() / 2,

        bar_progress.getEndX(),
        bar_progress.getY() + bar_progress.getHeight() / 2 - icon_height / 2,

        bar_progress.getEndX() + icon_width / 2,
        bar_progress.getY() + bar_progress.getHeight() / 2,

        bar_progress.getEndX(),
        bar_progress.getY() + bar_progress.getHeight() / 2 + icon_height / 2,

        bar_progress.getEndX() - icon_width / 2,
        bar_progress.getY() + bar_progress.getHeight() / 2,
      ];
    }

    bind() {
      this.setup_click_event();
    }

    setup_click_event() {
      $.on(this.group, "mouseover", (e) => {
        this.gantt.trigger_event("hover", [this.task, e.screenX, e.screenY, e]);
      });

      let timeout;
      $.on(this.group, "mouseenter", (e) => timeout = setTimeout(() => {
        const scrollLeft = this.gantt.$container_main.scrollLeft;
        this.show_popup(e.offsetX - scrollLeft);
      }, 600));

      $.on(this.group, "mouseleave", () => {
        clearTimeout(timeout);
        this.gantt.hide_popup();
      });

      let clickTimeout;
      let clickCount = 0;
      $.on(this.group, 'click', () => {
        if (this.action_completed) {
          // just finished a move action, wait for a few seconds
          return;
        }

        clickCount += 1;
        if (clickCount === 1) {
          clickTimeout = setTimeout(() => {
              this.gantt.trigger_event('click', [this.task]);
              clickCount = 0;
          }, 250);
        } else {
          clearTimeout(clickTimeout);
          clickCount = 0;
        }
      });

      $.on(this.group, "dblclick", () => {
        clearTimeout(clickTimeout);
        clickCount = 0;
        this.gantt.trigger_event("double_click", [this.task]);
      });
    }

    show_popup(x) {
      if (this.gantt.bar_being_dragged) return;

      const start_date = date_utils.format(
        this.task._start,
        "MM月DD日",
        this.gantt.options.language,
      );
      const end_date = date_utils.format(
        date_utils.add(this.task._end, -1, "second"),
        "MM月DD日",
        this.gantt.options.language,
      );
      const subtitle = `${start_date} -  ${end_date}<br/>Progress: ${this.task.progress}`;

      this.gantt.show_popup({
        x,
        target_element: this.$bar,
        title: this.task.name,
        subtitle: subtitle,
        task: this.task,
      });
    }

    update_bar_task(task) {
      const old_task = this.task;
      this.action_completed = false;
      this.task = task;
      this.prepare_values();

      if (old_task.name !== task.name) {
        const label = this.bar_group.querySelector('.bar-label');
        if(label) label.innerHTML = task.name;
      }

      let cls = 'bar-wrapper';
      if (task.custom_class) {
        cls += ' ' + task.custom_class;
      }
      if (task.important) {
        cls += ' important';
      }
      $.attr(this.group, 'class', cls);
    }

    update_bar_vertical({ offset }) {
      // recalculate
      this.compute_y();

      if (this.empty) return;
      // update-bar_group
      Array.prototype.forEach.call(this.bar_group.children, function (el, i) {
        const y = $.attr(el, 'y') * 1;
        el.setAttribute('y', y + offset);
      });
      // update-thumbnail
      if (this.task.thumbnail) {
        const $thumbnail = this.bar_group.querySelector('#rect_' + this.task._id);
        const y = $.attr($thumbnail, 'y') * 1;
        $thumbnail.setAttribute('y', y + offset);
      }
      // update-handle_group
      Array.prototype.forEach.call(this.handle_group.children, function (el, i, arr) {
        const y = $.attr(el, 'y') * 1;
        el.setAttribute('y', y + offset);
      });
      // update-polygon
      const $handle = this.$handle_progress;
      if ($handle) {
        $handle.setAttribute('points', this.get_progress_polygon_points());
      }
    }

    update_bar_position({ x = null, width = null }) {
      const bar = this.$bar;
      if (x != undefined) {
        if (this.gantt.options.drag_limit_child) {
          // get all x values of parent task
          const xs = this.task.dependencies.map((dep) => {
            return this.gantt.get_bar(dep).$bar.getX();
          });
          // child task must not go before parent
          const valid_x = xs.reduce((_, curr) => {
            return x >= curr;
          }, x);

          if (!valid_x) {
            width = null;
            return;
          }
        }

        this.update_attr(bar, "x", x);
      }
      if (width != undefined) {
        this.update_attr(bar, "width", width);
      }

      this.update_label_position();
      this.update_handle_position();
      if (this.gantt.options.show_expected_progress) {
        this.date_changed();
        this.compute_duration();
        this.update_expected_progressbar_position();
      }
      this.update_progressbar_position();
      this.update_arrow_position();
    }

    update_label_position_on_horizontal_scroll({ x, sx }) {
      const container = document.querySelector('.gantt-container');
      const label = this.group.querySelector('.bar-label');
      const img = this.group.querySelector('.bar-img') || '';
      const img_mask = this.bar_group.querySelector('.img_mask') || '';

      let barWidthLimit = this.$bar.getX() + this.$bar.getWidth();
      let newLabelX = label.getX() + x;
      let newImgX = img && img.getX() + x || 0;
      let imgWidth = img && img.getBBox().width + 7 || 7;
      let labelEndX = newLabelX + label.getBBox().width + 7;
      let viewportCentral = sx + container.clientWidth / 2;

      if (label.classList.contains('big')) return;

      if (labelEndX < barWidthLimit && x > 0 && labelEndX < viewportCentral) {
        label.setAttribute('x', newLabelX);
        if (img) {
          img.setAttribute('x', newImgX);
          img_mask.setAttribute('x', newImgX);
        }
      } else if ((newLabelX - imgWidth) > this.$bar.getX() && x < 0 && labelEndX > viewportCentral) {
        label.setAttribute('x', newLabelX);
        if (img) {
          img.setAttribute('x', newImgX);
          img_mask.setAttribute('x', newImgX);
        }
      }
    }

    date_changed() {
      let changed = false;
      const { new_start_date, new_end_date } = this.compute_start_end_date();

      if (Number(this.task._start) !== Number(new_start_date)) {
        changed = true;
        this.task._start = new_start_date;
      }

      if (Number(this.task._end) !== Number(new_end_date)) {
        changed = true;
        this.task._end = new_end_date;
      }

      if (!changed) return;

      this.gantt.trigger_event("date_change", [
        this.task,
        new_start_date,
        date_utils.add(new_end_date, -1, "second"),
      ]);
    }

    progress_changed() {
      const new_progress = this.compute_progress();
      this.task.progress = new_progress;
      this.gantt.trigger_event("progress_change", [this.task, new_progress]);
    }

    set_action_completed() {
      this.action_completed = true;
      setTimeout(() => (this.action_completed = false), 800);
    }

    compute_start_end_date() {
      const bx = this.$bar.getX();
      const bw = this.$bar.getWidth();

      const new_start_date = this.gantt.get_snap_date(bx, this.gantt.gantt_start);
      const new_end_date = this.gantt.get_snap_date(bw, new_start_date);

      return { new_start_date, new_end_date };
    }

    compute_progress() {
      const bar_progress_width = this.$bar_progress ? this.$bar_progress.getWidth() : 0;
      const progress = (bar_progress_width / this.$bar.getWidth()) * 100;
      return parseInt(progress, 10);
    }

    compute_expected_progress() {
      this.expected_progress =
        date_utils.diff(date_utils.today(), this.task._start, "hour") /
        this.gantt.options.step;
      // Revision date after today
      if (this.expected_progress < 0) {
        this.expected_progress = 0;
      }
      this.expected_progress =
        ((this.expected_progress < this.duration
          ? this.expected_progress
          : this.duration) *
          100) /
        this.duration;
    }

    compute_x() {
      const { step, column_width } = this.gantt.options;
      const task_start = this.task._start;
      const gantt_start = this.gantt.gantt_start;

      const diff = date_utils.diff(task_start, gantt_start, "hour");
      let x = (diff / step) * column_width;

      if (this.gantt.view_is(VIEW_MODE.MONTH)) {
        const diff = date_utils.diff(task_start, gantt_start, "day");
        x = (diff * column_width) / 30;
      }
      this.x = x;
    }

    compute_y() {
      this.y = this.gantt.options.padding / 2 +
        this.task._index * (this.height + this.gantt.options.padding);
    }

    compute_duration() {
      this.duration =
        date_utils.diff(this.task._end, this.task._start, "hour") /
        this.gantt.options.step;
    }

    update_attr(element, attr, value) {
      value = +value;
      if (!isNaN(value)) {
        element.setAttribute(attr, value);
      }
      return element;
    }

    update_expected_progressbar_position() {
      if (!this.$expected_bar_progress) return;

      this.$expected_bar_progress.setAttribute("x", this.$bar.getX());

      this.prepare_expected_progress_values();
      this.$expected_bar_progress.setAttribute("width", this.expected_progress_width);
    }

    update_progressbar_position() {
      const bar_progress = this.$bar_progress;
      if (bar_progress) {
        bar_progress.setAttribute('x', this.$bar.getX());
        bar_progress.setAttribute(
          'width',
          this.$bar.getWidth() * (this.task.progress / 100),
        );
      }

      const $handle = this.$handle_progress;
      if ($handle) {
        $handle.setAttribute('points', this.get_progress_polygon_points());
      }
    }

    update_label_position() {
      const img_mask = this.bar_group.querySelector('.img_mask');
      const bar = this.$bar,
        label = this.group.querySelector(".bar-label"),
        img = this.group.querySelector('.bar-img');

      let x_offset = 10;
      let x_offset_label_img = this.image_size + 5;
      const barWidth = bar.getWidth();
      const labelWidth = label.getBBox().width;
      const contentWidth = labelWidth + (img ? x_offset_label_img : 0);
      if (contentWidth + x_offset > barWidth) {
        label.classList.add("big");
        if (img) {
          img.setAttribute('x', bar.getX() + barWidth + x_offset);
          img_mask.setAttribute('x', bar.getX() + barWidth + x_offset);
          label.setAttribute('x', bar.getX() + barWidth + x_offset + x_offset_label_img);
        } else {
          label.setAttribute('x', bar.getX() + barWidth + x_offset);
        }
      } else {
        label.classList.remove("big");
        if (img) {
          img.setAttribute('x', bar.getX() + x_offset);
          img_mask.setAttribute('x', bar.getX() + x_offset);
          label.setAttribute('x', bar.getX() + x_offset + x_offset_label_img);
        } else {
          label.setAttribute('x', bar.getX() + barWidth / 2 - contentWidth / 2);
        }
      }
    }

    update_handle_position() {
      const bar = this.$bar;
      const handle_width = this.gantt.options.handle_width;

      const $handle_left = this.handle_group.querySelector(".handle.left");
      if ($handle_left) {
        $handle_left.setAttribute('x', bar.getX() + 1);
      }
      const $handle_right = this.handle_group.querySelector(".handle.right");
      if ($handle_right) {
        $handle_right.setAttribute('x', bar.getEndX() - handle_width - 1);
      }
    }

    update_arrow_position() {
      this.arrows = this.arrows || [];
      for (let arrow of this.arrows) {
        arrow.update();
      }
    }
  }

  class Arrow {
    constructor(gantt, from_task, to_task) {
      this.gantt = gantt;
      this.from_task = from_task;
      this.to_task = to_task;

      this.calculate_path();
      this.draw();
      this.drawInner();
    }

    calculate_path() {
      if (this.from_task._empty || this.to_task._empty) return;

      const rowHeight = this.gantt.options.bar_height + this.gantt.options.padding;
      const taskHeight = this.gantt.options.bar_height;
      const arrowCurve = this.gantt.options.arrow_curve;
      // const arrowIndent = this.gantt.options.column_width / 2;
      const arrowIndent = 19; // fixed indent
      const taskFrom = this.from_task;
      const taskTo = this.to_task;

      const taskFromX2 = taskFrom.$bar.getEndX();
      const taskFromY1 = taskFrom.$bar.getY();
      const taskToX1 = taskTo.$bar.getX();
      const taskToY1 = taskTo.$bar.getY();

      const indexCompare = taskFrom.task._index > taskTo.task._index ? -1 : 1;
      const taskToEndPosition = taskToY1 + taskHeight / 2;
      const taskFromEndPosition = taskFromX2 + arrowIndent * 2;

      const taskFromHorizontalOffsetValue =
          taskFromEndPosition < taskToX1 ? '' : `H ${taskToX1 - arrowIndent}`;
      const taskToHorizontalOffsetValue =
          taskFromEndPosition > taskToX1
              ? arrowIndent
              : taskToX1 - taskFromX2 - arrowIndent;

      const path = `M ${taskFromX2} ${taskFromY1 + taskHeight / 2}
    h ${arrowIndent}
    v ${(indexCompare * rowHeight) / 2}
    ${taskFromHorizontalOffsetValue}
    V ${taskToEndPosition}
    h ${taskToHorizontalOffsetValue}`;

      const trianglePoints = `${taskToX1},${taskToEndPosition}
    ${taskToX1 - arrowCurve},${taskToEndPosition - arrowCurve}
    ${taskToX1 - arrowCurve},${taskToEndPosition + arrowCurve}`;

      this.path = path;

      this.points = trianglePoints;
    }

    draw() {
      this.element = createSVG("g", {
        "data-from": this.from_task.task._id,
        "data-to": this.to_task.task._id,
      });
    }

    drawInner() {
      if (this.from_task._empty || this.to_task._empty) return;

      this.svgPath = createSVG("path", {
        d: this.path,
        fill: "none",
        append_to: this.element
      });
      this.svgPolygon = createSVG("polygon", {
        points: this.points,
        append_to: this.element,
      });
    }

    update() {
      if (this.from_task._empty || this.to_task._empty) return;

      this.calculate_path();
      this.svgPath.setAttribute("d", this.path);
      this.svgPolygon.setAttribute("points", this.points);
    }
  }

  class Popup {
    constructor(gantt, parent) {
      this.gantt = gantt;
      this.parent = parent;
      this.custom_html = gantt.options.popup;
      this.make();
    }

    make() {
      this.parent.innerHTML = `
        <div class="title"></div>
        <div class="subtitle"></div>
    `;

      this.hide();

      this.title = this.parent.querySelector(".title");
      this.subtitle = this.parent.querySelector(".subtitle");
    }

    show(options) {
      if (!options.target_element) {
        throw new Error("target_element is required to show popup");
      }
      const target_element = options.target_element;

      if (typeof this.custom_html === 'function') {
        this.parent.innerHTML = this.custom_html(options.task);
      } else {
        // set data
        this.title.innerHTML = options.title;
        this.subtitle.innerHTML = options.subtitle;
      }

      // set position
      let position_meta;
      if (target_element instanceof HTMLElement) {
        position_meta = target_element.getBoundingClientRect();
      } else if (target_element instanceof SVGElement) {
        position_meta = target_element.getBBox();
      }

      this.parent.style.display = "block";
      this.parent.style.visibility = "hidden";

      const parentWidth = this.parent.clientWidth;
      const parentHeight = this.parent.clientHeight;
      const ganttOptions = this.gantt.options;
      const ganttWidth = this.gantt.$container.clientWidth;
      const ganttHeight = this.gantt.$container.clientHeight;

      const dy = this.gantt.$container_main.scrollTop;

      // get position
      let pos_x = options.x - parentWidth / 2;
      let pos_y =
          position_meta.y +
          position_meta.height +
          ganttOptions.header_height -
          dy +
          10;

      if (pos_y > ganttHeight - parentHeight) {
        pos_y = position_meta.y - parentHeight - 10 - dy + ganttOptions.header_height;
      }

      if (pos_x > ganttWidth - parentWidth) {
        const diff = pos_x - (ganttWidth - parentWidth - 5);
        pos_x -= diff;
      }

      if (pos_x < 0) {
        pos_x = 5;
      }

      this.parent.style.left = pos_x + "px";
      this.parent.style.top = pos_y + "px";

      // show
      this.parent.style.display = "block";
      this.parent.style.visibility = 'visible';
    }

    hide() {
      this.parent.style.display = "none";
      this.parent.style.visibility = 'hidden';
      this.parent.style.left = 0;
    }
  }

  class Backdrop {
    constructor(parent) {
      this.parent = parent;
      this.make();
    }

    make() {
      this.parent.innerHTML = `
      <div class="gantt-drag-mask">
        <div class="date-range"></div>
      </div>
    `;

      // this.hide();

      this.drag_mask = this.parent.querySelector('.gantt-drag-mask');
      this.date_range = this.parent.querySelector('.date-range');
    }

    showAt({ x, width, range }) {
      if (range && range.length) {
        const htmlHold = `<span>${range[0]}</span><span>${range[1]}</span>`;
        this.date_range.innerHTML = htmlHold;
      }

      this.drag_mask.style.left = x + 'px';
      this.drag_mask.style.width = width + 'px';

      this.show();
    }

    show() {
      this.parent.style.display = 'block';
      this.drag_mask.style.display = 'block';
    }

    hide() {
      this.parent.style.display = "none";
      this.drag_mask.style.display = "none";
    }
  }

  const VIEW_MODE_PADDING = {
    HOUR: ['7d', '7d'],
    QUARTER_DAY: ['7d', '7d'],
    HALF_DAY: ['7d', '7d'],
    DAY: ['1m', '1m'],
    WEEK: ['1m', '1m'],
    MONTH: ['1m', '1m'],
    QUARTER_YEAR: ['3m', '3m'],
    YEAR: ['1y', '1y'],
  };

  const TICK_LINE = {
    BOTH: 'both',
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
  };

  const DEFAULT_OPTIONS = {
    header_height: 65,
    header_tick: false,
    // column_width: 30,
    // step: 24,
    bar_height: 30,
    bar_corner_radius: 3,
    arrow_curve: 5,
    handle_width: 8,
    padding: 18,
    view_modes: [...Object.values(VIEW_MODE)],
    view_mode: VIEW_MODE.DAY,
    popup_trigger: 'click',
    show_expected_progress: false,
    dependencies: 'arrow',
    drag_ignore_hours: true,
    drag_bar_progress: true,
    drag_sync_child: false,
    drag_limit_child: false,
    popup: null,
    language: 'en',
    readonly: false,
    highlight_weekend: true,
    scroll_to: 'start',
    lines: TICK_LINE.BOTH,
    auto_move_label: true,
    today_button: true,
    view_mode_select: false,
  };

  class Gantt {
    constructor(wrapper, tasks, options) {
      this.version = version;
      this.setup_options(options);
      this.setup_wrapper(wrapper);

      this.setup_tasks(tasks);
      this.change_view_mode();
      this.bind_events();
    }

    setup_wrapper(element) {
      let svg_element, wrapper_element;

      // CSS Selector is passed
      if (typeof element === 'string') {
        element = document.querySelector(element);
      }

      // get the SVGElement
      if (element instanceof HTMLElement) {
        wrapper_element = element;
        svg_element = element.querySelector('svg');
      } else if (element instanceof SVGElement) {
        svg_element = element;
      } else {
        throw new TypeError(
          'Frappé Gantt only supports usage of a string CSS selector,' +
            " HTML DOM element or SVG DOM element for the 'element' parameter",
        );
      }

      // svg element
      if (!svg_element) {
        // create it
        this.$svg = createSVG('svg', {
          append_to: wrapper_element,
          class: 'gantt',
        });
      } else {
        this.$svg = svg_element;
        this.$svg.classList.add('gantt');
      }

      if (this.options.readonly) {
        this.$svg.classList.add('disabled');
      }

      // container element
      this.$container = document.createElement('div');
      this.$container.classList.add('gantt-container');

      // 1.header horizontal-scroll
      this.$container_header = document.createElement('div');
      this.$container_header.classList.add('gantt-container_header');
      this.$container.appendChild(this.$container_header);

      // 2.main vertical-scroll
      this.$container_main = document.createElement('div');
      this.$container_main.classList.add('gantt-container_main');
      this.$container.appendChild(this.$container_main);

      // 3. svg appendTo wrapper
      const parent_element = this.$svg.parentElement;
      parent_element.appendChild(this.$container);
      this.$container_main.appendChild(this.$svg);

      // 4. toobar wrapper
      this.$container_toolbar = document.createElement('div');
      this.$container_toolbar.classList.add('gantt-container_toolbar');
      this.$container.appendChild(this.$container_toolbar);

      // 5.popup wrapper
      this.$popup_wrapper = document.createElement('div');
      this.$popup_wrapper.classList.add('gantt-popup-wrapper');
      this.$container.appendChild(this.$popup_wrapper);

      // 6.backdrop wrapper
      this.$drag_backdrop = document.createElement('div');
      this.$drag_backdrop.classList.add('gantt-drag-backdrop');
      this.$container.appendChild(this.$drag_backdrop);
    }

    setup_options(options) {
      this.options = { ...DEFAULT_OPTIONS, ...options };
      if (!options.view_mode_padding) options.view_mode_padding = {};
      for (let [key, value] of Object.entries(options.view_mode_padding)) {
        if (typeof value === 'string') {
          // Configure for single value given
          options.view_mode_padding[key] = [value, value];
        }
      }

      this.options.view_mode_padding = {
        ...VIEW_MODE_PADDING,
        ...options.view_mode_padding,
      };
    }

    setup_tasks(tasks) {
      // prepare tasks
      this.tasks = tasks.map((task, i) => {
        return this.format_task(task, i);
      });

      this.setup_dependencies();
    }

    setup_dependencies() {
      this.dependency_map = {};
      for (let t of this.tasks) {
        this.format_dependency(t);
      }
    }

    format_task(task, i) {
      // reset symbol
      task._empty = false;
      task._invalid = false;
      task.progress = task.progress || 0;

      // convert to Date objects
      task._start = date_utils.parse(task.start);
      if (task.end === undefined && task.duration !== undefined) {
        task.end = task._start;
        let durations = task.duration.split(' ');

        durations.forEach((tmpDuration) => {
          let { duration, scale } = date_utils.parse_duration(tmpDuration);
          task.end = date_utils.add(task.end, duration, scale);
        });
      }
      task._end = date_utils.parse(task.end);
      let diff = date_utils.diff(task._end, task._start, 'year');
      if (diff < 0) {
        throw Error(
          "start of task can't be after end of task: in task #, " + (i + 1),
        );
      }
      // make task invalid if duration too large
      if (date_utils.diff(task._end, task._start, 'year') > 10) {
        task.end = null;
      }

      // cache index
      task._index = i;

      // invalid flag
      if (!task.start) {
        task._invalid = 'start';
      }
      if (!task.end) {
        task._invalid = 'end';
      }
      if (!task.start && !task.end) {
        task._start = null;
        task._end = null;
        task._empty = true;
        task._invalid = true;
      }

      // mock daterange
      if (task.start && !task.end) {
        task._end = date_utils.add(task._start, 2, 'day');
      }
      if (!task.start && task.end) {
        task._start = date_utils.add(task._end, -2, 'day');
      }

      // if hours is not set, assume the last day is full day
      // e.g: 2018-09-09 becomes 2018-09-09 23:59:59
      if (task._end) {
        const task_end_values = date_utils.get_date_values(task._end);
        if (task_end_values.slice(3).every((d) => d === 0)) {
          task._end = date_utils.add(task._end, 24, 'hour');
        }
      }

      // dependencies
      if (typeof task.dependencies === 'string' || !task.dependencies) {
        let deps = [];
        if (task.dependencies) {
          deps = task.dependencies
            .split(',')
            .map((d) => d.trim().replaceAll(' ', '_'))
            .filter((d) => d);
        }
        task.dependencies = deps;
      }

      // uids
      if (!task.id) {
        task._id = generate_id(task);
      } else {
        task._id = this.format_task_id(task);
      }

      return task;
    }

    format_task_id(task) {
      if (typeof task.id === 'string') {
        return task.id.replaceAll(' ', '_');
      } else {
        return task.id;
      }
    }

    format_dependency(task) {
      for (let d of task.dependencies) {
        this.dependency_map[d] = this.dependency_map[d] || [];
        this.dependency_map[d].push(task._id);
      }
    }

    refresh(tasks) {
      this.setup_tasks(tasks);
      this.change_view_mode();
    }

    update(task) {
      task._id = this.format_task_id(task);
      const original = this.get_task(task._id);
      if (!original) return;
      const current = Object.assign({}, original, task);
      const update_task = this.format_task(current, original._index);

      // empty daterange
      if (original._empty || update_task._empty) {
        this.replace(update_task, original);
        return;
      }

      // invalid daterange
      if (original._invalid !== update_task._invalid) {
        this.replace(update_task, original);
        return;
      }

      // update task
      this.tasks.splice(original._index, 1, update_task);
      const bar = this.get_bar(update_task._id);
      bar.update_bar_task(update_task);

      let move_x = bar.$bar.getX();
      let move_w = bar.$bar.getWidth();

      if (original._start !== update_task._start) {
        // calculate-left
        const start_date = date_utils.parse(update_task._start);
        const dx = this.get_snap_distance(original._start, start_date);
        move_x -= dx;
        move_w += dx;
      }

      if (original._end !== update_task._end) {
        // calculate-right
        const end_date = date_utils.parse(update_task._end);
        const dx = this.get_snap_distance(original._end, end_date);
        move_w -= dx;
      }

      // move
      bar.update_bar_position({
        x: move_x,
        width: move_w,
      });
    }

    remove(task) {
      let index = null;
      if (typeof task === 'object') {
        const tid = this.format_task_id(task);
        index = this.tasks.findIndex((item) => item._id === tid);
      } else {
        index = task;
      }
      if (index === -1 || index >= this.tasks.length) return;
      const row_height = this.options.bar_height + this.options.padding;

      // remove tasks bars
      const remove_bar = this.bars[index];
      this.layers.bar.removeChild(remove_bar.group);
      this.tasks.splice(index, 1);
      this.bars.splice(index, 1);

      // resort task._index
      let i = index;
      while (i < this.tasks.length) {
        this.tasks[i]._index = i;
        this.bars[i].update_bar_vertical({ offset: -row_height });
        i += 1;
      }

      // remove grid-row row-line
      const $rows = this.layers.grid.querySelector('.rows_layer');
      $rows.lastChild && $rows.removeChild($rows.lastChild);
      const $lines = this.layers.grid.querySelector('.lines_layer');
      $lines.lastChild && $lines.removeChild($lines.lastChild);

      // redraw arrows
      this.layers.arrow.innerHTML = '';
      this.make_arrows();
      this.map_arrows_on_bars();

      // update grid_height
      const grid_height = this.tasks.length * row_height;
      this.$svg.setAttribute('height', grid_height);
      this.$svg
        .querySelector('.grid-background')
        .setAttribute('height', grid_height);
    }

    insert(task, index) {
      let target;
      if (index === undefined) {
        target = this.tasks.length; // default end
      } else if (typeof index === 'object') {
        const tid = this.format_task_id(index);
        target = this.tasks.findIndex((task) => task._id === tid);
        target += 1; // target task
      } else {
        target = index; // target index
      }
      const insert_task = this.format_task(task, target);
      // resort task._index
      let i = target;
      while (i < this.tasks.length) {
        this.tasks[i]._index = i + 1;
        i += 1;
      }
      // insert task target
      this.tasks.splice(target, 0, insert_task);
      this.setup_dependencies();

      // calculate daterange
      let limit_start = null,
        limit_end = null;
      if (insert_task._start && insert_task._start < this.gantt_start) {
        limit_start = insert_task._start;
      }
      if (insert_task._end && insert_task._end > this.gantt_end) {
        limit_end = insert_task._end;
      }
      // out of limit date
      if (limit_start || limit_end) {
        this.update_gantt_dates({ start: limit_start, end: limit_end });
      }

      // update bars y
      const row_height = this.options.bar_height + this.options.padding;
      i = target;
      while (i < this.bars.length) {
        this.bars[i].update_bar_vertical({ offset: row_height });
        i += 1;
      }

      // insert bar
      const insert_bar = new Bar(this, insert_task);
      const target_bar = this.bars[target + 1];
      this.layers.bar.insertBefore(
        insert_bar.group,
        target_bar ? target_bar.group : null,
      );
      this.bars.splice(target, 0, insert_bar);

      // append grid-row
      const row_width = this.dates.length * this.options.column_width;
      const insert_y = (this.tasks.length - 1) * row_height;
      const $grid_el = this.layers.grid;
      createSVG('rect', {
        x: 0,
        y: insert_y,
        width: row_width,
        height: row_height,
        class: 'grid-row',
        append_to: $grid_el.querySelector('.rows_layer'),
      });
      // append row-line
      const $lines_layer = $grid_el.querySelector('.lines_layer');
      if ($lines_layer) {
        if (this.options.lines !== TICK_LINE.VERTICAL) {
          createSVG('line', {
            x1: 0,
            y1: insert_y + row_height,
            x2: row_width,
            y2: insert_y + row_height,
            class: 'row-line',
            append_to: $lines_layer,
          });
        }
      }

      // redraw arrows
      this.layers.arrow.innerHTML = '';
      this.make_arrows();
      this.map_arrows_on_bars();

      // update grid_height
      const grid_height = this.tasks.length * row_height;
      this.$svg.setAttribute('height', grid_height);
      this.$svg
        .querySelector('.grid-background')
        .setAttribute('height', grid_height);
    }

    replace(update_task, prev_task) {
      // Bar
      const update_bar = new Bar(this, update_task);

      // remove old_bar from bars and bar-layers
      const old_bar = this.bars[prev_task._index];
      this.layers.bar.removeChild(old_bar.group);
      this.bars.splice(prev_task._index, 1, update_bar);

      // replace update_bar and update tasks
      const target_postion = this.bars[prev_task._index + 1];
      this.layers.bar.insertBefore(
        update_bar.group,
        target_postion ? target_postion.group : null,
      );
      this.tasks.splice(prev_task._index, 1, update_task);

      // redraw arrows
      this.layers.arrow.innerHTML = '';
      this.make_arrows();
      this.map_arrows_on_bars();
    }

    change_view_mode(mode = this.options.view_mode) {
      const record_start = performance.now();
      this.update_view_scale(mode);
      this.setup_dates();
      this.render();
      const record_end = performance.now();
      const record_time = record_end - record_start;
      // fire viewmode_change event delay
      this.trigger_event('view_change', [mode, record_time]);
    }

    update_view_scale(view_mode) {
      this.options.view_mode = view_mode;
      if (view_mode === VIEW_MODE.HOUR) {
        this.options.step = 24 / 24;
        this.options.column_width = 38;
      } else if (view_mode === VIEW_MODE.QUARTER_DAY) {
        this.options.step = 24 / 4;
        this.options.column_width = 38;
      } else if (view_mode === VIEW_MODE.HALF_DAY) {
        this.options.step = 24 / 2;
        this.options.column_width = 38;
      } else if (view_mode === VIEW_MODE.DAY) {
        this.options.step = 24;
        this.options.column_width = 38;
      } else if (view_mode === VIEW_MODE.WEEK) {
        this.options.step = 24 * 7;
        this.options.column_width = 140;
      } else if (view_mode === VIEW_MODE.MONTH) {
        this.options.step = 24 * 30;
        this.options.column_width = 280;
      } else if (view_mode === VIEW_MODE.QUARTER_YEAR) {
        this.options.step = 24 * 90;
        this.options.column_width = 400;
      } else if (view_mode === VIEW_MODE.YEAR) {
        this.options.step = 24 * 365;
        this.options.column_width = 480;
      }
    }

    setup_dates() {
      this.setup_gantt_dates();
      this.setup_date_values();
    }

    setup_gantt_dates() {
      this.gantt_start = this.gantt_end = null;

      for (let task of this.tasks) {
        // set global start and end date
        if (
          !this.gantt_start ||
          (task._start && task._start < this.gantt_start)
        ) {
          this.gantt_start = task._start;
        }
        if (!this.gantt_end || (task._end && task._end > this.gantt_end)) {
          this.gantt_end = task._end;
        }
      }
      let gantt_start, gantt_end;
      if (!this.gantt_start) gantt_start = new Date();
      else gantt_start = date_utils.start_of(this.gantt_start, 'day');
      if (!this.gantt_end) gantt_end = new Date();
      else gantt_end = date_utils.start_of(this.gantt_end, 'day');

      // ensure today in daterange
      const today = date_utils.today();
      if (gantt_start > today) gantt_start = today;
      if (gantt_end < today) gantt_end = today;

      // ensure start inside quarter_year
      if (this.view_is(VIEW_MODE.QUARTER_YEAR)) {
        const mon = Math.floor(gantt_start.getMonth() / 3) * 3;
        gantt_start = new Date(gantt_start.setMonth(mon, 1));
      }

      // pad date start and end
      this.pad_gantt_dates(gantt_start, gantt_end);
    }

    pad_gantt_dates(start, end) {
      // add date padding on both sides
      let viewKey;
      for (let [key, value] of Object.entries(VIEW_MODE)) {
        if (value === this.options.view_mode) {
          viewKey = key;
        }
      }
      const [padding_start, padding_end] = this.options.view_mode_padding[
        viewKey
      ].map(date_utils.parse_duration);

      const gantt_start = date_utils.add(
        start,
        -padding_start.duration,
        padding_start.scale,
      );

      let format_string;
      if (this.view_is(VIEW_MODE.YEAR)) {
        format_string = 'YYYY';
      } else if (this.view_is([VIEW_MODE.MONTH, VIEW_MODE.QUARTER_YEAR])) {
        format_string = 'YYYY-MM';
      } else if (this.view_is(VIEW_MODE.DAY)) {
        format_string = 'YYYY-MM-DD';
      } else {
        format_string = 'YYYY-MM-DD HH';
      }
      this.gantt_start = date_utils.parse(
        date_utils.format(gantt_start, format_string),
      );
      this.gantt_start.setHours(0, 0, 0, 0);

      this.gantt_end = date_utils.add(
        end,
        padding_end.duration,
        padding_end.scale,
      );
      this.gantt_end.setHours(0, 0, 0, 0);
    }

    setup_date_values() {
      this.dates = [];
      let cur_date = null;

      while (cur_date === null || cur_date < this.gantt_end) {
        if (!cur_date) {
          cur_date = date_utils.clone(this.gantt_start);
        } else {
          if (this.view_is(VIEW_MODE.YEAR)) {
            cur_date = date_utils.add(cur_date, 1, 'year');
          } else if (this.view_is(VIEW_MODE.QUARTER_YEAR)) {
            cur_date = date_utils.add(cur_date, 3, 'month');
          } else if (this.view_is(VIEW_MODE.MONTH)) {
            cur_date = date_utils.add(cur_date, 1, 'month');
          } else {
            cur_date = date_utils.add(cur_date, this.options.step, 'hour');
          }
        }
        this.dates.push(cur_date);
      }
    }

    update_gantt_dates({ start, end }) {
      if (start && start < this.gantt_start) {
        this.old_gantt_start = this.gantt_start;
        const new_gantt_start = new Date(
          date_utils.add(start, -1, 'day').setHours(0, 0, 0, 0),
        );
        const left_dates = this.get_left_dates(
          new_gantt_start,
          this.old_gantt_start,
        );
        this.gantt_start = left_dates[0];

        const dx = this.get_snap_distance(this.old_gantt_start, this.gantt_start);
        this.scale_grid(dx);
        this.translate(dx);

        this.update_gantt_left(left_dates);
      }

      if (end && end > this.gantt_end) {
        this.old_gantt_end = this.gantt_end;
        const new_gantt_end = new Date(
          date_utils.add(end, 1, 'day').setHours(0, 0, 0, 0),
        );
        this.gantt_end = new_gantt_end;

        const dx = this.get_snap_distance(new_gantt_end, this.old_gantt_end);
        this.scale_grid(dx);

        this.update_gantt_right();
      }
    }

    update_gantt_left(left_dates) {
      // 绘制
      this.get_dates_to_draw(left_dates, null).forEach((date, i) => {
        this.draw_date(date, i);
      });
      // 合并
      this.dates = left_dates.concat(this.dates);
      // 高亮
      this.highlightWeekends(
        this.gantt_start,
        date_utils.add(this.old_gantt_start, -1, 'day'),
      );
      this.highlightToday();
      // 线条
      this.draw_col_tick(left_dates);
    }

    get_left_dates(start, end) {
      const left_dates = [];

      let start_temp = end;
      while (start_temp > start) {
        if (this.view_is(VIEW_MODE.YEAR)) {
          start_temp = date_utils.add(start_temp, -1, 'year');
        } else if (this.view_is(VIEW_MODE.QUARTER_YEAR)) {
          start_temp = date_utils.add(start_temp, -3, 'month');
        } else if (this.view_is(VIEW_MODE.MONTH)) {
          start_temp = date_utils.add(start_temp, -1, 'month');
        } else {
          start_temp = date_utils.add(start_temp, -this.options.step, 'hour');
        }

        left_dates.unshift(start_temp);
      }

      return left_dates;
    }

    update_gantt_right() {
      const initial_date = this.last_date_info.date;
      const right_dates = this.get_right_dates(initial_date, this.gantt_end);
      // 日期
      this.get_dates_to_draw(right_dates, this.last_date_info).forEach(
        (date, i) => {
          this.last_date_info = date;
          this.draw_date(date, i);
        },
      );
      // 合并
      this.dates = this.dates.concat(right_dates);
      // 高亮
      this.highlightWeekends(initial_date, this.gantt_end, true);
      this.highlightToday();
      // 线条
      this.draw_col_tick(right_dates, initial_date);
    }

    get_right_dates(start, end) {
      const right_dates = [];

      let start_temp = start;
      while (start_temp < end) {
        if (this.view_is(VIEW_MODE.YEAR)) {
          start_temp = date_utils.add(start_temp, 1, 'year');
        } else if (this.view_is(VIEW_MODE.QUARTER_YEAR)) {
          start_temp = date_utils.add(start_temp, 3, 'month');
        } else if (this.view_is(VIEW_MODE.MONTH)) {
          start_temp = date_utils.add(start_temp, 1, 'month');
        } else {
          start_temp = date_utils.add(start_temp, this.options.step, 'hour');
        }
        right_dates.push(start_temp);
      }
      return right_dates;
    }

    scale_grid(dx) {
      const old_grid_width = $.attr(this.$svg, 'width');
      const new_grid_width = old_grid_width * 1 + dx;
      // header
      this.$header.style.width = new_grid_width + 'px';
      // background
      $.attr(this.$svg, { width: new_grid_width });
      $.attr(this.$svg.querySelector('.grid-background'), {
        width: new_grid_width,
      });
      // rows
      const rows = this.layers.grid.querySelectorAll('.grid-row');
      rows.forEach((row) => $.attr(row, { width: new_grid_width }));
      // lines
      const lines = this.layers.grid.querySelectorAll('.row-line');
      lines.forEach((line) => $.attr(line, { x2: new_grid_width }));
    }

    translate(dx) {
      const uppers = this.$upper_header.querySelectorAll('.upper-text');
      uppers.forEach((u) => {
        const old_x = this.upper_texts_x[u.textContent];
        const new_x = old_x * 1 + dx;
        this.upper_texts_x[u.textContent] = new_x;

        u.classList.remove('current-upper');
        u.style.left = new_x + 'px';
      });

      const lowers = this.$lower_header.querySelectorAll('.lower-text');
      lowers.forEach((l) => {
        const old_x = l.style.left.replace('px', '');
        const new_x = old_x * 1 + dx;
        l.style.left = new_x + 'px';
      });

      const holidays = this.layers.grid.querySelectorAll('.holiday-highlight');
      holidays.forEach((h) => {
        const old_x = $.attr(h, 'x');
        const new_x = old_x * 1 + dx;
        $.attr(h, { x: new_x });
      });

      const ticks = this.layers.grid.querySelectorAll('.tick');
      ticks.forEach((tick) => {
        const dpath = $.attr(tick, 'd')
          .split(' ')
          .map((d, i) => {
            if (i === 1) {
              return d * 1 + dx;
            } else {
              return d;
            }
          })
          .join(' ');
        $.attr(tick, { d: dpath });
      });

      this.bars.forEach((bar) => {
        if (bar.empty) return;
        bar.update_bar_position({ x: bar.$bar.getX() + dx });
      });
    }

    set_readonly(bool) {
      this.options.readonly = bool;
      if (bool) {
        this.$svg.classList.add('disabled');
      } else {
        this.$svg.classList.remove('disabled');
      }
    }

    bind_events() {
      this.bind_grid_scroll();

      this.bind_grid_click();
      this.bind_bar_create();
      this.bind_bar_events();
    }

    render() {
      this.clear();
      this.setup_layers();
      this.make_grid();
      this.make_dates();
      this.make_bars();
      this.make_grid_extras();
      this.make_arrows();
      this.map_arrows_on_bars();
      this.set_scroll_position(this.options.scroll_to);
    }

    setup_layers() {
      this.layers = {};
      const layers = ['grid', 'today', 'arrow', 'progress', 'bar'];
      // make group layers
      for (let layer of layers) {
        this.layers[layer] = createSVG('g', {
          class: layer,
          append_to: this.$svg,
        });
      }
    }

    make_grid() {
      this.make_grid_background();
      this.make_grid_rows();
      this.make_grid_header();
      this.make_grid_toolbar();
    }

    make_grid_extras() {
      this.make_grid_highlights();
      this.make_grid_ticks();
    }

    make_grid_background() {
      const grid_width = this.dates.length * this.options.column_width;
      const grid_height =
        (this.options.bar_height + this.options.padding) * this.tasks.length;

      createSVG('rect', {
        x: 0,
        y: 0,
        width: grid_width,
        height: grid_height,
        class: 'grid-background',
        append_to: this.$svg,
      });

      const scroll_height = this.options.height
        ? this.options.height + 'px'
        : `calc(100% - ${this.options.header_height + 1}px`;
      this.$container_main.style.height = scroll_height;
      this.$container_main.style.width = '100%';
      this.$container_main.style.overflow = 'auto';
      this.$container_main.style.position = 'relative';
      this.$container.style.overflow = 'hidden';

      $.attr(this.$svg, {
        height: grid_height,
        width: grid_width,
      });
    }

    make_grid_rows() {
      const row_width = this.dates.length * this.options.column_width;
      const row_height = this.options.bar_height + this.options.padding;

      let row_y = 0;
      const fragment = document.createDocumentFragment();
      for (let _ of this.tasks) {
        createSVG('rect', {
          x: 0,
          y: row_y,
          width: row_width,
          height: row_height,
          class: 'grid-row',
          append_to: fragment,
        });
        if (
          this.options.lines === TICK_LINE.BOTH ||
          this.options.lines === TICK_LINE.HORIZONTAL
        ) ;

        row_y += this.options.bar_height + this.options.padding;
      }

      const $rows_layer = createSVG('g', {
        class: 'rows_layer',
        append_to: this.layers.grid,
      });
      $rows_layer.appendChild(fragment);
    }

    make_grid_header() {
      const grid_width = this.dates.length * this.options.column_width;
      let $header = document.createElement('div');
      $header.style.height = this.options.header_height + 'px';
      $header.style.width = grid_width + 'px';
      $header.classList.add('grid-header');
      this.$header = $header;

      let $upper_header = document.createElement('div');
      $upper_header.classList.add('upper-header');
      this.$upper_header = $upper_header;
      this.$header.appendChild($upper_header);

      let $lower_header = document.createElement('div');
      $lower_header.classList.add('lower-header');
      this.$lower_header = $lower_header;
      this.$header.appendChild($lower_header);

      let $line_header = document.createElement('div');
      $line_header.classList.add('line-header');
      this.$line_header = $line_header;
      this.$header.appendChild($line_header);

      this.$container_header.appendChild(this.$header);
    }

    make_grid_toolbar() {
      if (!this.options.view_mode_select && !this.options.today_button) return;

      const $side_header = this.$container_toolbar;
      const lang = getLang(this.options.language);

      // Create view mode change select
      if (this.options.view_mode_select) {
        const $select = document.createElement('select');
        $select.classList.add('viewmode-select');

        const modes = this.options.view_modes;
        const modes_values = Object.values(VIEW_MODE);
        const modes_keys = Object.keys(VIEW_MODE);
        for (const key in modes) {
          const $option = document.createElement('option');
          const val = modes[key];
          const index = modes_values.findIndex((vm) => vm === val);
          const label = modes_keys[index];
          $option.value = val;
          $option.textContent = lang[label] || val;
          $select.appendChild($option);
        }
        $select.value = this.options.view_mode;
        $select.addEventListener(
          'change',
          function () {
            this.change_view_mode($select.value);
          }.bind(this),
        );
        $side_header.appendChild($select);
      }

      // Create today button
      if (this.options.today_button) {
        let $today_button = document.createElement('button');
        $today_button.classList.add('today-button');
        $today_button.textContent = lang.TODAY;
        $today_button.onclick = this.scroll_today.bind(this);
        $side_header.appendChild($today_button);
      }

      // position
      const top = Math.max(0, this.options.header_height - 50 - 5);
      $side_header.style.top = top + 'px';
    }

    make_grid_ticks() {
      if (!Object.values(TICK_LINE).includes(this.options.lines)) return;
      this.draw_row_line();

      this.draw_col_tick(this.dates);
    }

    draw_row_line() {
      let row_y = 0;
      const row_width = this.dates.length * this.options.column_width;
      const row_height = this.options.bar_height + this.options.padding;
      const row_fragment = document.createDocumentFragment();
      if (this.options.lines !== TICK_LINE.VERTICAL) {
        for (let _ of this.tasks) {
          createSVG('line', {
            x1: 0,
            y1: row_y + row_height,
            x2: row_width,
            y2: row_y + row_height,
            class: 'row-line',
            append_to: row_fragment,
          });
          row_y += row_height;
        }
      }
      const $lines_layer = createSVG('g', {
        class: 'lines_layer',
        append_to: this.layers.grid,
      });
      $lines_layer.appendChild(row_fragment);
    }

    draw_col_tick(dates, target) {
      if (this.options.lines === TICK_LINE.HORIZONTAL) return;

      let tick_x = 0;
      if (target) {
        const dc = this.get_snap_distance(target, this.gantt_start);
        tick_x = dc + this.get_date_width(target);
      }
      const data_height =
        (this.options.bar_height + this.options.padding) * this.tasks.length;
      const tick_height = Math.max(5000, data_height);

      const tick_fragment = document.createDocumentFragment();
      for (let date of dates) {
        let tick_class = 'tick';
        if (this.get_thick_mode(date)) {
          tick_class += ' thick';
        }

        createSVG('path', {
          d: `M ${tick_x} 0 v ${tick_height}`,
          class: tick_class,
          append_to: tick_fragment,
        });

        tick_x += this.get_date_width(date);
      }

      const $el = this.layers.grid.querySelector('.ticks_layer');
      if ($el) {
        if (target) {
          $el.appendChild(tick_fragment);
        } else {
          $el.insertBefore(tick_fragment, $el.firstChild);
        }
      } else {
        const $ticks_layer = createSVG('g', {
          class: 'ticks_layer',
          append_to: this.layers.grid,
        });
        $ticks_layer.appendChild(tick_fragment);
      }
    }

    get_thick_mode(date) {
      let thick = false;
      // for day
      if (this.view_is(VIEW_MODE.DAY) && date.getDate() === 1) {
        thick = true;
      }
      // for first week
      if (
        this.view_is(VIEW_MODE.WEEK) &&
        date.getDate() >= 1 &&
        date.getDate() < 8
      ) {
        thick = true;
      }
      // for month
      if (this.view_is(VIEW_MODE.MONTH) && date.getMonth() % 3 === 0) {
        thick = true;
      }
      // for quarter_year
      if (this.view_is(VIEW_MODE.QUARTER_YEAR) && Math.floor(date.getMonth() / 3) === 0) {
        thick = true;
      }
      // for year
      if (this.view_is(VIEW_MODE.YEAR)) {
        thick = true;
      }
      return thick;
    }

    get_date_width(date) {
      if (this.view_is(VIEW_MODE.YEAR)) {
        return (
          (date_utils.get_days_in_year(date) * this.options.column_width) / 365
        );
      } else if (this.view_is(VIEW_MODE.QUARTER_YEAR)) {
        return (
          (date_utils.get_days_in_quarter_year(date) * this.options.column_width) / 90
        );
      } else if (this.view_is(VIEW_MODE.MONTH)) {
        return (
          (date_utils.get_days_in_month(date) * this.options.column_width) / 30
        );
      } else {
        return this.options.column_width;
      }
    }

    computeGridHighlightDimensions(view_mode) {
      const today = date_utils.today();
      let x = view_mode === VIEW_MODE.DAY ? this.options.column_width / 2 : 0;

      return {
        x: x + this.get_snap_distance(today, this.gantt_start),
        date: today,
      };
    }

    make_grid_highlights() {
      this.highlightWeekends(this.gantt_start, this.gantt_end);
      this.highlightToday();
    }

    highlightWeekends(start, end, append) {
      if (!this.options.highlight_weekend) return;
      if (!this.view_is([VIEW_MODE.DAY, VIEW_MODE.HALF_DAY])) return;

      const weekends_fragment = document.createDocumentFragment();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) {
          const x = this.get_snap_distance(d, this.gantt_start);
          createSVG('rect', {
            x,
            y: 0,
            width:
              (this.view_is(VIEW_MODE.DAY) ? 1 : 2) * this.options.column_width,
            height: '100%',
            class: 'holiday-highlight',
            append_to: weekends_fragment,
          });
        }
      }

      const $el = this.layers.grid.querySelector('.holidays_layer');
      if ($el) {
        if (append) {
          $el.appendChild(weekends_fragment);
        } else {
          $el.insertBefore(weekends_fragment, $el.firstChild);
        }
      } else {
        const $holidays_layer = createSVG('g', {
          class: 'holidays_layer',
          append_to: this.layers.grid,
        });
        $holidays_layer.appendChild(weekends_fragment);
      }
    }

    highlightToday() {
      // highlight today's | week's | month's | quarter_year's | year's
      if (
        this.view_is(VIEW_MODE.DAY) ||
        this.view_is(VIEW_MODE.WEEK) ||
        this.view_is(VIEW_MODE.MONTH) ||
        this.view_is(VIEW_MODE.QUARTER_YEAR) ||
        this.view_is(VIEW_MODE.YEAR)
      ) {
        // Used as we must find the _end_ of session if view is not Day
        const { x: left, date } = this.computeGridHighlightDimensions(
          this.options.view_mode,
        );

        const data_height =
          (this.options.bar_height + this.options.padding) * this.tasks.length;
        const path_height = Math.max(5000, data_height);

        const $el = this.layers.today.querySelector('.today-date-line');
        if ($el) {
          $.attr($el, { d: `M ${left} 0 v ${path_height}` });
        } else {
          createSVG('path', {
            d: `M ${left} 0 v ${path_height}`,
            class: 'today-date-line',
            append_to: this.layers.today,
          });
        }

        const $today = document.getElementById(
          date_utils.format(date).replaceAll(' ', '_'),
        );
        if ($today) {
          if (!$today.classList.contains('today-date-highlight')) {
            $today.classList.add('today-date-highlight');
            $today.style.top = +$today.style.top.slice(0, -2) - 4 + 'px';
            $today.style.left = +$today.style.left.slice(0, -2) - 8 + 'px';
          }
        }
      }
    }

    create_el({ left, top, width, height, id, classes, append_to }) {
      let $el = document.createElement('div');
      $el.classList.add(classes);
      $el.style.top = top + 'px';
      $el.style.left = left + 'px';
      if (id) $el.id = id;
      if (width) $el.style.width = width + 'px';
      if (height) $el.style.height = height + 'px';
      append_to.appendChild($el);
      return $el;
    }

    make_dates() {
      this.upper_texts_x = {};
      this.get_dates_to_draw(this.dates, null).forEach((date, i) => {
        this.last_date_info = date;
        this.draw_date(date, i);
      });
    }

    get_dates_to_draw(dates, last) {
      let last_date = last;
      return dates.map((date, i) => {
        const d = this.get_date_info(date, last_date, i);
        last_date = d;
        return d;
      });
    }

    get_date_info(date, last_date_info) {
      let last_date = last_date_info
        ? last_date_info.date
        : date_utils.add(date, 1, 'day');
      const date_text = {
        Hour_lower: date_utils.format(date, 'HH', this.options.language),
        'Quarter Day_lower': date_utils.format(date, 'HH', this.options.language),
        'Half Day_lower': date_utils.format(date, 'HH', this.options.language),
        Day_lower:
          date.getDate() !== last_date.getDate()
            ? date_utils.format(date, 'D', this.options.language)
            : '',
        Week_lower:
          date.getMonth() !== last_date.getMonth()
            ? date_utils.format(date, 'M月D日', this.options.language)
            : date_utils.format(date, 'D', this.options.language),
        Month_lower: date_utils.format(date, 'M月', this.options.language),
        'Quarter Year_lower':
          !last_date_info || date.getMonth() !== last_date.getMonth()
            ? 'Q' + date_utils.format(date, 'Q', this.options.language)
            : '',
        Year_lower: date_utils.format(date, 'YYYY年', this.options.language),
        Hour_upper:
          date.getDate() !== last_date.getDate()
            ? date_utils.format(date, 'MM月D日', this.options.language)
            : '',
        'Quarter Day_upper':
          date.getDate() !== last_date.getDate()
            ? date_utils.format(date, 'MM月D日', this.options.language)
            : '',
        'Half Day_upper':
          date.getDate() !== last_date.getDate()
            ? date_utils.format(date, 'MM月D日', this.options.language)
            : '',
        Day_upper:
          !last_date_info || date.getMonth() !== last_date.getMonth()
            ? date_utils.format(date, 'YYYY年MM月', this.options.language)
            : '',
        Week_upper:
          !last_date_info || date.getMonth() !== last_date.getMonth()
            ? date_utils.format(date, 'YYYY年MM月', this.options.language)
            : '',
        Month_upper:
          !last_date_info || date.getFullYear() !== last_date.getFullYear()
            ? date_utils.format(date, 'YYYY年', this.options.language)
            : '',
        'Quarter Year_upper':
          !last_date_info || date.getFullYear() !== last_date.getFullYear()
            ? date_utils.format(date, 'YYYY年', this.options.language)
            : '',
        Year_upper: '',
      };

      // special Month scale
      let column_width = this.get_date_width(date);

      const base_pos = {
        x: last_date_info
          ? last_date_info.base_pos_x + last_date_info.column_width
          : 0,
        lower_y: this.options.header_height - 20,
        upper_y: Math.max(6, this.options.header_height - 50),
      };

      const base_tick = {
        line: false,
      };
      if (this.options.header_tick) {
        base_tick.line = this.get_thick_mode(date);
      }

      // starting_point upper:center-or-start lower:center
      const x_pos = {
        Hour_lower: column_width / 2,
        Hour_upper: (column_width * 24) / 2,
        'Quarter Day_lower': column_width / 2,
        'Quarter Day_upper': (column_width * 4) / 2,
        'Half Day_lower': column_width / 2,
        'Half Day_upper': (column_width * 2) / 2,
        Day_lower: column_width / 2,
        Day_upper: column_width / 2,
        Week_lower: 0,
        Week_upper: 19,
        Month_lower: column_width / 2,
        Month_upper: 19,
        'Quarter Year_lower': column_width / 2,
        'Quarter Year_upper': column_width / 2,
        Year_lower: column_width / 2,
        Year_upper: 19,
      };
      return {
        date,
        formatted_date: date_utils.format(date).replaceAll(' ', '_'),
        column_width,
        base_pos_x: base_pos.x,
        upper_text: this.options.upper_text
          ? this.options.upper_text(
              date,
              this.options.view_mode,
              date_text[`${this.options.view_mode}_upper`],
            )
          : date_text[`${this.options.view_mode}_upper`],
        lower_text: this.options.lower_text
          ? this.options.lower_text(
              date,
              this.options.view_mode,
              date_text[`${this.options.view_mode}_lower`],
            )
          : date_text[`${this.options.view_mode}_lower`],
        upper_x: base_pos.x + x_pos[`${this.options.view_mode}_upper`],
        upper_y: base_pos.upper_y,
        lower_x: base_pos.x + x_pos[`${this.options.view_mode}_lower`],
        lower_y: base_pos.lower_y,
        tick_line: base_tick.line,
      };
    }

    draw_date(date, i) {
      let $lower_text = this.create_el({
        left: date.lower_x,
        top: date.lower_y,
        id: date.formatted_date,
        classes: 'lower-text',
        append_to: this.$lower_header,
      });
      $lower_text.innerText = date.lower_text;
      if (!this.view_is(VIEW_MODE.WEEK)) {
        $lower_text.style.left =
          +$lower_text.style.left.slice(0, -2) -
          $lower_text.clientWidth / 2 +
          'px';
      }

      if (date.upper_text) {
        if (this.upper_texts_x[date.upper_text] === undefined) {
          let $upper_text = this.create_el({
            left: date.upper_x,
            top: date.upper_y,
            classes: 'upper-text',
            append_to: this.$upper_header,
          });
          $upper_text.innerText = date.upper_text;
        }

        this.upper_texts_x[date.upper_text] = date.upper_x;
      }

      if (date.tick_line) {
        this.create_el({
          left: date.base_pos_x - 1,
          top: date.lower_y,
          width: 2,
          height: this.options.header_height - 20,
          classes: 'tick-line',
          append_to: this.$line_header,
        });
      }
    }

    make_bars() {
      const bar_fragment = document.createDocumentFragment();
      this.bars = this.tasks.map((task) => {
        const bar = new Bar(this, task);
        bar_fragment.appendChild(bar.group);
        return bar;
      });
      this.layers.bar.appendChild(bar_fragment);
    }

    make_arrows() {
      this.arrows = [];
      if (!this.options.dependencies) return;
      const arrow_fragment = document.createDocumentFragment();
      for (let task of this.tasks) {
        let arrows = [];
        arrows = task.dependencies
          .map((task_id) => {
            const dependency = this.get_task(task_id);
            if (!dependency) return;
            const arrow = new Arrow(
              this,
              this.bars[dependency._index], // from_task
              this.bars[task._index], // to_task
            );
            arrow_fragment.appendChild(arrow.element);
            return arrow;
          })
          .filter(Boolean); // filter falsy values
        this.arrows = this.arrows.concat(arrows);
      }
      this.layers.arrow.appendChild(arrow_fragment);
    }

    map_arrows_on_bars() {
      for (let bar of this.bars) {
        bar.arrows = this.arrows.filter((arrow) => {
          return (
            arrow.from_task.task._id === bar.task._id ||
            arrow.to_task.task._id === bar.task._id
          );
        });
      }
    }

    set_scroll_position(date) {
      if (!date || date === 'start') {
        date = this.gantt_start;
      } else if (date === 'today') {
        return this.scroll_today();
      } else if (typeof date === 'string') {
        date = date_utils.parse(date);
      }

      const parent_element = this.$svg.parentElement;
      if (!parent_element) return;

      const hours_before_first_task = date_utils.diff(
        date,
        this.gantt_start,
        'hour',
      );
      // 1/3 padding
      const sharing = parent_element.clientWidth / 3;
      const space = (sharing / this.options.column_width) * this.options.step;
      const distance = hours_before_first_task - space;

      // position
      const scroll_pos =
        (distance / this.options.step) * this.options.column_width;
      // smooth、auto
      parent_element.scrollTo({ left: scroll_pos, behavior: 'auto' });
    }

    scroll_today() {
      this.set_scroll_position(new Date().setHours(0, 0, 0, 0));
    }

    bind_grid_scroll() {
      // onmousewheel
      $.on(this.$container_header, 'wheel', (event) => {
        if (event.shiftKey || event.deltaX) {
          const scrollMove = event.deltaX ? event.deltaX : event.deltaY;
          const scrollX = this.$container_main.scrollLeft || 0;
          const grid_width = $.attr(this.$svg, 'width');
          let newScrollX = scrollX + scrollMove;
          if (newScrollX < 0) {
            newScrollX = 0;
          } else if (newScrollX > grid_width) {
            newScrollX = grid_width;
          }
          this.$container_main.scrollLeft = newScrollX;
          event.preventDefault();
        }
      });

      $.on(
        this.$container_main,
        'scroll',
        $.throttle(20, () => {
          const scrollLeft = this.$container_main.scrollLeft;
          this.$container_header.scrollLeft = scrollLeft;
        }),
      );
    }

    bind_grid_click() {
      $.on(this.$container, this.options.popup_trigger, () => {
        this.unselect_all();
        this.hide_popup();
      });
    }

    bind_bar_create() {
      let x_on_start = 0;
      let y_on_start = 0;
      let matched_task = null;
      let is_creating = null;
      let holder = null;
      this.bar_being_created = null;

      const radius = this.options.bar_corner_radius;
      const bar_height = this.options.bar_height;
      const row_height = bar_height + this.options.padding;

      $.on(this.$svg, 'mousedown', (e) => {
        if (this.options.readonly) return;

        // location
        const index = parseInt(e.offsetY / row_height);
        matched_task = this.tasks[index];
        // only empty date
        if (!matched_task || (matched_task && matched_task._empty !== true))
          return;
        this.bar_being_created = matched_task._id;
        // start record
        is_creating = true;
        x_on_start = e.offsetX;
        y_on_start = this.get_snap_coord(e.offsetY);
      });

      $.on(this.$svg, 'mousemove', (e) => {
        if (!is_creating) return;
        let dx = e.offsetX - x_on_start;

        // free distance
        const width = Math.abs(dx);
        // create rect
        if (!holder) {
          holder = createSVG('rect', {
            x: x_on_start,
            y: y_on_start,
            width: 0,
            height: bar_height,
            rx: radius,
            ry: radius,
            class: 'bar-inner',
            'data-id': matched_task.id,
            append_to: this.layers.progress,
          });
        }
        // move-right
        let x = x_on_start;
        if (dx < 0) {
          // move-left
          x = x_on_start - width;
        }
        holder.setAttribute('x', x);
        holder.setAttribute('width', width);
      });

      $.on(this.$svg, 'mouseup', () => {
        this.bar_being_created = null;
        if (holder) {
          const start_x = holder.getX();
          const end_x = holder.getX() + holder.getBBox().width;
          let date_start = this.get_snap_date(start_x);
          let date_end = this.get_snap_date(end_x);
          if (this.options.drag_ignore_hours) {
            // Non-hourly computation
            if (
              !this.view_is([
                VIEW_MODE.HOUR,
                VIEW_MODE.QUARTER_DAY,
                VIEW_MODE.HALF_DAY,
              ])
            ) {
              date_start = new Date(date_start.setHours(0, 0, 0, 0));
              date_end = new Date(
                date_utils.add(date_end, 1, 'day').setHours(0, 0, 0, 0),
              );
            }
          }

          const update_task = Object.assign(matched_task, {
            start: date_start,
            _start: date_start,
            end: date_end,
            _end: date_end,
            _empty: false,
            _invalid: false,
          });
          this.replace(update_task, matched_task);

          // remove holder dom
          this.layers.progress.removeChild(holder);
          // trigger event
          this.trigger_event('date_change', [
            matched_task,
            date_start,
            date_utils.add(date_end, -1, 'second'),
          ]);
        }
        holder = null;
      });

      document.addEventListener('mouseup', () => {
        is_creating = false;
      });
    }

    bind_bar_events() {
      let is_dragging = false;
      let x_on_start = 0;
      let x_on_scroll_start = 0;
      let y_on_start = 0;
      let is_resizing_left = false;
      let is_resizing_right = false;
      let parent_bar_id = null;
      let bars = []; // instanceof Bar
      this.bar_being_dragged = null;

      function action_in_progress() {
        return is_dragging || is_resizing_left || is_resizing_right;
      }

      $.on(this.$svg, 'mousedown', '.bar-wrapper, .handle', (e, element) => {
        if (this.options.readonly) return;

        const bar_wrapper = $.closest('.bar-wrapper', element);
        bars.forEach((bar) => bar.group.classList.remove('active'));

        if (element.classList.contains('left')) {
          is_resizing_left = true;
        } else if (element.classList.contains('right')) {
          is_resizing_right = true;
        } else if (element.classList.contains('bar-wrapper')) {
          is_dragging = true;
        }

        bar_wrapper.classList.add('active');
        this.hide_popup();

        x_on_start = e.offsetX;
        y_on_start = e.offsetY;

        parent_bar_id = bar_wrapper.getAttribute('data-id');
        let ids = [parent_bar_id];
        // drag sync children
        if (this.options.drag_sync_child) {
          ids.push(...this.get_all_dependent_tasks(parent_bar_id));
          ids = ids.filter((id, ix) => ids.indexOf(id) === ix);
        }

        bars = ids.map((id) => this.get_bar(id));
        this.bar_being_dragged = parent_bar_id;

        bars.forEach((bar) => {
          if (bar.empty) return;
          const $bar = bar.$bar;
          $bar.ox = $bar.getX();
          $bar.oy = $bar.getY();
          $bar.owidth = $bar.getWidth();
          $bar.finaldx = 0;
        });
      });

      const handle_width = this.options.handle_width;
      $.on(this.$svg, 'mousemove', (e) => {
        if (!action_in_progress()) return;
        const dx = e.offsetX - x_on_start;
        e.offsetY - y_on_start;

        bars.forEach((bar) => {
          if (bar.empty) return;
          const $bar = bar.$bar;
          // free-distance
          $bar.finaldx = dx;
          this.hide_popup();
          if (is_resizing_left) {
            if ($bar.finaldx - $bar.owidth + handle_width >= 0) return;
            if (parent_bar_id == bar.task._id) {
              bar.update_bar_position({
                x: $bar.ox + $bar.finaldx,
                width: $bar.owidth - $bar.finaldx,
              });
            } else {
              bar.update_bar_position({
                x: $bar.ox + $bar.finaldx,
              });
            }
          } else if (is_resizing_right) {
            if ($bar.finaldx + $bar.owidth < handle_width) return;
            if (parent_bar_id == bar.task._id) {
              bar.update_bar_position({
                width: $bar.owidth + $bar.finaldx,
              });
            }
          } else if (is_dragging) {
            bar.update_bar_position({ x: $bar.ox + $bar.finaldx });
          }

          // show drag_backdrop
          if (parent_bar_id == bar.task._id) {
            let x = 0;
            const scrollLeft = this.$container_main.scrollLeft;
            if (is_resizing_right) {
              x = $bar.ox - scrollLeft;
            } else {
              x = $bar.ox + $bar.finaldx - scrollLeft;
            }
            this.show_backdrop({
              x: x,
              width: $bar.getWidth(),
              bar,
            });
          }
        });
      });

      $.on(this.$svg, 'mouseup', () => {
        this.bar_being_dragged = null;
        this.hide_backdrop();
        bars.forEach((bar) => {
          if (bar.empty) return;
          const $bar = bar.$bar;
          if (!$bar.finaldx) return;

          // calculate start_date end_date
          const { new_start_date, new_end_date } = bar.compute_start_end_date();
          const date_start = new Date(
            date_utils.clone(new_start_date).setHours(0, 0, 0, 0),
          );
          const dx_start = this.get_snap_distance(date_start, this.gantt_start);

          let date_end = new Date(
            date_utils.clone(new_end_date).setHours(0, 0, 0, 0),
          );
          if (new_end_date > date_end) {
            date_end = date_utils.add(date_end, 1, 'day');
          }
          const dx_end = this.get_snap_distance(date_end, this.gantt_start);

          if (this.options.drag_ignore_hours) {
            // calculate drop coord
            if (
              !this.view_is([
                VIEW_MODE.HOUR,
                VIEW_MODE.QUARTER_DAY,
                VIEW_MODE.HALF_DAY,
              ])
            ) {
              bar.update_bar_position({
                x: dx_start,
                width: dx_end - dx_start,
              });
            }
          }
          // out of limit date
          if (date_start < this.gantt_start || date_end > this.gantt_end) {
            this.update_gantt_dates({
              start: date_start,
              end: date_end,
            });
          }

          $bar.finaldx = 0;
          bar.date_changed();
          bar.set_action_completed();

          if (bar.invalid) {
            const new_task = Object.assign({}, bar.task, { _invalid: false });
            this.replace(new_task, bar.task);
          }
        });
      });

      document.addEventListener('mouseup', () => {
        is_dragging = false;
        is_resizing_left = false;
        is_resizing_right = false;
      });

      $.on(this.$container_main, 'scroll', (e) => {
        let elements = document.querySelectorAll('.bar-wrapper');
        let localBars = [];
        const ids = [];
        let dx;
        if (x_on_scroll_start) {
          dx = e.currentTarget.scrollLeft - x_on_scroll_start;
        }

        const daysSinceStart =
          ((e.currentTarget.scrollLeft / this.options.column_width) *
            this.options.step) /
          24;
        let format_str = 'D MMM';
        if (
          this.view_is([VIEW_MODE.YEAR, VIEW_MODE.QUARTER_YEAR, VIEW_MODE.MONTH])
        )
          format_str = 'YYYY年';
        else if (this.view_is([VIEW_MODE.DAY, VIEW_MODE.WEEK]))
          format_str = 'YYYY年MM月';
        else if (this.view_is(VIEW_MODE.HALF_DAY)) format_str = 'D MMM';
        else if (this.view_is(VIEW_MODE.HOUR)) format_str = 'D MMMM';

        // language
        const currentUpper = date_utils.format(
          date_utils.add(this.gantt_start, daysSinceStart, 'day'),
          format_str,
          this.options.language,
        );
        const upperTexts = Array.from(document.querySelectorAll('.upper-text'));
        const $el = upperTexts.find((el) => el.textContent === currentUpper);
        if ($el && !$el.classList.contains('current-upper')) {
          const $current = document.querySelector('.current-upper');
          if ($current) {
            $current.classList.remove('current-upper');
            $current.style.left = this.upper_texts_x[$current.textContent] + 'px';
          }

          $el.classList.add('current-upper');
          // 38/2 - 8 first-point
          $el.style.left = '11px';
        }

        Array.prototype.forEach.call(elements, function (el, i) {
          ids.push(el.getAttribute('data-id'));
        });

        if (dx) {
          localBars = ids.map((id) => this.get_bar(id));
          if (this.options.auto_move_label) {
            localBars.forEach((bar) => {
              bar.update_label_position_on_horizontal_scroll({
                x: dx,
                sx: e.currentTarget.scrollLeft,
              });
            });
          }
        }

        x_on_scroll_start = e.currentTarget.scrollLeft;

        this.trigger_event('scroll', [e]);
      });

      if (this.options.drag_bar_progress) {
        this.bind_bar_progress();
      }
    }

    bind_bar_progress() {
      let x_on_start = 0;
      let y_on_start = 0;
      let is_resizing = null;
      let bar = null;
      let $bar_progress = null;
      let $bar = null;

      $.on(this.$svg, 'mousedown', '.handle.progress', (e, handle) => {
        if (this.options.readonly) return;

        is_resizing = true;
        x_on_start = e.offsetX;
        y_on_start = e.offsetY;

        const $bar_wrapper = $.closest('.bar-wrapper', handle);
        const id = $bar_wrapper.getAttribute('data-id');
        bar = this.get_bar(id);

        $bar_progress = bar.$bar_progress;
        $bar = bar.$bar;

        $bar_progress.finaldx = 0;
        $bar_progress.owidth = $bar_progress.getWidth();
        $bar_progress.min_dx = -$bar_progress.getWidth();
        $bar_progress.max_dx = $bar.getWidth() - $bar_progress.getWidth();
      });

      $.on(this.$svg, 'mousemove', (e) => {
        if (!is_resizing) return;
        let dx = e.offsetX - x_on_start;
        e.offsetY - y_on_start;

        if (dx > $bar_progress.max_dx) {
          dx = $bar_progress.max_dx;
        }
        if (dx < $bar_progress.min_dx) {
          dx = $bar_progress.min_dx;
        }

        const $handle = bar.$handle_progress;
        $.attr($bar_progress, 'width', $bar_progress.owidth + dx);
        $.attr($handle, 'points', bar.get_progress_polygon_points());
        $bar_progress.finaldx = dx;
      });

      $.on(this.$svg, 'mouseup', () => {
        is_resizing = false;
        if (!($bar_progress && $bar_progress.finaldx)) return;

        $bar_progress.finaldx = 0;
        bar.progress_changed();
        bar.set_action_completed();
        bar = null;
        $bar_progress = null;
        $bar = null;
      });
    }

    get_all_dependent_tasks(task_id) {
      let out = [];
      let to_process = [task_id];
      while (to_process.length) {
        const deps = to_process.reduce((acc, curr) => {
          acc = acc.concat(this.dependency_map[curr]);
          return acc;
        }, []);

        out = out.concat(deps);
        to_process = deps.filter((d) => !to_process.includes(d));
      }

      return out.filter(Boolean);
    }

    get_snap_date(x, base_date = this.gantt_start) {
      const x_in_units = x / this.options.column_width;
      return date_utils.add(base_date, x_in_units * this.options.step, 'hour');
    }

    get_snap_distance(end, start) {
      const hours = date_utils.diff(end, start, 'hour');
      let x = (hours / this.options.step) * this.options.column_width;

      if (this.view_is(VIEW_MODE.MONTH)) {
        const days = date_utils.diff(end, start, 'day');
        x = (days * this.options.column_width) / 30;

        // 修正误差
        const date_coord = this.get_snap_date(x, start);
        if (date_coord < end) {
          const diff = date_utils.diff(end, date_coord, 'hour');
          x += (diff / this.options.step) * this.options.column_width;
        }
      }

      return x;
    }

    get_snap_coord(oy) {
      const padding = this.options.padding / 2;
      const header_height = 0;
      const row_height = this.options.bar_height + this.options.padding;

      const mod = parseInt((oy - header_height) / row_height);
      return header_height + mod * row_height + padding;
    }

    unselect_all() {
      [...this.$svg.querySelectorAll('.bar-wrapper')].forEach((el) => {
        el.classList.remove('active');
      });
    }

    view_is(modes) {
      if (typeof modes === 'string') {
        return this.options.view_mode === modes;
      }

      if (Array.isArray(modes)) {
        return modes.some((mode) => this.options.view_mode === mode);
      }

      return false;
    }

    get_list() {
      return this.tasks;
    }

    get_task(id) {
      return this.tasks.find((task) => task._id == id);
    }

    get_bar(id) {
      return this.bars.find((bar) => bar.task._id == id);
    }

    show_backdrop({ x, width, bar }) {
      if (!this.backdrop) {
        this.backdrop = new Backdrop(this.$drag_backdrop);
      }

      const { new_start_date, new_end_date } = bar.compute_start_end_date();
      const subtract_second_date = date_utils.add(new_end_date, -1, 'second');

      let symbol = 'MM-DD';
      // different years
      if (
        date_utils.format(new_start_date, 'YYYY') !==
        date_utils.format(subtract_second_date, 'YYYY')
      ) {
        symbol = 'YYYY-MM-DD';
      }

      const date_start = date_utils.format(new_start_date, symbol);
      const date_end = date_utils.format(subtract_second_date, symbol);
      this.backdrop.showAt({ x, width, range: [date_start, date_end] });
    }

    hide_backdrop() {
      this.backdrop && this.backdrop.hide();
    }

    show_popup(options) {
      if (this.options.popup === false) return;
      if (!this.popup) {
        this.popup = new Popup(this, this.$popup_wrapper);
      }
      this.popup.show(options);
    }

    hide_popup() {
      this.popup && this.popup.hide();
    }

    trigger_event(event, args) {
      if (this.options['on_' + event]) {
        this.options['on_' + event].apply(null, args);
      }
    }

    clear() {
      this.$svg.innerHTML = '';
      this.$container_toolbar.innerHTML = '';
      this.$header?.remove?.();
      this.hide_popup();
    }
  }

  Gantt.VIEW_MODE = VIEW_MODE;

  Gantt.VERSION = version;

  function generate_id(task) {
    return task.name + '_' + Math.random().toString(36).slice(2, 12);
  }

  return Gantt;

})();
//# sourceMappingURL=frappe-gantt.js.map
