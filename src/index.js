import date_utils from "./date_utils";
import { $, createSVG } from "./svg_utils";
import Bar from "./bar";
import Arrow from "./arrow";
import Popup from "./popup";

import "./gantt.scss";

const VIEW_MODE = {
  HOUR: "Hour",
  QUARTER_DAY: "Quarter Day",
  HALF_DAY: "Half Day",
  DAY: "Day",
  WEEK: "Week",
  MONTH: "Month",
  YEAR: "Year",
};

const VIEW_MODE_PADDING = {
  HOUR: ["7d", "7d"],
  QUARTER_DAY: ["7d", "7d"],
  HALF_DAY: ["7d", "7d"],
  DAY: ["1m", "1m"],
  WEEK: ["1m", "1m"],
  MONTH: ["1m", "1m"],
  YEAR: ["2y", "2y"],
};

const DEFAULT_OPTIONS = {
  header_height: 65,
  // column_width: 30,
  // step: 24,
  bar_height: 30,
  bar_corner_radius: 3,
  arrow_curve: 5,
  handle_width: 8,
  padding: 18,
  view_modes: [...Object.values(VIEW_MODE)],
  view_mode: VIEW_MODE.DAY,
  date_format: "YYYY-MM-DD",
  popup_trigger: "click",
  show_expected_progress: false,
  drag_sync_child: false,
  drag_limit_child: false,
  popup: null,
  language: "en",
  readonly: false,
  highlight_weekend: true,
  scroll_to: 'start',
  lines: 'both',
  auto_move_label: true,
  today_button: true,
  view_mode_select: false,
};

let count = 0;

export default class Gantt {
  constructor(wrapper, tasks, options) {
    this.setup_wrapper(wrapper);
    this.setup_options(options);
    this.setup_tasks(tasks);
    // initialize with default view mode
    this.change_view_mode();
    this.bind_events();
  }

  setup_wrapper(element) {
    let svg_element, wrapper_element;

    // CSS Selector is passed
    if (typeof element === "string") {
      element = document.querySelector(element);
    }

    // count new Constructor
    $.attr(element, { init: ++count });

    // get the SVGElement
    if (element instanceof HTMLElement) {
      element.innerHTML = "";
      wrapper_element = element;
      svg_element = element.querySelector("svg");
    } else if (element instanceof SVGElement) {
      svg_element = element;
      // TODO if element is svg
    } else {
      throw new TypeError(
        "Frappé Gantt only supports usage of a string CSS selector," +
        " HTML DOM element or SVG DOM element for the 'element' parameter",
      );
    }

    // svg element
    if (!svg_element) {
      // create it
      this.$svg = createSVG("svg", {
        append_to: wrapper_element,
        class: "gantt",
      });
    } else {
      this.$svg = svg_element;
      this.$svg.classList.add("gantt");
    }

    // wrapper element
    this.$container = document.createElement("div");
    this.$container.classList.add("gantt-container");

    // 1.header horizontal-scroll
    this.$container_header = document.createElement('div');
    this.$container_header.classList.add('gantt-container_header');
    this.$container.appendChild(this.$container_header);

    // 2.main vertical-scroll
    this.$container_main = document.createElement('div');
    this.$container_main.classList.add('gantt-container_main');
    this.$container.appendChild(this.$container_main);

    // 3. appendTo wrapper
    const parent_element = this.$svg.parentElement;
    parent_element.appendChild(this.$container);
    this.$container_main.appendChild(this.$svg);

    // 4. toobar wrapper
    this.$container_toolbar = document.createElement('div');
    this.$container_toolbar.classList.add('gantt-container_toolbar');
    this.$container.appendChild(this.$container_toolbar);

    // 4.popup wrapper
    this.$popup_wrapper = document.createElement("div");
    this.$popup_wrapper.classList.add("popup-wrapper");
    this.$popup_wrapper.classList.add("hidden");
    this.$container.appendChild(this.$popup_wrapper);
  }

  setup_options(options) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    if (!options.view_mode_padding) options.view_mode_padding = {}
    for (let [key, value] of Object.entries(options.view_mode_padding)) {
      if (typeof value === "string") {
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
      // reset symbol
      task.empty = false;
      task.invalid = false;

      // convert to Date objects
      task._start = date_utils.parse(task.start);
      if (task.end === undefined && task.duration !== undefined) {
        task.end = task._start;
        let durations = task.duration.split(" ");

        durations.forEach((tmpDuration) => {
          let { duration, scale } = date_utils.parse_duration(tmpDuration);
          task.end = date_utils.add(task.end, duration, scale);
        });
      }
      task._end = date_utils.parse(task.end);
      let diff = date_utils.diff(task._end, task._start, "year");
      if (diff < 0) {
        throw Error("start of task can't be after end of task: in task #, " + (i + 1))
      }
      // make task invalid if duration too large
      if (date_utils.diff(task._end, task._start, "year") > 10) {
        task.end = null;
      }


      // cache index
      task._index = i;

      // invalid dates
      if (!task.start && !task.end) {
        task._start = null;
        task._end = null;
        task.empty = true;
        // const today = date_utils.today();
        // task._start = today;
        // task._end = date_utils.add(today, 2, "day");
      }

      if (!task.start && task.end) {
        task._start = date_utils.add(task._end, -2, "day");
      }

      if (task.start && !task.end) {
        task._end = date_utils.add(task._start, 2, "day");
      }

      // if hours is not set, assume the last day is full day
      // e.g: 2018-09-09 becomes 2018-09-09 23:59:59
      if (task._end) {
        const task_end_values = date_utils.get_date_values(task._end);
        if (task_end_values.slice(3).every((d) => d === 0)) {
          task._end = date_utils.add(task._end, 24, "hour");
        }
      }

      // invalid flag
      if (!task.start || !task.end) {
        task.invalid = true;
      }

      // dependencies
      if (typeof task.dependencies === "string" || !task.dependencies) {
        let deps = [];
        if (task.dependencies) {
          deps = task.dependencies
            .split(",")
            .map((d) => d.trim().replaceAll(' ', '_'))
            .filter((d) => d);
        }
        task.dependencies = deps;
      }

      // uids
      if (!task.id) {
        task.id = generate_id(task);
      } else if (typeof task.id === 'string') {
        task.id = task.id.replaceAll(' ', '_')
      } else {
        task.id = `${task.id}`
      }

      return task;
    });

    this.setup_dependencies();
  }

  setup_dependencies() {
    this.dependency_map = {};
    for (let t of this.tasks) {
      for (let d of t.dependencies) {
        this.dependency_map[d] = this.dependency_map[d] || [];
        this.dependency_map[d].push(t.id);
      }
    }
  }

  refresh(tasks) {
    this.setup_tasks(tasks);
    this.change_view_mode();
  }

  change_view_mode(mode = this.options.view_mode) {
    this.update_view_scale(mode);
    this.setup_dates();
    this.render();
    // fire viewmode_change event
    this.trigger_event("view_change", [mode]);
  }

  update_view_scale(view_mode) {
    this.options.view_mode = view_mode;
    if (view_mode === VIEW_MODE.HOUR) {
      this.options.step = 24 / 24;
      this.options.column_width = 38;
    } else if (view_mode === VIEW_MODE.DAY) {
      this.options.step = 24;
      this.options.column_width = 38;
    } else if (view_mode === VIEW_MODE.HALF_DAY) {
      this.options.step = 24 / 2;
      this.options.column_width = 38;
    } else if (view_mode === VIEW_MODE.QUARTER_DAY) {
      this.options.step = 24 / 4;
      this.options.column_width = 38;
    } else if (view_mode === VIEW_MODE.WEEK) {
      this.options.step = 24 * 7;
      this.options.column_width = 140;
    } else if (view_mode === VIEW_MODE.MONTH) {
      this.options.step = 24 * 30;
      this.options.column_width = 120;
    } else if (view_mode === VIEW_MODE.YEAR) {
      this.options.step = 24 * 365;
      this.options.column_width = 120;
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
      if (!this.gantt_start || (task._start && task._start < this.gantt_start)) {
          this.gantt_start = task._start;
      }
      if (!this.gantt_end || (task._end && task._end > this.gantt_end)) {
        this.gantt_end = task._end;
      }
    }
    let gantt_start, gantt_end;
    if (!this.gantt_start) gantt_start = new Date();
    else gantt_start = date_utils.start_of(this.gantt_start, "day");
    if (!this.gantt_end) gantt_end = new Date();
    else gantt_end = date_utils.start_of(this.gantt_end, "day");


    // ensure today in daterange
    const today = date_utils.today();
    if (gantt_start > today) gantt_start = today;
    if (gantt_end < today) gantt_end = today;

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
    gantt_start = date_utils.add(
      gantt_start,
      -padding_start.duration,
      padding_start.scale,
    );

    let format_string;
    if (this.view_is(VIEW_MODE.YEAR)) {
      format_string = "YYYY"
    } else if (this.view_is(VIEW_MODE.MONTH)) {
      format_string = "YYYY-MM"
    } else if (this.view_is(VIEW_MODE.DAY)) {
      format_string = "YYYY-MM-DD"
    } else {
      format_string = "YYYY-MM-DD HH"
    }
    this.gantt_start = date_utils.parse(date_utils.format(gantt_start, format_string));
    this.gantt_start.setHours(0, 0, 0, 0)
    this.gantt_end = date_utils.add(
      gantt_end,
      padding_end.duration,
      padding_end.scale,
    );

    console.log('gantt ==> start_end', this.gantt_start, this.gantt_end);
  }

  setup_date_values() {
    this.dates = [];
    let cur_date = null;

    while (cur_date === null || cur_date < this.gantt_end) {
      if (!cur_date) {
        cur_date = date_utils.clone(this.gantt_start);
      } else {
        if (this.view_is(VIEW_MODE.YEAR)) {
          cur_date = date_utils.add(cur_date, 1, "year");
        } else if (this.view_is(VIEW_MODE.MONTH)) {
          cur_date = date_utils.add(cur_date, 1, "month");
        } else {
          cur_date = date_utils.add(cur_date, this.options.step, "hour");
        }
      }
      this.dates.push(cur_date);
    }
  }

  bind_events() {
    this.bind_grid_scroll();

    if (this.options.readonly) return
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
    this.set_width();
    this.set_scroll_position(this.options.scroll_to);
  }

  setup_layers() {
    this.layers = {};
    const layers = ["grid", "arrow", "progress", "bar", "details"];
    // make group layers
    for (let layer of layers) {
      this.layers[layer] = createSVG("g", {
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
    const grid_height = (this.options.bar_height + this.options.padding) * this.tasks.length;

    createSVG("rect", {
      x: 0,
      y: 0,
      width: grid_width,
      height: grid_height,
      class: "grid-background",
      append_to: this.$svg,
    });

    const scroll_height = this.options.height ? this.options.height + 'px' : `calc(100% - ${this.options.header_height + 1}px`;
    this.$container_main.style.height = scroll_height;
    this.$container_main.style.width = '100%';
    this.$container_main.style.overflow = 'auto';
    this.$container_main.style.position = 'relative';
    this.$container.style.overflow = 'hidden';

    $.attr(this.$svg, {
      height: grid_height ,
      width: "100%",
    });
  }

  make_grid_rows() {
    const rows_layer = createSVG("g", { append_to: this.layers.grid });

    const row_width = this.dates.length * this.options.column_width;
    const row_height = this.options.bar_height + this.options.padding;

    let row_y = 0;

    for (let _ of this.tasks) {
      createSVG("rect", {
        x: 0,
        y: row_y,
        width: row_width,
        height: row_height,
        class: "grid-row",
        append_to: rows_layer,
      });
      if (this.options.lines === 'both' || this.options.lines === 'horizontal') {

      }

      row_y += this.options.bar_height + this.options.padding;
    }
  }

  make_grid_header() {
    let $header = document.createElement("div");
    $header.style.height = this.options.header_height + "px";
    $header.style.width = this.dates.length * this.options.column_width + "px";
    $header.classList.add('grid-header')
    this.$header = $header

    let $upper_header = document.createElement("div");
    $upper_header.classList.add('upper-header')
    this.$upper_header = $upper_header
    this.$header.appendChild($upper_header)

    let $lower_header = document.createElement("div");
    $lower_header.classList.add('lower-header')
    this.$lower_header = $lower_header
    this.$header.appendChild($lower_header)

    this.$container_header.appendChild(this.$header);
  }

  make_grid_toolbar() {
    const $side_header = this.$container_toolbar;

    // Create view mode change select
    if (this.options.view_mode_select) {

      const $select = document.createElement("select");
      $select.classList.add('viewmode-select')

      const $el = document.createElement("option");
      $el.selected = true
      $el.disabled = true
      $el.textContent = 'Mode'
      $select.appendChild($el)

      for (const key in VIEW_MODE) {
        const $option = document.createElement("option");
        $option.value = VIEW_MODE[key];
        $option.textContent = VIEW_MODE[key];
        $select.appendChild($option);
      }
      // $select.value = this.options.view_mode
      $select.addEventListener("change", (function () {
        this.change_view_mode($select.value)
      }).bind(this));
      $side_header.appendChild($select)
    }

    // Create today button
    if (this.options.today_button) {
      let $today_button = document.createElement('button')
      $today_button.classList.add('today-button')
      $today_button.textContent = 'Today'
      $today_button.onclick = this.scroll_today.bind(this)
      $side_header.appendChild($today_button)
    }

    // position
    const top = Math.max(0, this.options.header_height - 50 - 5);
    $side_header.style.top = top + 'px';
  }

  make_grid_ticks() {
    if (!['both', 'vertical', 'horizontal'].includes(this.options.lines)) return
    let tick_x = 0;
    let tick_y = 0;
    let tick_height =
      (this.options.bar_height + this.options.padding) * this.tasks.length;

    let $lines_layer = createSVG("g", { class: 'lines_layer', append_to: this.layers.grid });

    let row_y = 0;

    const row_width = this.dates.length * this.options.column_width;
    const row_height = this.options.bar_height + this.options.padding;
    if (this.options.lines !== 'vertical') {
      for (let _ of this.tasks) {
        createSVG("line", {
          x1: 0,
          y1: row_y + row_height,
          x2: row_width,
          y2: row_y + row_height,
          class: "row-line",
          append_to: $lines_layer,
        });
        row_y += row_height;
      }
    }
    if (this.options.lines === 'horizontal') return;
    for (let date of this.dates) {
      let tick_class = "tick";
      // thick tick for monday
      if (this.view_is(VIEW_MODE.DAY) && date.getDate() === 1) {
        tick_class += " thick";
      }
      // thick tick for first week
      if (
        this.view_is(VIEW_MODE.WEEK) &&
        date.getDate() >= 1 &&
        date.getDate() < 8
      ) {
        tick_class += " thick";
      }
      // thick ticks for quarters
      if (this.view_is(VIEW_MODE.MONTH) && date.getMonth() % 3 === 0) {
        tick_class += " thick";
      }

      createSVG("path", {
        d: `M ${tick_x} ${tick_y} v ${tick_height}`,
        class: tick_class,
        append_to: this.layers.grid,
      });

      if (this.view_is(VIEW_MODE.MONTH)) {
        tick_x +=
          (date_utils.get_days_in_month(date) * this.options.column_width) / 30;
      } else {
        tick_x += this.options.column_width;
      }
    }
  }

  highlightWeekends() {
    if (!this.view_is('Day') && !this.view_is('Half Day')) return
    for (let d = new Date(this.gantt_start); d <= this.gantt_end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) {
        const x = (date_utils.diff(d, this.gantt_start, 'hour') /
          this.options.step) *
          this.options.column_width;
        const height = (this.options.bar_height + this.options.padding) * this.tasks.length;
        createSVG('rect', {
          x,
          y: 0,
          width: (this.view_is('Day') ? 1 : 2) * this.options.column_width,
          height,
          class: 'holiday-highlight',
          append_to: this.layers.grid,
        });
      }
    }
  }

  //compute the horizontal x distance
  computeGridHighlightDimensions(view_mode) {
    let x = this.options.column_width / 2;

    if (this.view_is(VIEW_MODE.DAY)) {
      let today = date_utils.today()
      return {
        x: x +
          (date_utils.diff(today, this.gantt_start, "hour") / this.options.step) *
          this.options.column_width,
        date: today
      }
    }

    for (let date of this.dates) {
      const todayDate = new Date();
      const startDate = new Date(date);
      const endDate = new Date(date);
      switch (view_mode) {
        case VIEW_MODE.WEEK:
          endDate.setDate(date.getDate() + 7);
          break;
        case VIEW_MODE.MONTH:
          endDate.setMonth(date.getMonth() + 1);
          break;
        case VIEW_MODE.YEAR:
          endDate.setFullYear(date.getFullYear() + 1);
          break;
      }
      if (todayDate >= startDate && todayDate <= endDate) {
        return { x, date: startDate }
      } else {
        x += this.options.column_width;
      }
    }
  }

  make_grid_highlights() {
    if (this.options.highlight_weekend) this.highlightWeekends()
    // highlight today's | week's | month's | year's
    if (
      this.view_is(VIEW_MODE.DAY) ||
      this.view_is(VIEW_MODE.WEEK) ||
      this.view_is(VIEW_MODE.MONTH) ||
      this.view_is(VIEW_MODE.YEAR)
    ) {
      // Used as we must find the _end_ of session if view is not Day
      const grid_width = this.dates.length * this.options.column_width;
      this.$today_overlay = this.create_el({ width: grid_width, classes: 'gantt-today-overlay', append_to: this.$container_main })

      const { x: left, date } = this.computeGridHighlightDimensions(this.options.view_mode)
      const top = 0;
      const height = (this.options.bar_height + this.options.padding) * this.tasks.length;
      this.create_el({ top, left, height, classes: 'today-highlight', append_to: this.$today_overlay })

      let $today = document.getElementById(date_utils.format(date).replaceAll(' ', '_'))
      $today.classList.add('today-date-highlight')
      $today.style.top = +$today.style.top.slice(0, -2) - 4 + 'px'
      $today.style.left = +$today.style.left.slice(0, -2) - 8 + 'px'
    }
  }

  create_el({ left, top, width, height, id, classes, append_to }) {
    let $el = document.createElement("div");
    $el.classList.add(classes)
    $el.style.top = top + 'px'
    $el.style.left = left + 'px'
    if (id) $el.id = id
    if (width) $el.style.width = width + 'px'
    if (height) $el.style.height = height + 'px'
    append_to.appendChild($el)
    return $el
  }

  make_dates() {
    this.upper_texts_x = {}
    this.get_dates_to_draw().forEach((date, i) => {
      let $lower_text = this.create_el({
        left: date.lower_x,
        top: date.lower_y,
        id: date.formatted_date,
        classes: 'lower-text',
        append_to: this.$lower_header
      })
      $lower_text.innerText = date.lower_text
      $lower_text.style.left = +$lower_text.style.left.slice(0, -2) - $lower_text.clientWidth / 2 + 'px'

      if (date.upper_text) {
        this.upper_texts_x[date.upper_text] = date.upper_x
        let $upper_text = document.createElement('div');
        $upper_text.classList.add('upper-text')
        $upper_text.style.left = date.upper_x + 'px'
        $upper_text.style.top = date.upper_y + 'px'
        $upper_text.innerText = date.upper_text
        this.$upper_header.appendChild($upper_text)

        // remove out-of-bound dates
        if (date.upper_x > this.layers.grid.getBBox().width) {
          $upper_text.remove();
        }
      }
    })
  }

  get_dates_to_draw() {
    let last_date = null;
    const dates = this.dates.map((date, i) => {
      const d = this.get_date_info(date, last_date, i);
      last_date = d;
      return d;
    });
    return dates;
  }

  get_date_info(date, last_date_info) {
    let last_date = last_date_info ? last_date_info.date : date_utils.add(date, 1, "day")
    const date_text = {
      Hour_lower: date_utils.format(date, "HH", this.options.language),
      "Quarter Day_lower": date_utils.format(date, "HH", this.options.language),
      "Half Day_lower": date_utils.format(date, "HH", this.options.language),
      Day_lower:
        date.getDate() !== last_date.getDate()
          ? date_utils.format(date, "D", this.options.language)
          : "",
      Week_lower:
        date.getMonth() !== last_date.getMonth()
          ? date_utils.format(date, "D MMM", this.options.language)
          : date_utils.format(date, "D", this.options.language),
      Month_lower: date_utils.format(date, "MMMM", this.options.language),
      Year_lower: date_utils.format(date, "YYYY", this.options.language),
      Hour_upper:
        date.getDate() !== last_date.getDate()
          ? date_utils.format(date, "D MMMM", this.options.language)
          : "",
      "Quarter Day_upper":
        date.getDate() !== last_date.getDate()
          ? date_utils.format(date, "D MMM", this.options.language)
          : "",
      "Half Day_upper":
        date.getDate() !== last_date.getDate()
          ? date.getMonth() !== last_date.getMonth()
            ? date_utils.format(date, "D MMM", this.options.language)
            : date_utils.format(date, "D", this.options.language)
          : "",
      Day_upper:
        date.getMonth() !== last_date.getMonth() || !last_date_info
          ? date_utils.format(date, "MMMM", this.options.language)
          : "",
      Week_upper:
        date.getMonth() !== last_date.getMonth()
          ? date_utils.format(date, "MMMM", this.options.language)
          : "",
      Month_upper:
        date.getFullYear() !== last_date.getFullYear()
          ? date_utils.format(date, "YYYY", this.options.language)
          : "",
      Year_upper:
        date.getFullYear() !== last_date.getFullYear()
          ? date_utils.format(date, "YYYY", this.options.language)
          : "",
    };
    let column_width = this.view_is(VIEW_MODE.MONTH) ? (date_utils.get_days_in_month(date) * this.options.column_width) / 30 : this.options.column_width;
    const base_pos = {
      x: last_date_info
        ? last_date_info.base_pos_x + last_date_info.column_width
        : 0,
      lower_y: this.options.header_height - 20,
      upper_y: this.options.header_height - 50,
    };
    const x_pos = {
      Hour_lower: column_width / 2,
      Hour_upper: column_width * 12,
      "Quarter Day_lower": column_width / 2,
      "Quarter Day_upper": column_width * 2,
      "Half Day_lower": column_width / 2,
      "Half Day_upper": column_width,
      Day_lower: column_width / 2,
      Day_upper: column_width / 2,
      Week_lower: column_width / 2,
      Week_upper: (column_width * 4) / 2,
      Month_lower: column_width / 2,
      Month_upper: column_width / 2,
      Year_lower: column_width / 2,
      Year_upper: (column_width * 30) / 2,
    };
    return {
      date,
      formatted_date: date_utils.format(date).replaceAll(' ', '_'),
      column_width,
      base_pos_x: base_pos.x,
      upper_text: this.options.lower_text ? this.options.upper_text(date, this.options.view_mode, date_text[`${this.options.view_mode}_upper`]) : date_text[`${this.options.view_mode}_upper`],
      lower_text: this.options.lower_text ? this.options.lower_text(date, this.options.view_mode, date_text[`${this.options.view_mode}_lower`]) : date_text[`${this.options.view_mode}_lower`],
      upper_x: base_pos.x + x_pos[`${this.options.view_mode}_upper`],
      upper_y: base_pos.upper_y,
      lower_x: base_pos.x + x_pos[`${this.options.view_mode}_lower`],
      lower_y: base_pos.lower_y,
    };
  }

  make_bars() {
    this.bars = this.tasks.map((task) => {
      const bar = new Bar(this, task);
      this.layers.bar.appendChild(bar.group);
      return bar;
    });
  }

  make_arrows() {
    this.arrows = [];
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
          this.layers.arrow.appendChild(arrow.element);
          return arrow;
        })
        .filter(Boolean); // filter falsy values
      this.arrows = this.arrows.concat(arrows);
    }
  }

  map_arrows_on_bars() {
    for (let bar of this.bars) {
      bar.arrows = this.arrows.filter((arrow) => {
        return (
          arrow.from_task.task.id === bar.task.id ||
          arrow.to_task.task.id === bar.task.id
        );
      });
    }
  }

  set_width() {
    const cur_width = this.$svg.getBoundingClientRect().width;
    const actual_width = this.$svg.querySelector('.grid .grid-row') ? this.$svg
      .querySelector('.grid .grid-row')
      .getAttribute('width') : 0;
    if (cur_width < actual_width) {
      this.$svg.setAttribute("width", actual_width);
    }
  }

  set_scroll_position(date) {
    if (!date || date === 'start') {
      date = this.gantt_start
    } else if (date === 'today') {
      return this.scroll_today()
    } else if (typeof date === 'string') {
      date = date_utils.parse(date)
    }

    const parent_element = this.$svg.parentElement;
    if (!parent_element) return;

    const hours_before_first_task = date_utils.diff(
      date,
      this.gantt_start,
      "hour",
    ) + 24;

    const scroll_pos =
      (hours_before_first_task / this.options.step) *
      this.options.column_width -
      this.options.column_width;
    parent_element.scrollTo({ left: scroll_pos, behavior: 'smooth' })
  }

  scroll_today() {
    this.set_scroll_position(new Date())
  }

  bind_grid_scroll() {
    const grid_width = this.dates.length * this.options.column_width;

    // onmousewheel
    $.on(
      this.$container_header,
      'wheel',
      (event) => {
        if (event.shiftKey || event.deltaX) {
          const scrollMove = event.deltaX ? event.deltaX : event.deltaY;
          const scrollX = this.$container_main.scrollLeft || 0;
          let newScrollX = scrollX + scrollMove;
          if (newScrollX < 0) {
            newScrollX = 0;
          } else if (newScrollX > grid_width) {
            newScrollX = grid_width;
          }
          this.$container_main.scrollLeft = newScrollX;
          event.preventDefault();
        }
      }
    );

    $.on(this.$container_main,
      'scroll',
      $.throttle(20, () => {
        const scrollLeft = this.$container_main.scrollLeft;
        this.$container_header.scrollLeft = scrollLeft;
      }),
    );
  }

  bind_grid_click() {
    $.on(
      this.$svg,
      this.options.popup_trigger,
      ".grid-row, .grid-header",
      () => {
        this.unselect_all();
        this.hide_popup();
      },
    );
  }

  bind_bar_create() {
    let x_on_start = 0;
    let y_on_start = 0;
    let matched_task = null;
    let is_creating = null;
    let holder = null;

    const radius = this.options.bar_corner_radius;
    const bar_height = this.options.bar_height;
    const row_height = bar_height + this.options.padding;

    $.on(this.$svg, "mousedown", ".grid-row", (e) => {
      // location
      const index = parseInt(e.offsetY / row_height);
      matched_task = this.tasks[index];
      // only empty date
      if (matched_task && matched_task.empty !== true) return;
      // start record
      is_creating = true;
      x_on_start = e.offsetX;
      [, y_on_start] = this.get_snap_coord(e.offsetX, e.offsetY);
      // const date = this.get_snap_date(x_on_start);
    });

    $.on(this.$svg, "mousemove", (e) => {
      if (!is_creating) return;
      let dx = e.offsetX - x_on_start;

      // limit block
      // const width = this.get_snap_position(Math.abs(dx));
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
          class: 'bar-progress',
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

    $.on(this.$svg, "mouseup", () => {
      is_creating = false;
      if (holder) {
        const start_x = holder.getX();
        const end_x = holder.getX() + holder.getBBox().width;
        const date_start = this.get_snap_date(start_x);
        const date_end = this.get_snap_date(end_x);

        const update_task = Object.assign(matched_task, { _start: date_start, _end: date_end, empty: false, invalid: false })
        // Bar
        const update_bar = new Bar(this, update_task);

        // remove old_bar from bars and bar-layers
        const old_bar = this.bars[matched_task._index];
        this.layers.bar.removeChild(old_bar.group);
        this.bars.splice(matched_task._index, 1, update_bar);

        // insert update_bar and update tasks
        const target_postion = this.bars[matched_task._index+1];
        this.layers.bar.insertBefore(update_bar.group, target_postion ? target_postion.group : null);
        this.tasks.splice(matched_task._index, 1, update_task);

        // Arrow
        // before empty all childs, after appendto arrow-layers
        this.layers.arrow.innerHTML = "";
        this.make_arrows();
        this.map_arrows_on_bars();

        // remove holder dom
        this.layers.progress.removeChild(holder);
        // trigger event
        this.trigger_event('date_change', [matched_task, date_start, date_end]);
      }
      holder = null;
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

    $.on(this.$svg, "mousedown", ".bar-wrapper, .handle", (e, element) => {
      const bar_wrapper = $.closest(".bar-wrapper", element);
      bars.forEach((bar) => bar.group.classList.remove("active"));

      if (element.classList.contains("left")) {
        is_resizing_left = true;
      } else if (element.classList.contains("right")) {
        is_resizing_right = true;
      } else if (element.classList.contains("bar-wrapper")) {
        is_dragging = true;
      }

      bar_wrapper.classList.add("active");
      if (this.popup) {
        this.popup.parent.classList.add('hidden');
      }

      x_on_start = e.offsetX;
      y_on_start = e.offsetY;

      parent_bar_id = bar_wrapper.getAttribute("data-id");
      const ids = [
        parent_bar_id
      ];
      // drag sync children
      if (this.options.drag_sync_child) {
        ids.push(...this.get_all_dependent_tasks(parent_bar_id));
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

    $.on(this.$svg, "mousemove", (e) => {
      if (!action_in_progress()) return;
      const dx = e.offsetX - x_on_start;
      const dy = e.offsetY - y_on_start;

      bars.forEach((bar) => {
        if (bar.empty) return;
        const $bar = bar.$bar;
        // limit-block
        // $bar.finaldx = this.get_snap_position(dx);
        // free-distance
        $bar.finaldx = dx;
        this.hide_popup();
        if (is_resizing_left) {
          // 左不能大于右
          if ($bar.finaldx - $bar.owidth >= 0) return;
          if (parent_bar_id === bar.task.id) {
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
          // 右不能小于左
          if ($bar.finaldx + $bar.owidth < 0) return;
          if (parent_bar_id === bar.task.id) {
            bar.update_bar_position({
              width: $bar.owidth + $bar.finaldx,
            });
          }
        } else if (is_dragging && !this.options.readonly) {
          bar.update_bar_position({ x: $bar.ox + $bar.finaldx });
        }
      });
    });

    $.on(this.$svg, "mouseup", () => {
      this.bar_being_dragged = null;
      bars.forEach((bar) => {
        if (bar.empty) return;
        const $bar = bar.$bar;
        if (!$bar.finaldx) return;
        bar.date_changed();
        bar.set_action_completed();
      });
    });

    document.addEventListener("mouseup", () => {
      is_dragging = false;
      is_resizing_left = false;
      is_resizing_right = false;
    });

    $.on(this.$container_main, 'scroll', e => {
      let elements = document.querySelectorAll('.bar-wrapper');
      let localBars = [];
      const ids = [];
      let dx;
      if (x_on_scroll_start) {
        dx = e.currentTarget.scrollLeft - x_on_scroll_start;
      }

      const daysSinceStart = e.currentTarget.scrollLeft / this.options.column_width * this.options.step / 24;
      let format_str = "D MMM"
      if (["Year", "Month"].includes(this.options.view_mode)) format_str = 'YYYY'
      else if (["Day", "Week"].includes(this.options.view_mode)) format_str = 'MMMM'
      else if (this.view_is('Half Day')) format_str = 'D'
      else if (this.view_is('Hour')) format_str = "D MMMM"


      let currentUpper = date_utils.format(
        date_utils.add(this.gantt_start, daysSinceStart, 'day'),
        format_str
      );
      const upperTexts = Array.from(document.querySelectorAll('.upper-text'));
      const $el = upperTexts.find(el => el.textContent === currentUpper)
      if ($el && !$el.classList.contains('current-upper')) {
        const $current = document.querySelector('.current-upper')
        if ($current) {
          $current.classList.remove('current-upper')
          $current.style.left = this.upper_texts_x[$current.textContent] + 'px';
          $current.style.top = this.options.header_height - 50 + 'px';
        }

        $el.classList.add('current-upper')
        let dimensions = this.$svg.getBoundingClientRect()
        // 19 first-point
        $el.style.left = dimensions.x + this.$container_main.scrollLeft + 19 + 'px';
        // 1 border-bottom
        $el.style.top = dimensions.y + this.$container_main.scrollTop - 50 - 1 + 'px';
      }

      Array.prototype.forEach.call(elements, function (el, i) {
        ids.push(el.getAttribute('data-id'));
      });

      if (dx) {
        localBars = ids.map(id => this.get_bar(id));
        if (this.options.auto_move_label) {
          localBars.forEach(bar => {
            bar.update_label_position_on_horizontal_scroll({ x: dx, sx: e.currentTarget.scrollLeft });
          });
        }
      }

      x_on_scroll_start = e.currentTarget.scrollLeft;
    });

    this.bind_bar_progress();
  }

  bind_bar_progress() {
    let x_on_start = 0;
    let y_on_start = 0;
    let is_resizing = null;
    let bar = null;
    let $bar_progress = null;
    let $bar = null;

    $.on(this.$svg, "mousedown", ".handle.progress", (e, handle) => {
      is_resizing = true;
      x_on_start = e.offsetX;
      y_on_start = e.offsetY;

      const $bar_wrapper = $.closest(".bar-wrapper", handle);
      const id = $bar_wrapper.getAttribute("data-id");
      bar = this.get_bar(id);

      $bar_progress = bar.$bar_progress;
      $bar = bar.$bar;

      $bar_progress.finaldx = 0;
      $bar_progress.owidth = $bar_progress.getWidth();
      $bar_progress.min_dx = -$bar_progress.getWidth();
      $bar_progress.max_dx = $bar.getWidth() - $bar_progress.getWidth();
    });

    $.on(this.$svg, "mousemove", (e) => {
      if (!is_resizing) return;
      let dx = e.offsetX - x_on_start;
      let dy = e.offsetY - y_on_start;

      if (dx > $bar_progress.max_dx) {
        dx = $bar_progress.max_dx;
      }
      if (dx < $bar_progress.min_dx) {
        dx = $bar_progress.min_dx;
      }

      const $handle = bar.$handle_progress;
      $.attr($bar_progress, "width", $bar_progress.owidth + dx);
      $.attr($handle, "points", bar.get_progress_polygon_points());
      $bar_progress.finaldx = dx;
    });

    $.on(this.$svg, "mouseup", () => {
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

  get_snap_position(dx) {
    let odx = dx,
      rem,
      position;

    if (this.view_is(VIEW_MODE.WEEK)) {
      rem = dx % (this.options.column_width / 7);
      position =
        odx -
        rem +
        (rem < this.options.column_width / 14
          ? 0
          : this.options.column_width / 7);
    } else if (this.view_is(VIEW_MODE.MONTH)) {
      rem = dx % (this.options.column_width / 30);
      position =
        odx -
        rem +
        (rem < this.options.column_width / 60
          ? 0
          : this.options.column_width / 30);
    } else if (this.view_is(VIEW_MODE.YEAR)) {
      rem = dx % (this.options.column_width / 365);
      position =
        odx -
        rem +
        (rem < this.options.column_width / 120
          ? 0
          : this.options.column_width / 365);
    } else {
      rem = dx % this.options.column_width;
      position =
        odx -
        rem +
        (rem < this.options.column_width / 2 ? 0 : this.options.column_width);
    }
    return position;
  }

  get_snap_coord(ox, oy) {
    let start_x = ox;
    // 网格区
    if (
      this.view_is(VIEW_MODE.HOUR) ||
      this.view_is(VIEW_MODE.HALF_DAY) ||
      this.view_is(VIEW_MODE.QUARTER_DAY) ||
      this.view_is(VIEW_MODE.DAY)
    ) {
      start_x = parseInt(ox / this.options.column_width) * this.options.column_width;
    }

    const padding = this.options.padding / 2;
    const header_height = 0;
    const row_height = this.options.bar_height + this.options.padding;

    const mod = parseInt((oy - header_height) / row_height);
    const start_y = header_height + mod * row_height + padding;

    return [start_x, start_y];
  }

  get_snap_date(x) {
    const x_in_units = x / this.options.column_width;
    return date_utils.add(
      this.gantt_start,
      x_in_units * this.options.step,
      "hour",
    );
  }

  unselect_all() {
    [...this.$svg.querySelectorAll(".bar-wrapper")].forEach((el) => {
      el.classList.remove("active");
    });
    if (this.popup) {
      this.popup.parent.classList.remove('hidden');
    }
  }

  view_is(modes) {
    if (typeof modes === "string") {
      return this.options.view_mode === modes;
    }

    if (Array.isArray(modes)) {
      return modes.some((mode) => this.options.view_mode === mode);
    }

    return false;
  }

  get_task(id) {
    return this.tasks.find((task) => {
      return task.id === id;
    });
  }

  get_bar(id) {
    return this.bars.find((bar) => {
      return bar.task.id === id;
    });
  }

  show_popup(options) {
    if (this.options.popup === false) return
    if (!this.popup) {
      this.popup = new Popup(
        this.$popup_wrapper,
        this.options.popup,
      );
    }
    this.popup.show(options);
  }

  hide_popup() {
    this.popup && this.popup.hide();
  }

  trigger_event(event, args) {
    if (this.options["on_" + event]) {
      this.options["on_" + event].apply(null, args);
    }
  }

  /**
   * Gets the oldest starting date from the list of tasks
   *
   * @returns Date
   * @memberof Gantt
   */
  get_oldest_starting_date() {
    if (!this.tasks.length) return new Date()
    return this.tasks
      .map((task) => task._start)
      .reduce((prev_date, cur_date) =>
        (cur_date && cur_date <= prev_date) ? cur_date : prev_date,
      );
  }

  /**
   * Clear all elements from the parent svg element
   *
   * @memberof Gantt
   */
  clear() {
    this.$svg.innerHTML = "";
    this.$container_toolbar.innerHTML = "";
    this.$header?.remove?.()
    this.$today_overlay?.remove?.();
    this.popup?.hide?.()
  }
}

Gantt.VIEW_MODE = VIEW_MODE;

function generate_id(task) {
  return task.name + "_" + Math.random().toString(36).slice(2, 12);
}
