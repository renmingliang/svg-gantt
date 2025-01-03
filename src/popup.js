export default class Popup {
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
      pos_x = 5
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
