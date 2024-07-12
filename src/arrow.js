import { createSVG } from "./svg_utils";

export default class Arrow {
  constructor(gantt, from_task, to_task) {
    this.gantt = gantt;
    this.from_task = from_task;
    this.to_task = to_task;

    this.calculate_path();
    this.draw();
    this.drawInner();
  }

  calculate_path() {
    if (this.to_task.empty) return;

    const rowHeight = this.gantt.options.bar_height + this.gantt.options.padding;
    const taskHeight = this.gantt.options.bar_height;
    const arrowCurve = this.gantt.options.arrow_curve;
    const arrowIndent = this.gantt.options.column_width / 2;
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
      "data-from": this.from_task.task.id,
      "data-to": this.to_task.task.id,
    });
  }

  drawInner() {
    if (this.to_task.empty) return;

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
    if (this.to_task.empty) return;

    this.calculate_path();
    this.svgPath.setAttribute("d", this.path);
    this.svgPolygon.setAttribute("points", this.points);
  }
}
