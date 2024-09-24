export const getLang = function(lan) {
  if (lan === 'zh') {
    return LAN_ZH;
  } else {
    return LAN_EN;
  }
}

export const LAN_ZH = {
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

export const LAN_EN = {
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