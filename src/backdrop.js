export default class Backdrop {
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