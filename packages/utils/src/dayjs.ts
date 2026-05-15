import day from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

day.extend(utc);
day.extend(timezone);
day.extend(relativeTime);
day.extend(duration);
day.extend(customParseFormat);
day.extend(isBetween);

export default day;
