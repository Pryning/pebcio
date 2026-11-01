// pebcio: Casio-style LCD watchface for Pebble Time 2 (emery, 200x228).
// Inspired by CORE91 by tc5206. Segment and weather fonts: DSEG by keshikan (OFL).
import Poco from "commodetto/Poco";
import parseBMF from "commodetto/parseBMF";
import parseRLE from "commodetto/parseRLE";
import Battery from "embedded:sensor/Battery";
import Accelerometer from "embedded:sensor/Accelerometer";
import Message from "pebble/message";

const render = new Poco(screen);

function getFont(name, size) {
    const font = parseBMF(new Resource(`${name}-${size}.fnt`));
    font.bitmap = parseRLE(new Resource(`${name}-${size}-alpha.bm4`));
    return font;
}

// Time and seconds: 7-Segment by Jan Bobrowski (torinak.com, SIL OFL), in
// copies made per size by tools/make_seg7.sh so the digits do not wobble. The
// digits are 768/1024 of the font size tall (snapped to whole pixels) below an
// ascent of 864/1024 (rounded up); the space is one digit wide and serves as
// the blank digit.
const SEG7 = { ascent: 864 / 1024, height: 768 / 1024 };
const TIME_SIZE = 72;
const SEC_SIZE = 24;
const DATE_SIZE = 44;
const timeFont = getFont(`Segment7Px${TIME_SIZE}`, TIME_SIZE);
const dateFont = getFont(`Segment7Px${DATE_SIZE}`, DATE_SIZE);
const secondsFont = getFont(`Segment7Px${SEC_SIZE}`, SEC_SIZE);
const TIME_H = Math.round(SEG7.height * TIME_SIZE);
const TIME_TOP = Math.ceil(SEG7.ascent * TIME_SIZE) - TIME_H;
const SEC_H = Math.round(SEG7.height * SEC_SIZE);
const SEC_TOP = Math.ceil(SEG7.ascent * SEC_SIZE) - SEC_H;
// Temperature, AM/PM: DSEG14 Classic Bold Italic by keshikan (SIL OFL)
const tempFont = getFont("DSEG14Classic-BoldItalic", 20);
const tinyFont = getFont("DSEG14Classic-BoldItalic", 16);                   // AM/PM
const unitFont = getFont("DSEG14Classic-BoldItalic", 14);                   // temperature unit
const weatherFont = getFont("DSEGWeather", 56);
const labelFont = new render.Font("Gothic-Bold", 18);

const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);
const lcd = render.makeColor(255, 255, 255);
const red = render.makeColor(255, 0, 0);
const green = render.makeColor(0, 170, 0);
const labelGrey = render.makeColor(170, 170, 170);
// Unlit LCD segments: a faint shadow, so switched-off indicators can still be
// seen, as on an old LCD (the lightest grey the 64-colour display has)
const ghost = render.makeColor(170, 170, 170);

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// ---------------------------------------------------------------------------
// Layout (emery 200x228). "!" is the blank glyph in the DSEG fonts: it has the
// width of a digit, so padded fields keep their segments in fixed positions.
// ---------------------------------------------------------------------------
const W = render.width;
const FRAME = { x: 3, y: 3, w: W - 6, h: 196 };          // the LCD panel, bottom at 199
const LCD = FRAME;
// Printed LCD graphics in the style of the Casio W-800H: an outline inset in
// the panel, a weather box in the top-right corner and a rule under the status
// icons that runs into it. All of these lines are LINE px thick; margins are
// measured from their inner edges.
const LINE = 2;
const OUTLINE = { x: LCD.x + 3, y: LCD.y + 3, w: LCD.w - 6, h: LCD.h - 6 };
const MARKER_Y = LCD.y + LCD.h - 9;
// The time digits sit low, above the day marker
const DIGITS_Y = MARKER_Y - 12 - TIME_H;
// HH:MM starts 9px inside the outline (its digits' ink starts TIME_INK_L
// into their cells), the seconds follow; digits and the blank share one width,
// so the block width is constant
const TIME_W = render.getTextWidth("88:88", timeFont);
const TIME_INK_L = Math.round(45 / 1024 * TIME_SIZE);
const SEC_GAP = 0;
// At this size the digits leave only ~1px between them, so the seconds
// are drawn apart
const SEC_SPACING = 2;
const SEC_DIGIT_W = render.getTextWidth("8", secondsFont);
const SEC_W = 2 * SEC_DIGIT_W + SEC_SPACING;
const TIME_X = OUTLINE.x + LINE + 9 - TIME_INK_L;
const SEC_X = TIME_X + TIME_W + SEC_GAP;
// Seconds sit a little above the baseline of the minutes, as on CORE91;
// AM/PM sits right above the seconds
// (SEC_Y is the top of the seconds digits, not of the font's line box)
const SEC_Y = DIGITS_Y + TIME_H - 5 - SEC_H;
const AMPM_Y = SEC_Y - 4 - tinyFont.height;
// Weather corner: a box in the top-right corner whose top and right edges are
// the outline itself, with
// the weather icon on top and the temperature below, both centred. The same
// margin WBOX_M separates the border from the widest icon (left and right),
// from the icon area (top) and from the temperature digits (bottom).
// Icon ink boxes in the 56px font, [left, top, right, bottom] from the glyph
// origin, as fontbm renders them (the watch build's converter).
const WEATHER_INK = {
    "1": [5, 1, 38, 34], "2": [0, 18, 43, 41], "3": [0, 17, 43, 55],
    "4": [0, 18, 43, 54], "5": [0, 17, 43, 54], "6": [0, 17, 43, 55],
    "7": [0, 18, 43, 54], "8": [0, 18, 43, 41], "9": [0, 1, 43, 41],
};
const WICON_W = 43;                                       // widest icon (the clouds)
const WICON_H = 40;                                       // tallest icon (sun and cloud)
const TEMP_INK_H = 20;                                    // DSEG digits at 20px, from the line top
const WBOX_M = 10;                                        // left, right and above the icon
const WBOX_M_BOTTOM = 14;                                 // below the temperature
const WICON_GAP = 14;                                     // between icon area and temperature
const WBOX = { w: 2 * LINE + 2 * WBOX_M + WICON_W, h: 2 * LINE + WBOX_M + WICON_H + WICON_GAP + TEMP_INK_H + WBOX_M_BOTTOM };
WBOX.x = OUTLINE.x + OUTLINE.w - WBOX.w;
WBOX.y = OUTLINE.y;
WBOX.cx = WBOX.x + (WBOX.w >> 1);
const WICON_Y = WBOX.y + LINE + WBOX_M;                   // top of the icon area
const WTEMP_Y = WICON_Y + WICON_H + WICON_GAP;
// Numeric date like the Casio W-800H ("21-10") in the 7-segment font: two
// 2-digit fields with a short dash between them, on the rows of the digits'
// middle segment. It sits in the slot under the status icons, left of the
// weather box, centred between the rule and the weather box's bottom line and
// across the slot. Measured on screen at
// 44px: the digits' ink starts 5px below the line top and 2px into the cell,
// and DATE_INK.overhang is where the date's ink ends relative to its last cell.
const DATE_ADV = render.getTextWidth("8", dateFont);
const DATE_INK = { top: 5, left: 2, overhang: -2 };
const DATE_DASH = { w: 5, h: 4, top: 14, gap: 4 };
const DATE_W = 4 * DATE_ADV - DATE_INK.left + DATE_INK.overhang + 2 * DATE_DASH.gap + DATE_DASH.w;
const DATE_SIDE_M = (WBOX.x - OUTLINE.x - LINE - DATE_W) >> 1;
const DATE_X = OUTLINE.x + LINE + DATE_SIDE_M - DATE_INK.left;
// Status icons (battery, quiet time, connection; 34, 15 and 15px wide, 16px
// tall) in the compartment left of the weather box: 10px above and below
// (which sets where the rule under them runs), the date's side margins left
// and right, equally spaced across
const STATUS_M = 10;
const STATUS_X = OUTLINE.x + LINE + DATE_SIDE_M;
const STATUS_GAP = (WBOX.x - DATE_SIDE_M - STATUS_X - (34 + 15 + 15)) >> 1;
const ROW1_Y = OUTLINE.y + LINE + STATUS_M;               // top edge of every status icon
const TOP_RULE_Y = ROW1_Y + 16 + STATUS_M;
const DATE_H = Math.round(SEG7.height * DATE_SIZE);
const DATE_Y = (TOP_RULE_Y + LINE + (WBOX.y + WBOX.h - LINE) - DATE_H) >> 1;  // top of the digits
// Day initials, centred vertically in the black band under the panel: their
// ink is 11px tall, 5px below the text position; today's block adds 4px
const BAND_Y = FRAME.y + FRAME.h;
const DAY_INK_Y = BAND_Y + ((render.height - BAND_Y - 11) >> 1);
const LABEL_Y = DAY_INK_Y - 5;
const DAY_BOX = { w: 17, h: 19, y: DAY_INK_Y - 4 };
const COL_X = FRAME.x + 2;
const COL_W = (FRAME.w - 4) / 7;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
    tempUnit: "C",          // "C" | "F"
    clock: "h24",           // "h24" | "h12"
    seconds: "tap",         // "off" | "tap" | "always"
    weekStart: "mon",       // "mon" | "sun"
    dateFormat: "dm",       // "dm" (30-06) | "md" (6-30)
};

function loadJSON(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.log(`bad ${key} in storage`);
    }
    return fallback;
}

let settings = { ...DEFAULT_SETTINGS, ...loadJSON("settings", {}) };
let weather = loadJSON("weather", null);        // { tempC, icon, time }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let lastDate = new Date();
let drawnMinute = -1;
let batteryPercent = 100;
let batteryCharging = false;
let quietActive = false;
let tapActive = false;
let tapTimer = null;
let secondsSubscribed = false;
let accel = null;
let touch = null;
let touchDown = false;
let connected = true;

function readQuietTime() {
    try {
        quietActive = Natives.quietTimeActive() !== 0;
    } catch (e) {
        quietActive = false;
    }
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

// Bell pictogram: the alarm/chime indicator on a Casio LCD. Struck through, it
// reads as "chimes muted", which is what Quiet Time does.
const BELL = [
    ".......#.......",
    "......###......",
    "....#######....",
    "...#########...",
    "..###########..",
    "..###########..",
    "..###########..",
    "..###########..",
    "..###########..",
    ".#############.",
    ".#############.",
    "###############",
    "###############",
    "...............",
    "......###......",
    ".......#.......",
];
const BELL_W = BELL[0].length;
const BELL_H = BELL.length;

// The slash is part of the pixel art: a 2px diagonal with a 1px gap either side
function quietPixel(x, y) {
    const d = x - y;
    if (d === 0 || d === 1) return true;
    if (d === -1 || d === 2) return false;
    return BELL[y][x] === "#";
}

// Precompute horizontal runs so each draw is a handful of rectangles
const QUIET_RUNS = [];
for (let y = 0; y < BELL_H; y++) {
    let start = -1;
    for (let x = 0; x <= BELL_W; x++) {
        const on = x < BELL_W && quietPixel(x, y);
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
            QUIET_RUNS.push([start, y, x - start]);
            start = -1;
        }
    }
}

function drawQuietIcon(x, y, color) {
    for (const [rx, ry, rw] of QUIET_RUNS)
        render.fillRectangle(color, x + rx, y + ry, rw, 1);
}

// Shown only while the phone is disconnected: the "no signal" mark from
// Casio's radio-controlled watches, an antenna mast with an X for the bars
const ANTENNA = [
    "######",
    ".####.",
    "..##..",
];
const ANTENNA_H = 16;

function drawDisconnectedIcon(x, y, color) {
    ANTENNA.forEach((row, ry) => {
        const start = row.indexOf("#");
        render.fillRectangle(color, x + start, y + ry, row.lastIndexOf("#") - start + 1, 1);
    });
    render.fillRectangle(color, x + 2, y + ANTENNA.length, 2, ANTENNA_H - ANTENNA.length);
    // 7x7 cross, 2px strokes
    for (let i = 0; i < 6; i++) {
        render.fillRectangle(color, x + 8 + i, y + 9 + i, 2, 1);
        render.fillRectangle(color, x + 13 - i, y + 9 + i, 2, 1);
    }
}

function drawBattery(x, y) {
    // Outlined cell with six level segments, 31x16 plus the terminal nub.
    // Red at two segments or fewer, green while charging; empty ones are ghosts.
    render.fillRectangle(black, x, y, 31, 16);
    render.fillRectangle(lcd, x + 2, y + 2, 27, 12);
    render.fillRectangle(black, x + 31, y + 5, 3, 6);
    const bars = Math.min(6, Math.ceil(batteryPercent * 6 / 100));
    const color = batteryCharging ? green : bars <= 2 ? red : black;
    for (let i = 0; i < 6; i++)
        render.fillRectangle(i < bars ? color : ghost, x + 4 + i * 4, y + 4, 3, 8);
}

function drawTemperature(centerX, y, maxW) {
    let text = "--";
    let negative = false;
    if (weather) {
        const t = settings.tempUnit === "F"
            ? Math.round(weather.tempC * 9 / 5 + 32)
            : weather.tempC;
        negative = t < 0;
        text = String(Math.abs(t));
    }
    const numW = render.getTextWidth(text, tempFont);
    // Positions from the text origin, measured on the rendered 20px glyphs:
    // a digit's ink ends 1px before its cell (a "1" lights only the right of
    // its cell, from 11px), then a 2px gap, the 7px degree ring, a 2px gap and
    // the 9px unit letter. Centre what is visible.
    const lead = text[0] === "1" ? 11 : 1;
    const minusW = negative ? 8 : 0;                       // 6px bar and a 2px gap
    const left = lead - minusW;
    const ringX = numW + 1;
    // Drop the unit letter when it would not fit, e.g. "102°"
    let unit = settings.tempUnit;
    let right = ringX + 7 + 2 + 9;
    if (right - left > maxW) {
        unit = "";
        right = ringX + 7;
    }
    const x = Math.round(centerX - (right - left) / 2) - left;
    // DSEG's "-" fills a whole digit cell; a compact bar keeps "-12" narrow
    if (negative) render.fillRectangle(black, x + left, y + 8, 6, 3);
    render.drawText(text, tempFont, black, x, y);
    drawDegreeRing(x + ringX, y);
    if (unit) render.drawText(unit, unitFont, black, x + ringX + 9, y);
}

// Degree sign: a symmetric 7x7 ring with 2px strokes, drawn pixel by pixel
// (small filled circles come out lopsided)
const DEGREE_RING = [
    "..###..",
    ".#####.",
    "##...##",
    "##...##",
    "##...##",
    ".#####.",
    "..###..",
];

function drawDegreeRing(x, y) {
    DEGREE_RING.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
            if (row[rx] !== "#") continue;
            let run = 1;
            while (row[rx + run] === "#") run++;
            render.fillRectangle(black, x + rx, y + ry, run, 1);
            rx += run - 1;
        }
    });
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
function secondsVisible() {
    return settings.seconds === "always" || (settings.seconds === "tap" && tapActive);
}

function drawSeconds(now) {
    const text = String(now.getSeconds()).padStart(2, "0");
    const y = SEC_Y - SEC_TOP;
    render.drawText(text[0], secondsFont, black, SEC_X, y);
    render.drawText(text[1], secondsFont, black, SEC_X + SEC_DIGIT_W + SEC_SPACING, y);
}

function draw(event) {
    const now = event?.date ?? lastDate;
    lastDate = now;
    drawnMinute = now.getMinutes();
    readQuietTime();

    render.begin();
    render.fillRectangle(black, 0, 0, W, render.height);

    // LCD panel
    render.drawRoundRect(LCD.x, LCD.y, LCD.w, LCD.h, lcd, 10);

    // Printed outline, and the rule under the status icons up to the weather box
    render.frameRoundRect(OUTLINE.x, OUTLINE.y, OUTLINE.w, OUTLINE.h, black, 7);
    render.frameRoundRect(OUTLINE.x + 1, OUTLINE.y + 1, OUTLINE.w - 2, OUTLINE.h - 2, black, 6);
    render.fillRectangle(black, OUTLINE.x, TOP_RULE_Y, WBOX.x - OUTLINE.x, LINE);

    // Status row: battery, quiet time, disconnected (unlit indicators as ghosts)
    drawBattery(STATUS_X, ROW1_Y);
    drawQuietIcon(STATUS_X + 34 + STATUS_GAP, ROW1_Y, quietActive ? black : ghost);
    drawDisconnectedIcon(STATUS_X + 34 + 15 + 2 * STATUS_GAP, ROW1_Y, connected ? ghost : black);

    // Weather corner
    // Its left edge, and its bottom edge as a rule across the whole panel
    render.fillRectangle(black, WBOX.x, WBOX.y, LINE, WBOX.h);
    render.fillRectangle(black, OUTLINE.x, WBOX.y + WBOX.h - LINE, OUTLINE.w, LINE);
    if (weather) {
        const [l, t, r, b] = WEATHER_INK[weather.icon] ?? WEATHER_INK["2"];
        const x = WBOX.x + LINE + WBOX_M + ((WICON_W - (r - l)) >> 1) - l;
        const y = WICON_Y + ((WICON_H - (b - t)) >> 1) - t;
        render.drawText(weather.icon, weatherFont, black, x, y);
    }
    drawTemperature(WBOX.cx, WTEMP_Y, WBOX.w - 2 * LINE);

    // Date: DD-MM or MM-DD. As on a Casio the first field has no leading zero
    // (its first cell stays empty), the second always has two digits.
    const day = String(now.getDate());
    const month = String(now.getMonth() + 1);
    const [first, second] = settings.dateFormat === "md" ? [month, day] : [day, month];
    const y = DATE_Y - DATE_INK.top;
    render.drawText(first, dateFont, black, DATE_X + (2 - first.length) * DATE_ADV, y);
    const dashX = DATE_X + 2 * DATE_ADV + DATE_DASH.gap;
    render.fillRectangle(black, dashX, DATE_Y + DATE_DASH.top, DATE_DASH.w, DATE_DASH.h);
    render.drawText(second.padStart(2, "0"), dateFont, black,
        dashX + DATE_DASH.w + DATE_DASH.gap - DATE_INK.left, y);

    // Time
    let hours = now.getHours();
    let hoursStr;
    if (settings.clock === "h12") {
        render.drawText(hours < 12 ? "AM" : "PM", tinyFont, black, SEC_X, AMPM_Y);
        hours = hours % 12 || 12;
        hoursStr = String(hours).padStart(2, " ");
    } else {
        hoursStr = String(hours).padStart(2, "0");
    }
    const timeStr = `${hoursStr}:${String(now.getMinutes()).padStart(2, "0")}`;
    render.drawText(timeStr, timeFont, black, TIME_X, DIGITS_Y - TIME_TOP);

    if (secondsVisible())
        drawSeconds(now);

    // Day of week: initials under the panel, today's shown inverted
    const weekStartDay = settings.weekStart === "sun" ? 0 : 1;
    const today = (now.getDay() - weekStartDay + 7) % 7;
    for (let i = 0; i < 7; i++) {
        const label = DAY_LABELS[(i + weekStartDay) % 7];
        const cx = (COL_X + (i + 0.5) * COL_W) | 0;
        let color = labelGrey;
        if (i === today) {
            render.fillRectangle(labelGrey, cx - (DAY_BOX.w >> 1), DAY_BOX.y, DAY_BOX.w, DAY_BOX.h);
            color = black;
        }
        const lw = render.getTextWidth(label, labelFont);
        render.drawText(label, labelFont, color, cx - (lw >> 1), LABEL_Y);
    }

    render.end();
}

// Per-second updates repaint only the seconds digits
function onSecond(event) {
    const now = event.date;
    if (now.getMinutes() !== drawnMinute) {
        draw(event);
        return;
    }
    lastDate = now;
    render.begin(SEC_X, SEC_Y, SEC_W, SEC_H);
    render.fillRectangle(lcd, SEC_X, SEC_Y, SEC_W, SEC_H);
    drawSeconds(now);
    render.end();
}

function updateSecondsSubscription() {
    const want = secondsVisible();
    if (want && !secondsSubscribed) {
        secondsSubscribed = true;
        watch.addEventListener("secondchange", onSecond);   // fires immediately
    } else if (!want && secondsSubscribed) {
        secondsSubscribed = false;
        watch.removeEventListener("secondchange", onSecond);
    }
}

// ---------------------------------------------------------------------------
// Interaction: a wrist flick, a touch, or coming back to the watchface after
// using the buttons shows seconds for 30 seconds
// ---------------------------------------------------------------------------
function onInteraction() {
    if (settings.seconds !== "tap") return;
    tapActive = true;
    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
        tapTimer = null;
        tapActive = false;
        updateSecondsSubscription();
        draw();
    }, 30000);
    draw();
    updateSecondsSubscription();
}

function onTouch() {
    // React to touch-down only, not to every position update of a drag
    const down = !!touch?.sample()?.length;
    if (down && !touchDown) onInteraction();
    touchDown = down;
}

function applySettings() {
    // The accelerometer and touch sensor are only powered in interaction mode
    const wantSensors = settings.seconds === "tap";
    if (wantSensors && !accel) {
        accel = new Accelerometer({ onTap: onInteraction });
        if (device.sensor.Touch) touch = new device.sensor.Touch({ onSample: onTouch });
    } else if (!wantSensors && accel) {
        accel.close();
        accel = null;
        touch?.close();
        touch = null;
    }
    if (settings.seconds !== "tap") {
        tapActive = false;
        if (tapTimer) clearTimeout(tapTimer);
        tapTimer = null;
    }
    updateSecondsSubscription();
    draw();
}

// ---------------------------------------------------------------------------
// Phone messages: Clay settings and weather
// ---------------------------------------------------------------------------
const SETTING_KEYS = {
    TempUnit: "tempUnit",
    ClockFormat: "clock",
    SecondsMode: "seconds",
    WeekStart: "weekStart",
    DateFormat: "dateFormat",
};

let weatherRequested = false;
// When the last weather request was actually sent, kept across launches: the
// watchface restarts after every button press
let lastWeatherRequest = Number(localStorage.getItem("weatherRequest")) || 0;

const message = new Message({
    // Small buffers: the defaults take 16 kB of the app heap
    input: 256,
    output: 64,
    keys: ["TempUnit", "ClockFormat", "SecondsMode", "WeekStart", "DateFormat",
           "Temperature", "WeatherIcon", "RequestWeather"],
    onReadable() {
        const msg = this.read();
        let changed = false;
        for (const key in SETTING_KEYS) {
            const value = msg.get(key);
            if (value !== undefined) {
                settings[SETTING_KEYS[key]] = String(value);
                changed = true;
            }
        }
        if (changed) {
            localStorage.setItem("settings", JSON.stringify(settings));
            applySettings();
        }

        const temp = msg.get("Temperature");
        const icon = msg.get("WeatherIcon");
        if (temp !== undefined && icon !== undefined) {
            weather = { tempC: temp, icon: String(icon), time: Date.now() };
            localStorage.setItem("weather", JSON.stringify(weather));
            draw();
        }
    },
    onWritable() {
        if (weatherRequested) sendWeatherRequest();
    },
});

function sendWeatherRequest() {
    try {
        message.write(new Map([["RequestWeather", 1]]));
        weatherRequested = false;
        lastWeatherRequest = Date.now();
        localStorage.setItem("weatherRequest", String(lastWeatherRequest));
    } catch (e) {
        // Not writable yet: onWritable retries
    }
}

function requestWeather() {
    weatherRequested = true;
    sendWeatherRequest();
}

// Weather is fetched on the hour and half hour. When it is stale (older than
// 35 minutes, e.g. the phone could not get a location), it is retried at most
// every 15 minutes, so an unreachable phone is not asked every minute.
function maybeRequestWeather(date) {
    if (weatherRequested) return;                         // one is already waiting to go out
    const now = Date.now();
    let sinceRequest = now - lastWeatherRequest;
    if (sinceRequest < 0) sinceRequest = Infinity;        // the clock was set back
    const stale = !weather || now - weather.time > 35 * 60 * 1000;
    if ((date.getMinutes() % 30 === 0 && sinceRequest > 60 * 1000) ||
        (stale && sinceRequest >= 15 * 60 * 1000))
        requestWeather();
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
const battery = new Battery({
    onSample() {
        const sample = this.sample();
        batteryPercent = sample.percent;
        batteryCharging = sample.charging;
        draw();
    },
});
({ percent: batteryPercent, charging: batteryCharging } = battery.sample());

// Back in focus after a modal window such as a notification
watch.addEventListener("didFocus", focused => {
    if (!focused) return;
    if (settings.seconds === "tap") onInteraction();
    else draw();
});

function checkConnection() {
    connected = watch.connected.app;
    // A request made before the phone's JavaScript was reachable goes out now
    if (weatherRequested && watch.connected.pebblekit) sendWeatherRequest();
    draw();
}
watch.addEventListener("connected", checkConnection);
connected = watch.connected.app;

watch.addEventListener("minutechange", event => {
    draw(event);
    if (weatherRequested) sendWeatherRequest();           // still waiting to go out
    maybeRequestWeather(event.date);
});

applySettings();

// Watchfaces get no button events. A button press opens the launcher or the
// timeline, which quits the watchface, and it starts again on return: so a
// launch is the button interaction.
if (settings.seconds === "tap") onInteraction();
