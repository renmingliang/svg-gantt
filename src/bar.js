import date_utils from "./date_utils";
import { $, createSVG, animateSVG } from "./svg_utils";
import { VIEW_MODE } from "./lang_utils";

export default class Bar {
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
      this.gantt.trigger_event("hover", [this.task, e.screenX, e.screenY, e])
    })

    let timeout;
    $.on(this.group, "mouseenter", (e) => timeout = setTimeout(() => {
      const scrollLeft = this.gantt.$container_main.scrollLeft;
      this.show_popup(e.offsetX - scrollLeft);
    }, 600))

    $.on(this.group, "mouseleave", () => {
      clearTimeout(timeout)
      this.gantt.hide_popup();
    })

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
      const label = this.bar_group.querySelector('.bar-label')
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
