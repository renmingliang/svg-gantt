<div align="center">
    <p>Thanks To Frappe Gantt</p>
    <a href="https://frappe.github.io/gantt">
        <b>Go To »</b>
    </a>
</div>

### Contributing

If you want to contribute enhancements or fixes:

1. Clone this repo.
2. `cd` into project directory
3. `yarn`
4. `yarn run dev`
5. Open `index.html` in your browser, make your code changes and test them.

### insert
1. 插入tasks，更新索引_index 及其 dependencies
2. 更新日期 gantt_start、gantt_end -- 重绘
3. 插入grid-row
4. 插入lines_layer
5. 插入bars
6. 重绘arrows
7. 修改高度 grid-background、svg.gantt、today-highlight
8. 修改holiday-highlight -- height=100%
9. 修改tick -- height=5000(设定无限大)


### Feature
1. 局部更新数据，添加or删除；
2. 点击绘制Bar；
3. 限制容器高度滚动；


### TODO
1. 拖拽超限 this.gantt_start 与 this.gantt_end，需更新画布；
2. 点击创建Bar后，make_arrows可动态创建；
3. 点击事件冲突！！！
4. view_mode_padding - 存在数据日期情况下，生效；若未有效，则设置默认值长度；
5. today - scrollTo 日期居中位置显示；
6. 未设置开始时间 or 结束时间 -> 相应变更对于时间点 才更新；
7. 无tasks数据时，空绘制；
