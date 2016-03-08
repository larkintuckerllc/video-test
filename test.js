(function() {
  'use strict';
  var MASTER = 0;
  var CHANNELS = [0, 1];
  var MAX_DRIFT = 0.03;
  var PING = 0;
  var READY = 1;
  var STANDBY = 2;
  var PLAY = 3;
  var SYNC = 4;
  var DRIFTED = 5;
  var PAUSE = 6;
  var thr0w = window.thr0w;
  document.addEventListener('DOMContentLoaded', ready);
  function ready() {
    var thr0wReady = false;
    var videoReady = false;
    var frameEl = document.getElementById('frame');
    var videoEl = document.getElementById('video');
    var channel;
    var delay;
    var channelsReady = {};
    var thr0wReadyToMasterInterval;
    var thr0wSyncToChannelsInterval;
    videoEl.addEventListener('canplaythrough', handleCanPlayThrough);
    videoEl.addEventListener('pause', handlePause);
    thr0w.setBase('http://localhost');
    thr0w.addAdminTools(frameEl, connectCallback, messageCallback);
    function handleCanPlayThrough() {
      window.console.log('HANDLECANPLAYTHROUGH');
      videoReady = true;
      ifReady();
    }
    function handlePause() {
      if (channel === MASTER) {
        thr0w.thr0wChannel(CHANNELS, {
          status: PAUSE,
          time: videoEl.currentTime + 0.03
        });
      }
    }
    function connectCallback() {
      thr0wReady = true;
      channel = thr0w.getChannel();
      if (channel === MASTER) {
        delay = (new Date()).getTime();
        thr0w.thr0wChannel([MASTER], {status: PING});
      } else {
        ifReady();
      }
    }
    function messageCallback(data) {
      var source = data.source;
      switch (data.message.status) {
        case PING:
          delay = ((new Date()).getTime() - delay) / 1000;
          ifReady();
          break;
        case READY:
          channelsReady[source] = true;
          thr0w.thr0wChannel([source], {status: STANDBY});
          ifAllReady();
          break;
        case STANDBY:
          window.clearInterval(thr0wReadyToMasterInterval);
          break;
        case PLAY:
          videoEl.play();
          delay = data.message.delay;
          if (channel === MASTER) {
            thr0wSyncToChannelsInterval =
              window.setInterval(thr0wSyncToChannels, 1000);
          }
          break;
        case SYNC:
          if (channel !== MASTER) {
            ifDrift(data.message.time);
          }
          break;
        case DRIFTED:
          videoEl.pause();
          window.clearInterval(thr0wSyncToChannelsInterval);
          break;
        case PAUSE:
          videoEl.pause();
          videoEl.currentTime = data.message.time;
          break;
        default:
      }
    }
    function ifReady() {
      if (thr0wReady && videoReady) {
        if (channel === MASTER) {
          channelsReady[MASTER] = true;
          ifAllReady();
        } else {
          thr0wReadyToMasterInterval =
            window.setInterval(thr0wReadyToMaster, 1000);
        }
      }
    }
    function ifAllReady() {
      var i;
      for (i = 0; i < CHANNELS.length; i++) {
        if (!channelsReady[CHANNELS[i]]) {
          return;
        }
      }
      channelsReady = {};
      thr0w.thr0wChannel(CHANNELS, {
        status: PLAY,
        delay: delay
      });
    }
    function thr0wReadyToMaster() {
      thr0w.thr0wChannel([MASTER], {status: READY});
    }
    function thr0wSyncToChannels() {
      thr0w.thr0wChannel(CHANNELS, {
        status: SYNC,
        time: videoEl.currentTime
      });
    }
    function ifDrift(time) {
      var drift = Math.abs(videoEl.currentTime - time + delay);
      window.console.log('DRIFT: ' + drift);
      if (drift > MAX_DRIFT) {
        thr0w.thr0wChannel([MASTER], {status: DRIFTED});
      }
    }
  }
})();
