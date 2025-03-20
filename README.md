### TKS
<div align="center">
    <p>Thanks To Frappe Gantt</p>
    <a href="https://frappe.github.io/gantt">
        <b>Go To »</b>
    </a>
</div>

### Step

1. Clone this repo.
2. `cd` into project directory
3. `yarn`
4. `yarn run dev`
5. Open `index.html` in your browser

### Feature
1. 支持多维度(Hour、Quarter Day、Half Day、Day、Week、Month、Quarter Year、Year)；
2. 局部更新数据，添加or删除；
3. 鼠标点击空白区域绘制Bar；
4. 支持限制容器高度滚动；
5. view_mode_padding - 数据两端阀值；
6. today - scrollTo 日期1/3位置显示；
7. 未设置开始时间 or 结束时间，补全时间段(假定2天)；
8. 动态权限控制，readonly；
9. 支持拖拽超限 this.gantt_start 与 this.gantt_end，更新画布；

### Todo
1. virtual scroll；