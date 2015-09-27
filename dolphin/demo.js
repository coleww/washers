var fullHouse = require('full-house')
// var imgs = document.querySelectorAll('img');
// for (var i = imgs.length; i >= 0; i--) {
//     document.body.appendChild(imgs[Math.random() * i | 0]);
// }
fullHouse(document.getElementsByTagName('img'))
var Tuna = require('tunajs')

var SamplePlayer = require('@coleww/openmusic-sample-player')
var loadSample2Buff = require('load-sample-2-buff')

var ac = new AudioContext()
var tuna = new Tuna(ac);
var delay = new tuna.Delay({
    feedback: 0.65,    //0 to 1+
    delayTime: 15,    //how many milliseconds should the wet signal be delayed?
    wetLevel: 0.75,    //0 to 1+
    dryLevel: 0.25,       //0 to 1+
    cutoff: 12500,      //cutoff frequency of the built in lowpass-filter. 12 to 12050
    bypass: 0
});

var delay2 = new tuna.Delay({
    feedback: 0.65,    //0 to 1+
    delayTime: 75,    //how many milliseconds should the wet signal be delayed?
    wetLevel: 0.5,    //0 to 1+
    dryLevel: 0.25,       //0 to 1+
    cutoff: 15000,      //cutoff frequency of the built in lowpass-filter. 12 to 12050
    bypass: 0
});

var d1player = SamplePlayer(ac)
d1player.connect(delay)
// delay.connect(ac.destination)

loadSample2Buff(ac, './d1.wav', function(buffer){
  d1player.buffer = buffer
})

var d2player = SamplePlayer(ac)
d2player.connect(delay)

delay.connect(delay2)
delay2.connect(ac.destination)

loadSample2Buff(ac, './d2.wav', function(buffer){
  d2player.buffer = buffer
})


var delay3 = new tuna.Delay({
    feedback: 0.75,    //0 to 1+
    delayTime: 25,    //how many milliseconds should the wet signal be delayed?
    wetLevel: 0.75,    //0 to 1+
    dryLevel: 0.5,       //0 to 1+
    cutoff: 11700,      //cutoff frequency of the built in lowpass-filter. 20 to 20050
    bypass: 0
});
var d3player = SamplePlayer(ac)
d3player.connect(delay3)
delay3.connect(delay2)

var g =  ac.createGain();

delay3.connect(g)

delay.connect(g)

delay2.connect(g)
g.connect(ac.destination)
g.gain.setValueAtTime(0, ac.currentTime)

loadSample2Buff(ac, './d3.wav', function(buffer){
  d3player.buffer = buffer
})

function random(){
  return (Math.random() * 12) - 10
}

var dolphin_index = 0
var done = false
function dolph(){
  if (!done) (done = true) && g.gain.linearRampToValueAtTime(0.9, ac.currentTime + 17)

  dolphin_index == 3 ? d2player.start(0) : d1player.start(0)
  dolphin_index++
  if(dolphin_index > 3) dolphin_index = 0
  if (Math.random() < 0.3) d3player.start(0)
  window.setTimeout(function(){
    dolph()

  }, 500 + Math.random() * 3000)
}

// ZZOMG CAROUSEL
var i = 1

function cycle(){
  document.querySelector('img:nth-child('+ i +')').style.opacity = 0
  // if (i > 2) document.querySelector('img:nth-child('+ (i - 1) +')').style.opacity = 0.3
  i = ~~(Math.random() * 11) + 1
  document.querySelector('img:nth-child('+ i +')').style.opacity = 0.95
  // if(i < 40) document.querySelector('img:nth-child('+ (i + 1) +')').style.opacity = 0.3
  window.setTimeout(function(){
    cycle()
  }, 250 + Math.random() * 2500)
}

var j = 10

function doubleIt(){
  document.querySelector('img:nth-child('+ j +')').style.opacity = 0
  // if (i > 2) document.querySelector('img:nth-child('+ (i - 1) +')').style.opacity = 0.3
  if(++j > 12) {
    document.querySelector('img:nth-child('+ j +')').style.opacity = 0
    j = 1
  }
  document.querySelector('img:nth-child('+ j +')').style.opacity = 0.5
  // if(i < 40) document.querySelector('img:nth-child('+ (i + 1) +')').style.opacity = 0.3
  window.setTimeout(function(){
    doubleIt()
  }, 350 + Math.random() * 150)
}

window.setTimeout(function(){
  doubleIt()
}, 10103)

var k = 15

function tripleIt(){
  document.querySelector('img:nth-child('+ k +')').style.opacity = 0
  // if (i > 2) document.querySelector('img:nth-child('+ (i - 1) +')').style.opacity = 0.3
  if(++k > 12) {
    document.querySelector('img:nth-child('+ k +')').style.opacity = 0
    k = 1
  }
  document.querySelector('img:nth-child('+ k +')').style.opacity = 0.45
  // if(i < 40) document.querySelector('img:nth-child('+ (i + 1) +')').style.opacity = 0.3
  window.setTimeout(function(){
    tripleIt()
  }, 150 + Math.random() * 350)
}

window.setTimeout(function(){
  tripleIt()
}, 12700)


window.setTimeout(function(){
  document.querySelector('h1').style.opacity = 0
  document.querySelector('h3').style.opacity = 0
  cycle()
  dolph()


}, 3000)



var toggly = true
window.setInterval(function(){
  document.querySelector('h1').style.opacity = toggly ? 0 : 0.75
  document.querySelector('h1').style.top =  (~~(Math.random() * 750) + 25) + 'px'
  document.querySelector('h1').style.left = (~~(Math.random() * 750) + 25) + 'px'
  toggly = !toggly
}, 7000)

var decrease = false
var nerf = false

var counter = 0

window.setInterval(function(){
  counter++
  nerf =  (counter > 25)
  decrease = (counter > 50)
  console.log("INCREASING", delay.delayTime.value, delay2.delayTime.value, delay3.delayTime.value, g.gain.value)
  delay.delayTime.value = delay.delayTime.value * 1.75
  delay3.delayTime.value = delay3.delayTime.value * 1.85
  delay2.delayTime.value = delay2.delayTime.value * 1.5
  if (nerf) {

    delay.dryLevel.value = delay.dryLevel.value * 0.85
    delay3.dryLevel.value = delay3.dryLevel.value * 0.85
    delay2.dryLevel.value = delay2.dryLevel.value * 0.85
  }
  if (decrease){
    if(delay.cutoff.value > 1000) delay.cutoff.value = delay.cutoff.value * 0.85
    if(delay3.cutoff.value > 750) delay3.cutoff.value = delay3.cutoff.value * 0.85
    if(delay2.cutoff.value > 500) delay2.cutoff.value = delay2.cutoff.value * 0.85

  }
}, 5000)