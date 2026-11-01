var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var clay = new Clay(clayConfig);

// WMO weather code -> DSEGWeather glyph
// 1 sun, 2 cloud, 3 rain, 4 heavy rain, 5 snow, 6 storm + rain, 7 storm + heavy rain, 9 sun + cloud
function weatherGlyph(code) {
  if (code <= 1) return '1';
  if (code === 2) return '9';
  if (code === 3 || code === 45 || code === 48) return '2';
  if (code >= 51 && code <= 63) return '3';
  if (code >= 64 && code <= 67) return '4';
  if (code >= 71 && code <= 77) return '5';
  if (code === 80) return '3';
  if (code === 81 || code === 82) return '4';
  if (code === 85 || code === 86) return '5';
  if (code === 95) return '6';
  if (code >= 96) return '7';
  return '2';
}

function fetchWeather() {
  navigator.geolocation.getCurrentPosition(function(pos) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + pos.coords.latitude +
      '&longitude=' + pos.coords.longitude + '&current=temperature_2m,weather_code';
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      try {
        var current = JSON.parse(this.responseText).current;
        Pebble.sendAppMessage({
          'Temperature': Math.round(current.temperature_2m),
          'WeatherIcon': weatherGlyph(current.weather_code)
        });
      } catch (e) {
        console.log('Bad weather response: ' + e);
      }
    };
    xhr.onerror = function() { console.log('Weather request failed'); };
    xhr.open('GET', url);
    xhr.send();
  }, function(err) {
    console.log('Location error: ' + err.message);
  }, { timeout: 15000, maximumAge: 10 * 60 * 1000 });
}

// No fetch on 'ready': the watch asks when it needs weather (on the hour
// and half hour, or when its copy is stale), so a watchface restart after a
// button press does not trigger a fetch. The watch's Alloy message module
// only lets the watch send once it has received a message from the phone, so
// 'ready' just says hello.
Pebble.addEventListener('ready', function() {
  Pebble.sendAppMessage({ 'RequestWeather': 0 });
});

Pebble.addEventListener('appmessage', function(e) {
  if (e.payload.RequestWeather) fetchWeather();
});
