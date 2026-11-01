module.exports = [
  {
    "type": "heading",
    "defaultValue": "CORCIO LCD"
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Time"
      },
      {
        "type": "radiogroup",
        "messageKey": "ClockFormat",
        "label": "Clock",
        "defaultValue": "h24",
        "options": [
          { "label": "24 hour", "value": "h24" },
          { "label": "12 hour", "value": "h12" }
        ]
      },
      {
        "type": "radiogroup",
        "messageKey": "SecondsMode",
        "label": "Seconds",
        "defaultValue": "tap",
        "options": [
          { "label": "Don't show seconds", "value": "off" },
          { "label": "Show for 30 seconds after any interaction (wrist flick, touch, buttons)", "value": "tap" },
          { "label": "Always show seconds", "value": "always" }
        ]
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Date"
      },
      {
        "type": "radiogroup",
        "messageKey": "DateFormat",
        "label": "Date format",
        "defaultValue": "dm",
        "options": [
          { "label": "DATE-MONTH (30-06)", "value": "dm" },
          { "label": "MONTH-DATE (6-30)", "value": "md" }
        ]
      },
      {
        "type": "radiogroup",
        "messageKey": "WeekStart",
        "label": "Week starts on",
        "defaultValue": "mon",
        "options": [
          { "label": "Monday", "value": "mon" },
          { "label": "Sunday", "value": "sun" }
        ]
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Weather"
      },
      {
        "type": "radiogroup",
        "messageKey": "TempUnit",
        "label": "Temperature",
        "defaultValue": "C",
        "options": [
          { "label": "Celsius (°C)", "value": "C" },
          { "label": "Fahrenheit (°F)", "value": "F" }
        ]
      }
    ]
  },
  {
    "type": "submit",
    "defaultValue": "Save"
  }
];
