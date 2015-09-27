(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var setterGetterify = require('setter-getterify');
var DCBias = require('openmusic-dcbias');

function SamplePlayer(context) {
	var node = context.createGain();
	var nodeProperties = {
		buffer: null,
		loop: false,
		loopStart: 0,
		loopEnd: 0,
		pitchBend: null
	};

	var bufferSourcesCount = 0;
	var bufferSources = {};
	var bufferSourceProperties = {};
	var pitchBend = DCBias(context);

	nodeProperties.pitchBend = pitchBend.gain;
	pitchBend.gain.setValueAtTime(0, context.currentTime);

	setterGetterify(node, nodeProperties, {
		afterSetting: onNodePropertySet
	});

	
	// TODO: player can be mono or poly i.e. only one buffer can play at a given time or many can overlap

	node.start = function(when, offset, duration) {
		
		var buffer = nodeProperties['buffer'];
		if(!buffer) {
			console.info('OpenMusic SamplePlayer: no buffer to play, so byeee!');
			return;
		}

		when = when !== undefined ? when : 0;
		offset = offset !== undefined ? offset : 0;
		
		// TODO This is mega ugly but urgh what is going on urgh
		// if I just pass 'undefined' as duration Chrome doesn't play anything
		if(window.webkitAudioContext) {
			console.log('correcting for chrome aghh');
			var sampleLength = buffer.length;
			duration = duration !== undefined ? duration : sampleLength - offset;
		}

		// Mono: invalidate all scheduled bufferSources to make sure only one is played (retrig mode)
		// TODO implement invalidation code ...

		pitchBend.start(when);

		// Poly: it's fine, just add a new one to the list
		var bs = makeBufferSource();

		// console.log('start', 'when', when, 'offset', offset, 'duration', duration);
		bs.start(when, offset, duration);
		
	};

	node.stop = function(when) {
		// For ease of development, we'll just stop to all the sources and empty the queue
		// If you need to re-schedule them, you'll need to call start() again.
		var keys = Object.keys(bufferSources);
		keys.forEach(function(k) {
			var source = bufferSources[k];
			source.stop(when);
			removeFromQueue(source);
		});
		
		pitchBend.stop(when);
	};

	node.cancelScheduledEvents = function(when) {
		// TODO: when/if there is automation
	};

	return node;
	
	//~~~

	function makeBufferSource() {

		var source = context.createBufferSource();
		source.addEventListener('ended', onBufferEnded);
		source.connect(node);
		source.id = bufferSourcesCount++;
		bufferSources[source.id] = source;

		pitchBend.connect(source.playbackRate);

		Object.keys(nodeProperties).forEach(function(name) {
			source[name] = nodeProperties[name];
		});

		return source;
		
	}

	function onBufferEnded(e) {
		var source = e.target;
		source.stop();
		source.disconnect();
		pitchBend.disconnect(source.playbackRate);
		// also remove from list
		removeFromQueue(source);
	}

	function onNodePropertySet(property, value) {
		var keys = Object.keys(bufferSources);
		keys.forEach(function(k) {
			var src = bufferSources[k];
			src.loopStart = nodeProperties.loopStart;
			src.loopEnd = nodeProperties.loopEnd;
			src.loop = nodeProperties.loop;
		});
	}

	function removeFromQueue(source) {
		delete bufferSources[source.id];
	}

}

module.exports = SamplePlayer;

},{"openmusic-dcbias":2,"setter-getterify":3}],2:[function(require,module,exports){
(function() {
	
	function DCBias(context) {
		
		var output = context.createGain();
		var buffer = context.createBuffer(1, 1, context.sampleRate);
		buffer.getChannelData(0)[0] = 1.0;

		output.start = function(when) {
			bufferSource = context.createBufferSource();
			bufferSource.buffer = buffer;
			bufferSource.loop = true;
			bufferSource.connect(output);
			bufferSource.start(when);
		};

		output.stop = function(when) {
			bufferSource.stop(when);
			bufferSource.disconnect();
		};
		
		return output;

	}

	//
	
	if(typeof module !== 'undefined' && module.exports) {
		module.exports = DCBias;
	} else {
		this.DCBias = DCBias;
	}

}).call(this);

},{}],3:[function(require,module,exports){
module.exports = setterGetterify;


function setterGetterify(object, properties, callbacks) {
	callbacks = callbacks || {};
	var keys = Object.keys(properties);
	keys.forEach(function(key) {
		Object.defineProperty(object, key, makeGetterSetter(properties, key, callbacks));
	});
}


function makeGetterSetter(properties, property, callbacks) {
	var afterSetting = callbacks.afterSetting || function() {};
	return {
		get: function() {
			return getProperty(properties, property);
		},
		set: function(value) {
			setProperty(properties, property, value);
			afterSetting(property, value);
		},
		enumerable: true
	};
}


function getProperty(properties, name) {
	return properties[name];
}


function setProperty(properties, name, value) {
	properties[name] = value;
}



},{}],4:[function(require,module,exports){
var typey = require('get-object-type')

module.exports = function (el) {
  function resize () {
    switch (typey(el)) {
      case 'HTMLCollection':
        for (var i = 0; i < el.length; i++) {
          el[i].style.height = window.innerHeight + 'px'
          el[i].style.width = window.innerWidth + 'px'
        }
        break
      case 'HTMLCanvasElement':
        el.height = window.innerHeight + 'px'
        el.width = window.innerWidth + 'px'
        // go for the gold!
        el.style.height = window.innerHeight + 'px'
        el.style.width = window.innerWidth + 'px'
        break
      default:
        el.style.height = window.innerHeight + 'px'
        el.style.width = window.innerWidth + 'px'
        break
    }
  }

  window.addEventListener('resize', resize, false)

  resize()
}

},{"get-object-type":5}],5:[function(require,module,exports){
'use strict';

module.exports = exports = function (obj) {
	return ({}).toString.call(obj).slice(8, -1);
};

},{}],6:[function(require,module,exports){
module.exports = function(ac, path, cb){

  var request = new XMLHttpRequest();
  request.open('GET', path, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    ac.decodeAudioData(request.response, cb, onBufferLoadError);
  };

  request.send();

  function onBufferLoadError(err) {
    console.error(err);
  }

}
},{}],7:[function(require,module,exports){
/*
    Copyright (c) 2012 DinahMoe AB & Oskar Eriksson

    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
    modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
    OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
(function(window) {
    var userContext,
        userInstance,
        pipe = function(param, val) {
            param.value = val;
        },
        Super = Object.create(null, {
            activate: {
                writable: true,
                value: function(doActivate) {
                    if (doActivate) {
                        this.input.disconnect();
                        this.input.connect(this.activateNode);
                        if (this.activateCallback) {
                            this.activateCallback(doActivate);
                        }
                    } else {
                        this.input.disconnect();
                        this.input.connect(this.output);
                    }
                }
            },
            bypass: {
                get: function() {
                    return this._bypass;
                },
                set: function(value) {
                    if (this._lastBypassValue === value) {
                        return;
                    }
                    this._bypass = value;
                    this.activate(!value);
                    this._lastBypassValue = value;
                }
            },
            connect: {
                value: function(target) {
                    this.output.connect(target);
                }
            },
            disconnect: {
                value: function(target) {
                    this.output.disconnect(target);
                }
            },
            connectInOrder: {
                value: function(nodeArray) {
                    var i = nodeArray.length - 1;
                    while (i--) {
                        if (!nodeArray[i].connect) {
                            return console.error("AudioNode.connectInOrder: TypeError: Not an AudioNode.", nodeArray[i]);
                        }
                        if (nodeArray[i + 1].input) {
                            nodeArray[i].connect(nodeArray[i + 1].input);
                        } else {
                            nodeArray[i].connect(nodeArray[i + 1]);
                        }
                    }
                }
            },
            getDefaults: {
                value: function() {
                    var result = {};
                    for (var key in this.defaults) {
                        result[key] = this.defaults[key].value;
                    }
                    return result;
                }
            },
            automate: {
                value: function(property, value, duration, startTime) {
                    var start = startTime ? ~~(startTime / 1000) : userContext.currentTime,
                        dur = duration ? ~~(duration / 1000) : 0,
                        _is = this.defaults[property],
                        param = this[property],
                        method;

                    if (param) {
                        if (_is.automatable) {
                            if (!duration) {
                                method = "setValueAtTime";
                            } else {
                                method = "linearRampToValueAtTime";
                                param.cancelScheduledValues(start);
                                param.setValueAtTime(param.value, start);
                            }
                            param[method](value, dur + start);
                        } else {
                            param = value;
                        }
                    } else {
                        console.error("Invalid Property for " + this.name);
                    }
                }
            }
        }),
        FLOAT = "float",
        BOOLEAN = "boolean",
        STRING = "string",
        INT = "int";

    if (typeof module !== "undefined" && module.exports) {
        module.exports = Tuna;
    } else if (typeof define === "function") {
        window.define("Tuna", definition);
    } else {
        window.Tuna = Tuna;
    }

    function definition() {
        return Tuna;
    }

    function Tuna(context) {
        if (!(this instanceof Tuna)) {
            return new Tuna(context);
        }
        if (!window.AudioContext) {
            window.AudioContext = window.webkitAudioContext;
        }
        if (!context) {
            console.log("tuna.js: Missing audio context! Creating a new context for you.");
            context = window.AudioContext && (new window.AudioContext());
        }
        if (!context) {
            throw new Error("Tuna cannot initialize because this environment does not support web audio.");
        }
        connectify(context);
        userContext = context;
        userInstance = this;
    }

    function connectify(context) {
        if (context.__connectified__ === true) return;

        var gain = context.createGain(),
            proto = Object.getPrototypeOf(Object.getPrototypeOf(gain)),
            oconnect = proto.connect;

        proto.connect = shimConnect;
        context.__connectified__ = true; // Prevent overriding connect more than once

        function shimConnect() {
            var node = Array.prototype.shift.apply(arguments);
            node = Super.isPrototypeOf ? (Super.isPrototypeOf(node) ? node.input : node) : (node.input || node);
            arguments = Array.prototype.slice.call(arguments);
            arguments.unshift(node);
            oconnect.apply(this, arguments);
            return node;
        }
    }

    function dbToWAVolume(db) {
        return Math.max(0, Math.round(100 * Math.pow(2, db / 6)) / 100);
    }

    function fmod(x, y) {
        // http://kevin.vanzonneveld.net
        // *     example 1: fmod(5.7, 1.3);
        // *     returns 1: 0.5
        var tmp, tmp2, p = 0,
            pY = 0,
            l = 0.0,
            l2 = 0.0;

        tmp = x.toExponential().match(/^.\.?(.*)e(.+)$/);
        p = parseInt(tmp[2], 10) - (tmp[1] + "").length;
        tmp = y.toExponential().match(/^.\.?(.*)e(.+)$/);
        pY = parseInt(tmp[2], 10) - (tmp[1] + "").length;

        if (pY > p) {
            p = pY;
        }

        tmp2 = (x % y);

        if (p < -100 || p > 20) {
            // toFixed will give an out of bound error so we fix it like this:
            l = Math.round(Math.log(tmp2) / Math.log(10));
            l2 = Math.pow(10, l);

            return (tmp2 / l2).toFixed(l - p) * l2;
        } else {
            return parseFloat(tmp2.toFixed(-p));
        }
    }

    function sign(x) {
        if (x === 0) {
            return 1;
        } else {
            return Math.abs(x) / x;
        }
    }

    function tanh(n) {
        return (Math.exp(n) - Math.exp(-n)) / (Math.exp(n) + Math.exp(-n));
    }

    function initValue(userVal, defaultVal) {
        return userVal === undefined ? defaultVal : userVal;
    }

    Tuna.prototype.Bitcrusher = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.bufferSize = properties.bufferSize || this.defaults.bufferSize.value;

        this.input = userContext.createGain();
        this.activateNode = userContext.createGain();
        this.processor = userContext.createScriptProcessor(this.bufferSize, 1, 1);
        this.output = userContext.createGain();

        this.activateNode.connect(this.processor);
        this.processor.connect(this.output);

        var phaser = 0,
            last = 0,
            input, output, step, i, length;
        this.processor.onaudioprocess = function(e) {
            input = e.inputBuffer.getChannelData(0),
            output = e.outputBuffer.getChannelData(0),
            step = Math.pow(1 / 2, this.bits);
            length = input.length;
            for (i = 0; i < length; i++) {
                phaser += this.normfreq;
                if (phaser >= 1.0) {
                    phaser -= 1.0;
                    last = step * Math.floor(input[i] / step + 0.5);
                }
                output[i] = last;
            }
        };

        this.bits = properties.bits || this.defaults.bits.value;
        this.normfreq = initValue(properties.normfreq, this.defaults.normfreq.value);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Bitcrusher.prototype = Object.create(Super, {
        name: {
            value: "Bitcrusher"
        },
        defaults: {
            writable: true,
            value: {
                bits: {
                    value: 4,
                    min: 1,
                    max: 16,
                    automatable: false,
                    type: INT
                },
                bufferSize: {
                    value: 4096,
                    min: 256,
                    max: 16384,
                    automatable: false,
                    type: INT
                },
                bypass: {
                    value: true,
                    automatable: false,
                    type: BOOLEAN
                },
                normfreq: {
                    value: 0.1,
                    min: 0.0001,
                    max: 1.0,
                    automatable: false,
                    type: FLOAT
                }
            }
        },
        bits: {
            enumerable: true,
            get: function() {
                return this.processor.bits;
            },
            set: function(value) {
                this.processor.bits = value;
            }
        },
        normfreq: {
            enumerable: true,
            get: function() {
                return this.processor.normfreq;
            },
            set: function(value) {
                this.processor.normfreq = value;
            }
        }
    });

    Tuna.prototype.Cabinet = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.activateNode = userContext.createGain();
        this.convolver = this.newConvolver(properties.impulsePath ||
            "../impulses/impulse_guitar.wav");
        this.makeupNode = userContext.createGain();
        this.output = userContext.createGain();

        this.activateNode.connect(this.convolver.input);
        this.convolver.output.connect(this.makeupNode);
        this.makeupNode.connect(this.output);

        this.makeupGain = initValue(properties.makeupGain, this.defaults
            .makeupGain);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Cabinet.prototype = Object.create(Super, {
        name: {
            value: "Cabinet"
        },
        defaults: {
            writable: true,
            value: {
                makeupGain: {
                    value: 1,
                    min: 0,
                    max: 20,
                    automatable: true,
                    type: FLOAT
                },
                bypass: {
                    value: false,
                    automatable: false,
                    type: BOOLEAN
                }
            }
        },
        makeupGain: {
            enumerable: true,
            get: function() {
                return this.makeupNode.gain;
            },
            set: function(value) {
                this.makeupNode.gain.value = value;
            }
        },
        newConvolver: {
            value: function(impulsePath) {
                return new userInstance.Convolver({
                    impulse: impulsePath,
                    dryLevel: 0,
                    wetLevel: 1
                });
            }
        }
    });

    Tuna.prototype.Chorus = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.attenuator = this.activateNode = userContext.createGain();
        this.splitter = userContext.createChannelSplitter(2);
        this.delayL = userContext.createDelay();
        this.delayR = userContext.createDelay();
        this.feedbackGainNodeLR = userContext.createGain();
        this.feedbackGainNodeRL = userContext.createGain();
        this.merger = userContext.createChannelMerger(2);
        this.output = userContext.createGain();

        this.lfoL = new userInstance.LFO({
            target: this.delayL.delayTime,
            callback: pipe
        });
        this.lfoR = new userInstance.LFO({
            target: this.delayR.delayTime,
            callback: pipe
        });

        this.input.connect(this.attenuator);
        this.attenuator.connect(this.output);
        this.attenuator.connect(this.splitter);
        this.splitter.connect(this.delayL, 0);
        this.splitter.connect(this.delayR, 1);
        this.delayL.connect(this.feedbackGainNodeLR);
        this.delayR.connect(this.feedbackGainNodeRL);
        this.feedbackGainNodeLR.connect(this.delayR);
        this.feedbackGainNodeRL.connect(this.delayL);
        this.delayL.connect(this.merger, 0, 0);
        this.delayR.connect(this.merger, 0, 1);
        this.merger.connect(this.output);

        this.feedback = initValue(properties.feedback, this.defaults.feedback
            .value);
        this.rate = initValue(properties.rate, this.defaults.rate.value);
        this.delay = initValue(properties.delay, this.defaults.delay.value);
        this.depth = initValue(properties.depth, this.defaults.depth.value);
        this.lfoR.phase = Math.PI / 2;
        this.attenuator.gain.value = 0.6934; // 1 / (10 ^ (((20 * log10(3)) / 3) / 20))
        this.lfoL.activate(true);
        this.lfoR.activate(true);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Chorus.prototype = Object.create(Super, {
        name: {
            value: "Chorus"
        },
        defaults: {
            writable: true,
            value: {
                feedback: {
                    value: 0.4,
                    min: 0,
                    max: 0.95,
                    automatable: false,
                    type: FLOAT
                },
                delay: {
                    value: 0.0045,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                depth: {
                    value: 0.7,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                rate: {
                    value: 1.5,
                    min: 0,
                    max: 8,
                    automatable: false,
                    type: FLOAT
                },
                bypass: {
                    value: true,
                    automatable: false,
                    type: BOOLEAN
                }
            }
        },
        delay: {
            enumerable: true,
            get: function() {
                return this._delay;
            },
            set: function(value) {
                this._delay = 0.0002 * (Math.pow(10, value) * 2);
                this.lfoL.offset = this._delay;
                this.lfoR.offset = this._delay;
                this._depth = this._depth;
            }
        },
        depth: {
            enumerable: true,
            get: function() {
                return this._depth;
            },
            set: function(value) {
                this._depth = value;
                this.lfoL.oscillation = this._depth * this._delay;
                this.lfoR.oscillation = this._depth * this._delay;
            }
        },
        feedback: {
            enumerable: true,
            get: function() {
                return this._feedback;
            },
            set: function(value) {
                this._feedback = value;
                this.feedbackGainNodeLR.gain.value = this._feedback;
                this.feedbackGainNodeRL.gain.value = this._feedback;
            }
        },
        rate: {
            enumerable: true,
            get: function() {
                return this._rate;
            },
            set: function(value) {
                this._rate = value;
                this.lfoL.frequency = this._rate;
                this.lfoR.frequency = this._rate;
            }
        }
    });

    Tuna.prototype.Compressor = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.compNode = this.activateNode = userContext.createDynamicsCompressor();
        this.makeupNode = userContext.createGain();
        this.output = userContext.createGain();

        this.compNode.connect(this.makeupNode);
        this.makeupNode.connect(this.output);

        this.automakeup = initValue(properties.automakeup, this.defaults
            .automakeup
            .value);
        this.makeupGain = properties.makeupGain || this.defaults.makeupGain
            .value;
        this.threshold = initValue(properties.threshold, this.defaults.threshold
            .value);
        this.release = properties.release || this.defaults.release.value;
        this.attack = initValue(properties.attack, this.defaults.attack
            .value);
        this.ratio = properties.ratio || this.defaults.ratio.value;
        this.knee = initValue(properties.knee, this.defaults.knee.value);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Compressor.prototype = Object.create(Super, {
        name: {
            value: "Compressor"
        },
        defaults: {
            writable: true,
            value: {
                threshold: {
                    value: -20,
                    min: -60,
                    max: 0,
                    automatable: true,
                    type: FLOAT
                },
                release: {
                    value: 250,
                    min: 10,
                    max: 2000,
                    automatable: true,
                    type: FLOAT
                },
                makeupGain: {
                    value: 1,
                    min: 1,
                    max: 100,
                    automatable: true,
                    type: FLOAT
                },
                attack: {
                    value: 1,
                    min: 0,
                    max: 1000,
                    automatable: true,
                    type: FLOAT
                },
                ratio: {
                    value: 4,
                    min: 1,
                    max: 50,
                    automatable: true,
                    type: FLOAT
                },
                knee: {
                    value: 5,
                    min: 0,
                    max: 40,
                    automatable: true,
                    type: FLOAT
                },
                automakeup: {
                    value: false,
                    automatable: false,
                    type: BOOLEAN
                },
                bypass: {
                    value: true,
                    automatable: false,
                    type: BOOLEAN
                }
            }
        },
        computeMakeup: {
            value: function() {
                var magicCoefficient = 4,
                    // raise me if the output is too hot
                    c = this.compNode;
                return -(c.threshold.value - c.threshold.value /
                        c.ratio.value) /
                    magicCoefficient;
            }
        },
        automakeup: {
            enumerable: true,
            get: function() {
                return this._automakeup;
            },
            set: function(value) {
                this._automakeup = value;
                if (this._automakeup) this.makeupGain = this.computeMakeup();
            }
        },
        threshold: {
            enumerable: true,
            get: function() {
                return this.compNode.threshold;
            },
            set: function(value) {
                this.compNode.threshold.value = value;
                if (this._automakeup) this.makeupGain = this.computeMakeup();
            }
        },
        ratio: {
            enumerable: true,
            get: function() {
                return this.compNode.ratio;
            },
            set: function(value) {
                this.compNode.ratio.value = value;
                if (this._automakeup) this.makeupGain = this.computeMakeup();
            }
        },
        knee: {
            enumerable: true,
            get: function() {
                return this.compNode.knee;
            },
            set: function(value) {
                this.compNode.knee.value = value;
                if (this._automakeup) this.makeupGain = this.computeMakeup();
            }
        },
        attack: {
            enumerable: true,
            get: function() {
                return this.compNode.attack;
            },
            set: function(value) {
                this.compNode.attack.value = value / 1000;
            }
        },
        release: {
            enumerable: true,
            get: function() {
                return this.compNode.release;
            },
            set: function(value) {
                this.compNode.release = value / 1000;
            }
        },
        makeupGain: {
            enumerable: true,
            get: function() {
                return this.makeupNode.gain;
            },
            set: function(value) {
                this.makeupNode.gain.value = dbToWAVolume(value);
            }
        }
    });

    Tuna.prototype.Convolver = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.activateNode = userContext.createGain();
        this.convolver = userContext.createConvolver();
        this.dry = userContext.createGain();
        this.filterLow = userContext.createBiquadFilter();
        this.filterHigh = userContext.createBiquadFilter();
        this.wet = userContext.createGain();
        this.output = userContext.createGain();

        this.activateNode.connect(this.filterLow);
        this.activateNode.connect(this.dry);
        this.filterLow.connect(this.filterHigh);
        this.filterHigh.connect(this.convolver);
        this.convolver.connect(this.wet);
        this.wet.connect(this.output);
        this.dry.connect(this.output);

        this.dryLevel = initValue(properties.dryLevel, this.defaults.dryLevel
            .value);
        this.wetLevel = initValue(properties.wetLevel, this.defaults.wetLevel
            .value);
        this.highCut = properties.highCut || this.defaults.highCut.value;
        this.buffer = properties.impulse ||
            "../impulses/ir_rev_short.wav";
        this.lowCut = properties.lowCut || this.defaults.lowCut.value;
        this.level = initValue(properties.level, this.defaults.level.value);
        this.filterHigh.type = "lowpass";
        this.filterLow.type = "highpass";
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Convolver.prototype = Object.create(Super, {
        name: {
            value: "Convolver"
        },
        defaults: {
            writable: true,
            value: {
                highCut: {
                    value: 22050,
                    min: 20,
                    max: 22050,
                    automatable: true,
                    type: FLOAT
                },
                lowCut: {
                    value: 20,
                    min: 20,
                    max: 22050,
                    automatable: true,
                    type: FLOAT
                },
                dryLevel: {
                    value: 1,
                    min: 0,
                    max: 1,
                    automatable: true,
                    type: FLOAT
                },
                wetLevel: {
                    value: 1,
                    min: 0,
                    max: 1,
                    automatable: true,
                    type: FLOAT
                },
                level: {
                    value: 1,
                    min: 0,
                    max: 1,
                    automatable: true,
                    type: FLOAT
                }
            }
        },
        lowCut: {
            get: function() {
                return this.filterLow.frequency;
            },
            set: function(value) {
                this.filterLow.frequency.value = value;
            }
        },
        highCut: {
            get: function() {
                return this.filterHigh.frequency;
            },
            set: function(value) {
                this.filterHigh.frequency.value = value;
            }
        },
        level: {
            get: function() {
                return this.output.gain;
            },
            set: function(value) {
                this.output.gain.value = value;
            }
        },
        dryLevel: {
            get: function() {
                return this.dry.gain
            },
            set: function(value) {
                this.dry.gain.value = value;
            }
        },
        wetLevel: {
            get: function() {
                return this.wet.gain;
            },
            set: function(value) {
                this.wet.gain.value = value;
            }
        },
        buffer: {
            enumerable: false,
            get: function() {
                return this.convolver.buffer;
            },
            set: function(impulse) {
                var convolver = this.convolver,
                    xhr = new XMLHttpRequest();
                if (!impulse) {
                    console.log("Tuna.Convolver.setBuffer: Missing impulse path!");
                    return;
                }
                xhr.open("GET", impulse, true);
                xhr.responseType = "arraybuffer";
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status < 300 && xhr.status > 199 || xhr.status === 302) {
                            userContext.decodeAudioData(xhr.response, function(buffer) {
                                convolver.buffer = buffer;
                            }, function(e) {
                                if (e) console.log("Tuna.Convolver.setBuffer: Error decoding data" + e);
                            });
                        }
                    }
                };
                xhr.send(null);
            }
        }
    });

    Tuna.prototype.Delay = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.activateNode = userContext.createGain();
        this.dry = userContext.createGain();
        this.wet = userContext.createGain();
        this.filter = userContext.createBiquadFilter();
        this.delay = userContext.createDelay();
        this.feedbackNode = userContext.createGain();
        this.output = userContext.createGain();

        this.activateNode.connect(this.delay);
        this.activateNode.connect(this.dry);
        this.delay.connect(this.filter);
        this.filter.connect(this.feedbackNode);
        this.feedbackNode.connect(this.delay);
        this.feedbackNode.connect(this.wet);
        this.wet.connect(this.output);
        this.dry.connect(this.output);

        this.delayTime = properties.delayTime || this.defaults.delayTime.value;
        this.feedback = initValue(properties.feedback, this.defaults.feedback.value);
        this.wetLevel = initValue(properties.wetLevel, this.defaults.wetLevel.value);
        this.dryLevel = initValue(properties.dryLevel, this.defaults.dryLevel.value);
        this.cutoff = properties.cutoff || this.defaults.cutoff.value;
        this.filter.type = "lowpass";
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Delay.prototype = Object.create(Super, {
        name: {
            value: "Delay"
        },
        defaults: {
            writable: true,
            value: {
                delayTime: {
                    value: 100,
                    min: 20,
                    max: 1000,
                    automatable: false,
                    type: FLOAT
                },
                feedback: {
                    value: 0.45,
                    min: 0,
                    max: 0.9,
                    automatable: true,
                    type: FLOAT
                },
                cutoff: {
                    value: 20000,
                    min: 20,
                    max: 20000,
                    automatable: true,
                    type: FLOAT
                },
                wetLevel: {
                    value: 0.5,
                    min: 0,
                    max: 1,
                    automatable: true,
                    type: FLOAT
                },
                dryLevel: {
                    value: 1,
                    min: 0,
                    max: 1,
                    automatable: true,
                    type: FLOAT
                }
            }
        },
        delayTime: {
            enumerable: true,
            get: function() {
                return this.delay.delayTime;
            },
            set: function(value) {
                this.delay.delayTime.value = value / 1000;
            }
        },
        wetLevel: {
            enumerable: true,
            get: function() {
                return this.wet.gain;
            },
            set: function(value) {
                this.wet.gain.value = value;
            }
        },
        dryLevel: {
            enumerable: true,
            get: function() {
                return this.dry.gain;
            },
            set: function(value) {
                this.dry.gain.value = value;
            }
        },
        feedback: {
            enumerable: true,
            get: function() {
                return this.feedbackNode.gain;
            },
            set: function(value) {
                this.feedbackNode.gain.value = value;
            }
        },
        cutoff: {
            enumerable: true,
            get: function() {
                return this.filter.frequency;
            },
            set: function(value) {
                this.filter.frequency.value = value;
            }
        }
    });

    Tuna.prototype.Filter = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.activateNode = userContext.createGain();
        this.filter = userContext.createBiquadFilter();
        this.output = userContext.createGain();

        this.activateNode.connect(this.filter);
        this.filter.connect(this.output);

        this.frequency = properties.frequency || this.defaults.frequency
            .value;
        this.Q = properties.resonance || this.defaults.Q.value;
        this.filterType = initValue(properties.filterType, this.defaults
            .filterType
            .value);
        this.gain = initValue(properties.gain, this.defaults.gain.value);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Filter.prototype = Object.create(Super, {
        name: {
            value: "Filter"
        },
        defaults: {
            writable: true,
            value: {
                frequency: {
                    value: 800,
                    min: 20,
                    max: 22050,
                    automatable: true,
                    type: FLOAT
                },
                Q: {
                    value: 1,
                    min: 0.001,
                    max: 100,
                    automatable: true,
                    type: FLOAT
                },
                gain: {
                    value: 0,
                    min: -40,
                    max: 40,
                    automatable: true,
                    type: FLOAT
                },
                bypass: {
                    value: true,
                    automatable: false,
                    type: BOOLEAN
                },
                filterType: {
                    value: "lowpass",
                    automatable: false,
                    type: STRING
                }
            }
        },
        filterType: {
            enumerable: true,
            get: function() {
                return this.filter.type;
            },
            set: function(value) {
                this.filter.type = value;
            }
        },
        Q: {
            enumerable: true,
            get: function() {
                return this.filter.Q;
            },
            set: function(value) {
                this.filter.Q.value = value;
            }
        },
        gain: {
            enumerable: true,
            get: function() {
                return this.filter.gain;
            },
            set: function(value) {
                this.filter.gain.value = value;
            }
        },
        frequency: {
            enumerable: true,
            get: function() {
                return this.filter.frequency;
            },
            set: function(value) {
                this.filter.frequency.value = value;
            }
        }
    });

    Tuna.prototype.MoogFilter = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.bufferSize = properties.bufferSize || this.defaults.bufferSize
            .value;

        this.input = userContext.createGain();
        this.activateNode = userContext.createGain();
        this.processor = userContext.createScriptProcessor(this.bufferSize,
            1,
            1);
        this.output = userContext.createGain();

        this.activateNode.connect(this.processor);
        this.processor.connect(this.output);

        var in1, in2, in3, in4, out1, out2, out3, out4;
        in1 = in2 = in3 = in4 = out1 = out2 = out3 = out4 = 0.0;
        var input, output, f, fb, i, length;
        this.processor.onaudioprocess = function(e) {
            input = e.inputBuffer.getChannelData(0),
                output = e.outputBuffer.getChannelData(0),
                f = this.cutoff * 1.16,
                inputFactor = 0.35013 * (f * f) * (f * f);
            fb = this.resonance * (1.0 - 0.15 * f * f);
            length = input.length;
            for (i = 0; i < length; i++) {
                input[i] -= out4 * fb;
                input[i] *= inputFactor;
                out1 = input[i] + 0.3 * in1 + (1 - f) * out1; // Pole 1
                in1 = input[i];
                out2 = out1 + 0.3 * in2 + (1 - f) * out2; // Pole 2
                in2 = out1;
                out3 = out2 + 0.3 * in3 + (1 - f) * out3; // Pole 3
                in3 = out2;
                out4 = out3 + 0.3 * in4 + (1 - f) * out4; // Pole 4
                in4 = out3;
                output[i] = out4;
            }
        };

        this.cutoff = initValue(properties.cutoff, this.defaults.cutoff
            .value);
        this.resonance = initValue(properties.resonance, this.defaults.resonance
            .value);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.MoogFilter.prototype = Object.create(Super, {
        name: {
            value: "MoogFilter"
        },
        defaults: {
            writable: true,
            value: {
                bufferSize: {
                    value: 4096,
                    min: 256,
                    max: 16384,
                    automatable: false,
                    type: INT
                },
                bypass: {
                    value: false,
                    automatable: false,
                    type: BOOLEAN
                },
                cutoff: {
                    value: 0.065,
                    min: 0.0001,
                    max: 1.0,
                    automatable: false,
                    type: FLOAT
                },
                resonance: {
                    value: 3.5,
                    min: 0.0,
                    max: 4.0,
                    automatable: false,
                    type: FLOAT
                }
            }
        },
        cutoff: {
            enumerable: true,
            get: function() {
                return this.processor.cutoff;
            },
            set: function(value) {
                this.processor.cutoff = value;
            }
        },
        resonance: {
            enumerable: true,
            get: function() {
                return this.processor.resonance;
            },
            set: function(value) {
                this.processor.resonance = value;
            }
        }
    });

    Tuna.prototype.Overdrive = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.activateNode = userContext.createGain();
        this.inputDrive = userContext.createGain();
        this.waveshaper = userContext.createWaveShaper();
        this.outputDrive = userContext.createGain();
        this.output = userContext.createGain();

        this.activateNode.connect(this.inputDrive);
        this.inputDrive.connect(this.waveshaper);
        this.waveshaper.connect(this.outputDrive);
        this.outputDrive.connect(this.output);

        this.ws_table = new Float32Array(this.k_nSamples);
        this.drive = initValue(properties.drive, this.defaults.drive.value);
        this.outputGain = initValue(properties.outputGain, this.defaults
            .outputGain
            .value);
        this.curveAmount = initValue(properties.curveAmount, this.defaults
            .curveAmount
            .value);
        this.algorithmIndex = initValue(properties.algorithmIndex, this
            .defaults
            .algorithmIndex.value);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Overdrive.prototype = Object.create(Super, {
        name: {
            value: "Overdrive"
        },
        defaults: {
            writable: true,
            value: {
                drive: {
                    value: 1,
                    min: 0,
                    max: 1,
                    automatable: true,
                    type: FLOAT,
                    scaled: true
                },
                outputGain: {
                    value: 1,
                    min: 0,
                    max: 1,
                    automatable: true,
                    type: FLOAT,
                    scaled: true
                },
                curveAmount: {
                    value: 0.725,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                algorithmIndex: {
                    value: 0,
                    min: 0,
                    max: 5,
                    automatable: false,
                    type: INT
                }
            }
        },
        k_nSamples: {
            value: 8192
        },
        drive: {
            get: function() {
                return this.inputDrive.gain;
            },
            set: function(value) {
                this._drive = value;
            }
        },
        curveAmount: {
            get: function() {
                return this._curveAmount;
            },
            set: function(value) {
                this._curveAmount = value;
                if (this._algorithmIndex === undefined) {
                    this._algorithmIndex = 0;
                }
                this.waveshaperAlgorithms[this._algorithmIndex]
                    (this._curveAmount,
                        this.k_nSamples, this.ws_table);
                this.waveshaper.curve = this.ws_table;
            }
        },
        outputGain: {
            get: function() {
                return this.outputDrive.gain;
            },
            set: function(value) {
                this._outputGain = dbToWAVolume(value);
            }
        },
        algorithmIndex: {
            get: function() {
                return this._algorithmIndex;
            },
            set: function(value) {
                this._algorithmIndex = value;
                this.curveAmount = this._curveAmount;
            }
        },
        waveshaperAlgorithms: {
            value: [
                function(amount, n_samples, ws_table) {
                    amount = Math.min(amount, 0.9999);
                    var k = 2 * amount / (1 - amount),
                        i, x;
                    for (i = 0; i < n_samples; i++) {
                        x = i * 2 / n_samples - 1;
                        ws_table[i] = (1 + k) * x / (1 + k * Math.abs(x));
                    }
                },
                function(amount, n_samples, ws_table) {
                    var i, x, y;
                    for (i = 0; i < n_samples; i++) {
                        x = i * 2 / n_samples - 1;
                        y = ((0.5 * Math.pow((x + 1.4), 2)) - 1) * y >= 0 ? 5.8 : 1.2;
                        ws_table[i] = tanh(y);
                    }
                },
                function(amount, n_samples, ws_table) {
                    var i, x, y, a = 1 - amount;
                    for (i = 0; i < n_samples; i++) {
                        x = i * 2 / n_samples - 1;
                        y = x < 0 ? -Math.pow(Math.abs(x), a + 0.04) : Math.pow(x, a);
                        ws_table[i] = tanh(y * 2);
                    }
                },
                function(amount, n_samples, ws_table) {
                    var i, x, y, abx, a = 1 - amount > 0.99 ? 0.99 : 1 - amount;
                    for (i = 0; i < n_samples; i++) {
                        x = i * 2 / n_samples - 1;
                        abx = Math.abs(x);
                        if (abx < a) y = abx;
                        else if (abx > a) y = a + (abx - a) / (1 + Math.pow((abx - a) / (1 - a), 2));
                        else if (abx > 1) y = abx;
                        ws_table[i] = sign(x) * y * (1 / ((a + 1) / 2));
                    }
                },
                function(amount, n_samples, ws_table) { // fixed curve, amount doesn't do anything, the distortion is just from the drive
                    var i, x;
                    for (i = 0; i < n_samples; i++) {
                        x = i * 2 / n_samples - 1;
                        if (x < -0.08905) {
                            ws_table[i] = (-3 / 4) * (1 - (Math.pow((1 - (Math.abs(x) - 0.032857)), 12)) + (1 / 3) * (Math.abs(x) -
                                0.032847)) + 0.01;
                        } else if (x >= -0.08905 && x < 0.320018) {
                            ws_table[i] = (-6.153 * (x * x)) + 3.9375 * x;
                        } else {
                            ws_table[i] = 0.630035;
                        }
                    }
                },
                function(amount, n_samples, ws_table) {
                    var a = 2 + Math.round(amount * 14),
                        // we go from 2 to 16 bits, keep in mind for the UI
                        bits = Math.round(Math.pow(2, a - 1)),
                        // real number of quantization steps divided by 2
                        i, x;
                    for (i = 0; i < n_samples; i++) {
                        x = i * 2 / n_samples - 1;
                        ws_table[i] = Math.round(x * bits) / bits;
                    }
                }
            ]
        }
    });

    Tuna.prototype.Phaser = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.splitter = this.activateNode = userContext.createChannelSplitter(2);
        this.filtersL = [];
        this.filtersR = [];
        this.feedbackGainNodeL = userContext.createGain();
        this.feedbackGainNodeR = userContext.createGain();
        this.merger = userContext.createChannelMerger(2);
        this.filteredSignal = userContext.createGain();
        this.output = userContext.createGain();
        this.lfoL = new userInstance.LFO({
            target: this.filtersL,
            callback: this.callback
        });
        this.lfoR = new userInstance.LFO({
            target: this.filtersR,
            callback: this.callback
        });

        var i = this.stage;
        while (i--) {
            this.filtersL[i] = userContext.createBiquadFilter();
            this.filtersR[i] = userContext.createBiquadFilter();
            this.filtersL[i].type = "allpass";
            this.filtersR[i].type = "allpass";
        }
        this.input.connect(this.splitter);
        this.input.connect(this.output);
        this.splitter.connect(this.filtersL[0], 0, 0);
        this.splitter.connect(this.filtersR[0], 1, 0);
        this.connectInOrder(this.filtersL);
        this.connectInOrder(this.filtersR);
        this.filtersL[this.stage - 1].connect(this.feedbackGainNodeL);
        this.filtersL[this.stage - 1].connect(this.merger, 0, 0);
        this.filtersR[this.stage - 1].connect(this.feedbackGainNodeR);
        this.filtersR[this.stage - 1].connect(this.merger, 0, 1);
        this.feedbackGainNodeL.connect(this.filtersL[0]);
        this.feedbackGainNodeR.connect(this.filtersR[0]);
        this.merger.connect(this.output);

        this.rate = initValue(properties.rate, this.defaults.rate.value);
        this.baseModulationFrequency = properties.baseModulationFrequency || this.defaults.baseModulationFrequency.value;
        this.depth = initValue(properties.depth, this.defaults.depth.value);
        this.feedback = initValue(properties.feedback, this.defaults.feedback.value);
        this.stereoPhase = initValue(properties.stereoPhase, this.defaults.stereoPhase.value);

        this.lfoL.activate(true);
        this.lfoR.activate(true);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Phaser.prototype = Object.create(Super, {
        name: {
            value: "Phaser"
        },
        stage: {
            value: 4
        },
        defaults: {
            writable: true,
            value: {
                rate: {
                    value: 0.1,
                    min: 0,
                    max: 8,
                    automatable: false,
                    type: FLOAT
                },
                depth: {
                    value: 0.6,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                feedback: {
                    value: 0.7,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                stereoPhase: {
                    value: 40,
                    min: 0,
                    max: 180,
                    automatable: false,
                    type: FLOAT
                },
                baseModulationFrequency: {
                    value: 700,
                    min: 500,
                    max: 1500,
                    automatable: false,
                    type: FLOAT
                }
            }
        },
        callback: {
            value: function(filters, value) {
                for (var stage = 0; stage < 4; stage++) {
                    filters[stage].frequency.value = value;
                }
            }
        },
        depth: {
            get: function() {
                return this._depth;
            },
            set: function(value) {
                this._depth = value;
                this.lfoL.oscillation = this._baseModulationFrequency * this._depth;
                this.lfoR.oscillation = this._baseModulationFrequency * this._depth;
            }
        },
        rate: {
            get: function() {
                return this._rate;
            },
            set: function(value) {
                this._rate = value;
                this.lfoL.frequency = this._rate;
                this.lfoR.frequency = this._rate;
            }
        },
        baseModulationFrequency: {
            enumerable: true,
            get: function() {
                return this._baseModulationFrequency;
            },
            set: function(value) {
                this._baseModulationFrequency = value;
                this.lfoL.offset = this._baseModulationFrequency;
                this.lfoR.offset = this._baseModulationFrequency;
                this._depth = this._depth;
            }
        },
        feedback: {
            get: function() {
                return this._feedback;
            },
            set: function(value) {
                this._feedback = value;
                this.feedbackGainNodeL.gain.value = this._feedback;
                this.feedbackGainNodeR.gain.value = this._feedback;
            }
        },
        stereoPhase: {
            get: function() {
                return this._stereoPhase;
            },
            set: function(value) {
                this._stereoPhase = value;
                var newPhase = this.lfoL._phase + this._stereoPhase *
                    Math.PI /
                    180;
                newPhase = fmod(newPhase, 2 * Math.PI);
                this.lfoR._phase = newPhase;
            }
        }
    });

    Tuna.prototype.PingPongDelay = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.wetLevel = userContext.createGain();
        this.stereoToMonoMix = userContext.createGain();
        this.feedbackLevel = userContext.createGain();
        this.output = userContext.createGain();
        this.delayLeft = userContext.createDelay();
        this.delayRight = userContext.createDelay();

        this.activateNode = userContext.createGain();
        this.splitter = userContext.createChannelSplitter(2);
        this.merger = userContext.createChannelMerger(2);

        this.activateNode.connect(this.splitter);
        this.splitter.connect(this.stereoToMonoMix, 0, 0);
        this.splitter.connect(this.stereoToMonoMix, 1, 0);
        this.stereoToMonoMix.gain.value = .5;
        this.stereoToMonoMix.connect(this.wetLevel);
        this.wetLevel.connect(this.delayLeft);
        this.feedbackLevel.connect(this.delayLeft);
        this.delayLeft.connect(this.delayRight);
        this.delayRight.connect(this.feedbackLevel);
        this.delayLeft.connect(this.merger, 0, 0);
        this.delayRight.connect(this.merger, 0, 1);
        this.merger.connect(this.output);
        this.activateNode.connect(this.output);

        this.delayTimeLeft = properties.delayTimeLeft !== undefined ? properties.delayTimeLeft : this.defaults.delayTimeLeft.value;
        this.delayTimeRight = properties.delayTimeRight !== undefined ? properties.delayTimeRight : this.defaults.delayTimeRight.value;
        this.feedbackLevel.gain.value = properties.feedback !== undefined ? properties.feedback : this.defaults.feedback.value;
        this.wetLevel.gain.value = properties.wetLevel !== undefined ? properties.wetLevel : this.defaults.wetLevel.value;
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.PingPongDelay.prototype = Object.create(Super, {
        name: {
            value: "PingPongDelay"
        },
        delayTimeLeft: {
            enumerable: true,
            get: function() {
                return this._delayTimeLeft;
            },
            set: function(value) {
                this._delayTimeLeft = value;
                this.delayLeft.delayTime.value = value / 1000;
            }
        },
        delayTimeRight: {
            enumerable: true,
            get: function() {
                return this._delayTimeRight;
            },
            set: function(value) {
                this._delayTimeRight = value;
                this.delayRight.delayTime.value = value / 1000;
            }
        },
        defaults: {
            writable: true,
            value: {
                delayTimeLeft: {
                    value: 200,
                    min: 1,
                    max: 10000,
                    automatable: false,
                    type: INT
                },
                delayTimeRight: {
                    value: 400,
                    min: 1,
                    max: 10000,
                    automatable: false,
                    type: INT
                },
                feedback: {
                    value: 0.3,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                wetLevel: {
                    value: 0.5,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                }
            }
        }
    });

    Tuna.prototype.Tremolo = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.splitter = this.activateNode = userContext.createChannelSplitter(
                2),
            this.amplitudeL = userContext.createGain(), this.amplitudeR =
            userContext.createGain(), this.merger = userContext.createChannelMerger(
                2), this.output = userContext.createGain();
        this.lfoL = new userInstance.LFO({
            target: this.amplitudeL.gain,
            callback: pipe
        });
        this.lfoR = new userInstance.LFO({
            target: this.amplitudeR.gain,
            callback: pipe
        });

        this.input.connect(this.splitter);
        this.splitter.connect(this.amplitudeL, 0);
        this.splitter.connect(this.amplitudeR, 1);
        this.amplitudeL.connect(this.merger, 0, 0);
        this.amplitudeR.connect(this.merger, 0, 1);
        this.merger.connect(this.output);

        this.rate = properties.rate || this.defaults.rate.value;
        this.intensity = initValue(properties.intensity, this.defaults.intensity
            .value);
        this.stereoPhase = initValue(properties.stereoPhase, this.defaults
            .stereoPhase
            .value);

        this.lfoL.offset = 1 - (this.intensity / 2);
        this.lfoR.offset = 1 - (this.intensity / 2);
        this.lfoL.phase = this.stereoPhase * Math.PI / 180;

        this.lfoL.activate(true);
        this.lfoR.activate(true);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.Tremolo.prototype = Object.create(Super, {
        name: {
            value: "Tremolo"
        },
        defaults: {
            writable: true,
            value: {
                intensity: {
                    value: 0.3,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                stereoPhase: {
                    value: 0,
                    min: 0,
                    max: 180,
                    automatable: false,
                    type: FLOAT
                },
                rate: {
                    value: 5,
                    min: 0.1,
                    max: 11,
                    automatable: false,
                    type: FLOAT
                }
            }
        },
        intensity: {
            enumerable: true,
            get: function() {
                return this._intensity;
            },
            set: function(value) {
                this._intensity = value;
                this.lfoL.offset = 1 - this._intensity / 2;
                this.lfoR.offset = 1 - this._intensity / 2;
                this.lfoL.oscillation = this._intensity;
                this.lfoR.oscillation = this._intensity;
            }
        },
        rate: {
            enumerable: true,
            get: function() {
                return this._rate;
            },
            set: function(value) {
                this._rate = value;
                this.lfoL.frequency = this._rate;
                this.lfoR.frequency = this._rate;
            }
        },
        stereoPhase: {
            enumerable: true,
            get: function() {
                return this._rate;
            },
            set: function(value) {
                this._stereoPhase = value;
                var newPhase = this.lfoL._phase + this._stereoPhase *
                    Math.PI /
                    180;
                newPhase = fmod(newPhase, 2 * Math.PI);
                this.lfoR.phase = newPhase;
            }
        }
    });

    Tuna.prototype.WahWah = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.activateNode = userContext.createGain();
        this.envelopeFollower = new userInstance.EnvelopeFollower({
            target: this,
            callback: function(context, value) {
                context.sweep = value;
            }
        });
        this.filterBp = userContext.createBiquadFilter();
        this.filterPeaking = userContext.createBiquadFilter();
        this.output = userContext.createGain();

        //Connect AudioNodes
        this.activateNode.connect(this.filterBp);
        this.filterBp.connect(this.filterPeaking);
        this.filterPeaking.connect(this.output);

        //Set Properties
        this.init();
        this.automode = initValue(properties.enableAutoMode, this.defaults
            .automode
            .value);
        this.resonance = properties.resonance || this.defaults.resonance
            .value;
        this.sensitivity = initValue(properties.sensitivity, this.defaults
            .sensitivity
            .value);
        this.baseFrequency = initValue(properties.baseFrequency, this.defaults
            .baseFrequency
            .value);
        this.excursionOctaves = properties.excursionOctaves || this.defaults
            .excursionOctaves
            .value;
        this.sweep = initValue(properties.sweep, this.defaults.sweep.value);

        this.activateNode.gain.value = 2;
        this.envelopeFollower.activate(true);
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.WahWah.prototype = Object.create(Super, {
        name: {
            value: "WahWah"
        },
        defaults: {
            writable: true,
            value: {
                automode: {
                    value: true,
                    automatable: false,
                    type: BOOLEAN
                },
                baseFrequency: {
                    value: 0.5,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                excursionOctaves: {
                    value: 2,
                    min: 1,
                    max: 6,
                    automatable: false,
                    type: FLOAT
                },
                sweep: {
                    value: 0.2,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                resonance: {
                    value: 10,
                    min: 1,
                    max: 100,
                    automatable: false,
                    type: FLOAT
                },
                sensitivity: {
                    value: 0.5,
                    min: -1,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                }
            }
        },
        activateCallback: {
            value: function(value) {
                this.automode = value;
            }
        },
        automode: {
            get: function() {
                return this._automode;
            },
            set: function(value) {
                this._automode = value;
                if (value) {
                    this.activateNode.connect(this.envelopeFollower.input);
                    this.envelopeFollower.activate(true);
                } else {
                    this.envelopeFollower.activate(false);
                    this.activateNode.disconnect();
                    this.activateNode.connect(this.filterBp);
                }
            }
        },
        filterFreqTimeout: {
            value: 0
        },
        setFilterFreq: {
            value: function() {
                try {
                    this.filterBp.frequency.value = this._baseFrequency + this._excursionFrequency * this._sweep;
                    this.filterPeaking.frequency.value = this._baseFrequency + this._excursionFrequency * this._sweep;
                } catch (e) {
                    clearTimeout(this.filterFreqTimeout);
                    //put on the next cycle to let all init properties be set
                    this.filterFreqTimeout = setTimeout(function() {
                        this.setFilterFreq();
                    }.bind(this), 0);
                }
            }
        },
        sweep: {
            enumerable: true,
            get: function() {
                return this._sweep.value;
            },
            set: function(value) {
                this._sweep = Math.pow(value > 1 ? 1 : value <
                    0 ? 0 :
                    value,
                    this._sensitivity);
                this.setFilterFreq();
            }
        },
        baseFrequency: {
            enumerable: true,
            get: function() {
                return this._baseFrequency;
            },
            set: function(value) {
                this._baseFrequency = 50 * Math.pow(10, value *
                    2);
                this._excursionFrequency = Math.min(userContext
                    .sampleRate /
                    2,
                    this.baseFrequency * Math.pow(2, this._excursionOctaves)
                );
                this.setFilterFreq();
            }
        },
        excursionOctaves: {
            enumerable: true,
            get: function() {
                return this._excursionOctaves;
            },
            set: function(value) {
                this._excursionOctaves = value;
                this._excursionFrequency = Math.min(userContext
                    .sampleRate /
                    2,
                    this.baseFrequency * Math.pow(2, this._excursionOctaves)
                );
                this.setFilterFreq();
            }
        },
        sensitivity: {
            enumerable: true,
            get: function() {
                return this._sensitivity;
            },
            set: function(value) {
                this._sensitivity = Math.pow(10, value);
            }
        },
        resonance: {
            enumerable: true,
            get: function() {
                return this._resonance;
            },
            set: function(value) {
                this._resonance = value;
                this.filterPeaking.Q = this._resonance;
            }
        },
        init: {
            value: function() {
                this.output.gain.value = 1;
                this.filterPeaking.type = "peaking";
                this.filterBp.type = "bandpass";
                this.filterPeaking.frequency.value = 100;
                this.filterPeaking.gain.value = 20;
                this.filterPeaking.Q.value = 5;
                this.filterBp.frequency.value = 100;
                this.filterBp.Q.value = 1;
            }
        }
    });

    Tuna.prototype.EnvelopeFollower = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = userContext.createGain();
        this.jsNode = this.output = userContext.createScriptProcessor(
            this.buffersize,
            1, 1);

        this.input.connect(this.output);

        this.attackTime = initValue(properties.attackTime, this.defaults
            .attackTime
            .value);
        this.releaseTime = initValue(properties.releaseTime, this.defaults
            .releaseTime
            .value);
        this._envelope = 0;
        this.target = properties.target || {};
        this.callback = properties.callback || function() {};
    };
    Tuna.prototype.EnvelopeFollower.prototype = Object.create(Super, {
        name: {
            value: "EnvelopeFollower"
        },
        defaults: {
            value: {
                attackTime: {
                    value: 0.003,
                    min: 0,
                    max: 0.5,
                    automatable: false,
                    type: FLOAT
                },
                releaseTime: {
                    value: 0.5,
                    min: 0,
                    max: 0.5,
                    automatable: false,
                    type: FLOAT
                }
            }
        },
        buffersize: {
            value: 256
        },
        envelope: {
            value: 0
        },
        sampleRate: {
            value: 44100
        },
        attackTime: {
            enumerable: true,
            get: function() {
                return this._attackTime;
            },
            set: function(value) {
                this._attackTime = value;
                this._attackC = Math.exp(-1 / this._attackTime *
                    this.sampleRate /
                    this.buffersize);
            }
        },
        releaseTime: {
            enumerable: true,
            get: function() {
                return this._releaseTime;
            },
            set: function(value) {
                this._releaseTime = value;
                this._releaseC = Math.exp(-1 / this._releaseTime *
                    this.sampleRate /
                    this.buffersize);
            }
        },
        callback: {
            get: function() {
                return this._callback;
            },
            set: function(value) {
                if (typeof value === "function") {
                    this._callback = value;
                } else {
                    console.error("tuna.js: " + this.name +
                        ": Callback must be a function!");
                }
            }
        },
        target: {
            get: function() {
                return this._target;
            },
            set: function(value) {
                this._target = value;
            }
        },
        activate: {
            value: function(doActivate) {
                this.activated = doActivate;
                if (doActivate) {
                    this.jsNode.connect(userContext.destination);
                    this.jsNode.onaudioprocess = this.returnCompute(
                        this);
                } else {
                    this.jsNode.disconnect();
                    this.jsNode.onaudioprocess = null;
                }
            }
        },
        returnCompute: {
            value: function(instance) {
                return function(event) {
                    instance.compute(event);
                };
            }
        },
        compute: {
            value: function(event) {
                var count = event.inputBuffer.getChannelData(0)
                    .length,
                    channels = event.inputBuffer.numberOfChannels,
                    current, chan, rms, i;
                chan = rms = i = 0;
                if (channels > 1) { //need to mixdown
                    for (i = 0; i < count; ++i) {
                        for (; chan < channels; ++chan) {
                            current = event.inputBuffer.getChannelData(chan)[i];
                            rms += (current * current) / channels;
                        }
                    }
                } else {
                    for (i = 0; i < count; ++i) {
                        current = event.inputBuffer.getChannelData(0)[i];
                        rms += (current * current);
                    }
                }
                rms = Math.sqrt(rms);

                if (this._envelope < rms) {
                    this._envelope *= this._attackC;
                    this._envelope += (1 - this._attackC) * rms;
                } else {
                    this._envelope *= this._releaseC;
                    this._envelope += (1 - this._releaseC) *
                        rms;
                }
                this._callback(this._target, this._envelope);
            }
        }
    });

    Tuna.prototype.LFO = function(properties) {
        //Instantiate AudioNode
        this.output = userContext.createScriptProcessor(256, 1, 1);
        this.activateNode = userContext.destination;

        //Set Properties
        this.frequency = initValue(properties.frequency, this.defaults.frequency
            .value);
        this.offset = initValue(properties.offset, this.defaults.offset.value);
        this.oscillation = initValue(properties.oscillation, this.defaults
            .oscillation
            .value);
        this.phase = initValue(properties.phase, this.defaults.phase.value);
        this.target = properties.target || {};
        this.output.onaudioprocess = this.callback(properties.callback ||
            function() {});
        this.bypass = properties.bypass || false;
    };
    Tuna.prototype.LFO.prototype = Object.create(Super, {
        name: {
            value: "LFO"
        },
        bufferSize: {
            value: 256
        },
        sampleRate: {
            value: 44100
        },
        defaults: {
            value: {
                frequency: {
                    value: 1,
                    min: 0,
                    max: 20,
                    automatable: false,
                    type: FLOAT
                },
                offset: {
                    value: 0.85,
                    min: 0,
                    max: 22049,
                    automatable: false,
                    type: FLOAT
                },
                oscillation: {
                    value: 0.3,
                    min: -22050,
                    max: 22050,
                    automatable: false,
                    type: FLOAT
                },
                phase: {
                    value: 0,
                    min: 0,
                    max: 2 * Math.PI,
                    automatable: false,
                    type: FLOAT
                }
            }
        },
        frequency: {
            get: function() {
                return this._frequency;
            },
            set: function(value) {
                this._frequency = value;
                this._phaseInc = 2 * Math.PI * this._frequency *
                    this.bufferSize /
                    this.sampleRate;
            }
        },
        offset: {
            get: function() {
                return this._offset;
            },
            set: function(value) {
                this._offset = value;
            }
        },
        oscillation: {
            get: function() {
                return this._oscillation;
            },
            set: function(value) {
                this._oscillation = value;
            }
        },
        phase: {
            get: function() {
                return this._phase;
            },
            set: function(value) {
                this._phase = value;
            }
        },
        target: {
            get: function() {
                return this._target;
            },
            set: function(value) {
                this._target = value;
            }
        },
        activate: {
            value: function(doActivate) {
                if (!doActivate) {
                    this.output.disconnect(userContext.destination);
                } else {
                    this.output.connect(userContext.destination);
                }
            }
        },
        callback: {
            value: function(callback) {
                var that = this;
                return function() {
                    that._phase += that._phaseInc;
                    if (that._phase > 2 * Math.PI) {
                        that._phase = 0;
                    }
                    callback(that._target, that._offset +
                        that._oscillation *
                        Math.sin(that._phase));
                };
            }
        }
    });

    Tuna.toString = Tuna.prototype.toString = function() {
        return "Please visit https://github.com/Theodeus/tuna/wiki for instructions on how to use Tuna.js";
    };
})(this);

},{}],8:[function(require,module,exports){
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
    cutoff: 1250,      //cutoff frequency of the built in lowpass-filter. 20 to 20050
    bypass: 0
});

var delay2 = new tuna.Delay({
    feedback: 0.65,    //0 to 1+
    delayTime: 75,    //how many milliseconds should the wet signal be delayed?
    wetLevel: 0.5,    //0 to 1+
    dryLevel: 0.25,       //0 to 1+
    cutoff: 500,      //cutoff frequency of the built in lowpass-filter. 20 to 20050
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
    cutoff: 700,      //cutoff frequency of the built in lowpass-filter. 20 to 20050
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
  return (Math.random() * 20) - 10
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
  i = ~~(Math.random() * 19) + 1
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
  if(++j > 20) {
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
  if(++k > 20) {
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
}, 20700)


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
    delay.cutoff.value = delay.cutoff.value * 0.85
    delay3.cutoff.value = delay3.cutoff.value * 0.85
    delay2.cutoff.value = delay2.cutoff.value * 0.85
    g.gain.value = g.gain.value * 0.95
  }
}, 5000)
},{"@coleww/openmusic-sample-player":1,"full-house":4,"load-sample-2-buff":6,"tunajs":7}]},{},[8])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQGNvbGV3dy9vcGVubXVzaWMtc2FtcGxlLXBsYXllci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AY29sZXd3L29wZW5tdXNpYy1zYW1wbGUtcGxheWVyL25vZGVfbW9kdWxlcy9vcGVubXVzaWMtZGNiaWFzL0RDQmlhcy5qcyIsIm5vZGVfbW9kdWxlcy9AY29sZXd3L29wZW5tdXNpYy1zYW1wbGUtcGxheWVyL25vZGVfbW9kdWxlcy9zZXR0ZXItZ2V0dGVyaWZ5L21haW4uanMiLCJub2RlX21vZHVsZXMvZnVsbC1ob3VzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mdWxsLWhvdXNlL25vZGVfbW9kdWxlcy9nZXQtb2JqZWN0LXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9hZC1zYW1wbGUtMi1idWZmL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3R1bmFqcy90dW5hLmpzIiwid3d3L2RlbW8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBzZXR0ZXJHZXR0ZXJpZnkgPSByZXF1aXJlKCdzZXR0ZXItZ2V0dGVyaWZ5Jyk7XG52YXIgRENCaWFzID0gcmVxdWlyZSgnb3Blbm11c2ljLWRjYmlhcycpO1xuXG5mdW5jdGlvbiBTYW1wbGVQbGF5ZXIoY29udGV4dCkge1xuXHR2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXHR2YXIgbm9kZVByb3BlcnRpZXMgPSB7XG5cdFx0YnVmZmVyOiBudWxsLFxuXHRcdGxvb3A6IGZhbHNlLFxuXHRcdGxvb3BTdGFydDogMCxcblx0XHRsb29wRW5kOiAwLFxuXHRcdHBpdGNoQmVuZDogbnVsbFxuXHR9O1xuXG5cdHZhciBidWZmZXJTb3VyY2VzQ291bnQgPSAwO1xuXHR2YXIgYnVmZmVyU291cmNlcyA9IHt9O1xuXHR2YXIgYnVmZmVyU291cmNlUHJvcGVydGllcyA9IHt9O1xuXHR2YXIgcGl0Y2hCZW5kID0gRENCaWFzKGNvbnRleHQpO1xuXG5cdG5vZGVQcm9wZXJ0aWVzLnBpdGNoQmVuZCA9IHBpdGNoQmVuZC5nYWluO1xuXHRwaXRjaEJlbmQuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLCBjb250ZXh0LmN1cnJlbnRUaW1lKTtcblxuXHRzZXR0ZXJHZXR0ZXJpZnkobm9kZSwgbm9kZVByb3BlcnRpZXMsIHtcblx0XHRhZnRlclNldHRpbmc6IG9uTm9kZVByb3BlcnR5U2V0XG5cdH0pO1xuXG5cdFxuXHQvLyBUT0RPOiBwbGF5ZXIgY2FuIGJlIG1vbm8gb3IgcG9seSBpLmUuIG9ubHkgb25lIGJ1ZmZlciBjYW4gcGxheSBhdCBhIGdpdmVuIHRpbWUgb3IgbWFueSBjYW4gb3ZlcmxhcFxuXG5cdG5vZGUuc3RhcnQgPSBmdW5jdGlvbih3aGVuLCBvZmZzZXQsIGR1cmF0aW9uKSB7XG5cdFx0XG5cdFx0dmFyIGJ1ZmZlciA9IG5vZGVQcm9wZXJ0aWVzWydidWZmZXInXTtcblx0XHRpZighYnVmZmVyKSB7XG5cdFx0XHRjb25zb2xlLmluZm8oJ09wZW5NdXNpYyBTYW1wbGVQbGF5ZXI6IG5vIGJ1ZmZlciB0byBwbGF5LCBzbyBieWVlZSEnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR3aGVuID0gd2hlbiAhPT0gdW5kZWZpbmVkID8gd2hlbiA6IDA7XG5cdFx0b2Zmc2V0ID0gb2Zmc2V0ICE9PSB1bmRlZmluZWQgPyBvZmZzZXQgOiAwO1xuXHRcdFxuXHRcdC8vIFRPRE8gVGhpcyBpcyBtZWdhIHVnbHkgYnV0IHVyZ2ggd2hhdCBpcyBnb2luZyBvbiB1cmdoXG5cdFx0Ly8gaWYgSSBqdXN0IHBhc3MgJ3VuZGVmaW5lZCcgYXMgZHVyYXRpb24gQ2hyb21lIGRvZXNuJ3QgcGxheSBhbnl0aGluZ1xuXHRcdGlmKHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdjb3JyZWN0aW5nIGZvciBjaHJvbWUgYWdoaCcpO1xuXHRcdFx0dmFyIHNhbXBsZUxlbmd0aCA9IGJ1ZmZlci5sZW5ndGg7XG5cdFx0XHRkdXJhdGlvbiA9IGR1cmF0aW9uICE9PSB1bmRlZmluZWQgPyBkdXJhdGlvbiA6IHNhbXBsZUxlbmd0aCAtIG9mZnNldDtcblx0XHR9XG5cblx0XHQvLyBNb25vOiBpbnZhbGlkYXRlIGFsbCBzY2hlZHVsZWQgYnVmZmVyU291cmNlcyB0byBtYWtlIHN1cmUgb25seSBvbmUgaXMgcGxheWVkIChyZXRyaWcgbW9kZSlcblx0XHQvLyBUT0RPIGltcGxlbWVudCBpbnZhbGlkYXRpb24gY29kZSAuLi5cblxuXHRcdHBpdGNoQmVuZC5zdGFydCh3aGVuKTtcblxuXHRcdC8vIFBvbHk6IGl0J3MgZmluZSwganVzdCBhZGQgYSBuZXcgb25lIHRvIHRoZSBsaXN0XG5cdFx0dmFyIGJzID0gbWFrZUJ1ZmZlclNvdXJjZSgpO1xuXG5cdFx0Ly8gY29uc29sZS5sb2coJ3N0YXJ0JywgJ3doZW4nLCB3aGVuLCAnb2Zmc2V0Jywgb2Zmc2V0LCAnZHVyYXRpb24nLCBkdXJhdGlvbik7XG5cdFx0YnMuc3RhcnQod2hlbiwgb2Zmc2V0LCBkdXJhdGlvbik7XG5cdFx0XG5cdH07XG5cblx0bm9kZS5zdG9wID0gZnVuY3Rpb24od2hlbikge1xuXHRcdC8vIEZvciBlYXNlIG9mIGRldmVsb3BtZW50LCB3ZSdsbCBqdXN0IHN0b3AgdG8gYWxsIHRoZSBzb3VyY2VzIGFuZCBlbXB0eSB0aGUgcXVldWVcblx0XHQvLyBJZiB5b3UgbmVlZCB0byByZS1zY2hlZHVsZSB0aGVtLCB5b3UnbGwgbmVlZCB0byBjYWxsIHN0YXJ0KCkgYWdhaW4uXG5cdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhidWZmZXJTb3VyY2VzKTtcblx0XHRrZXlzLmZvckVhY2goZnVuY3Rpb24oaykge1xuXHRcdFx0dmFyIHNvdXJjZSA9IGJ1ZmZlclNvdXJjZXNba107XG5cdFx0XHRzb3VyY2Uuc3RvcCh3aGVuKTtcblx0XHRcdHJlbW92ZUZyb21RdWV1ZShzb3VyY2UpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHBpdGNoQmVuZC5zdG9wKHdoZW4pO1xuXHR9O1xuXG5cdG5vZGUuY2FuY2VsU2NoZWR1bGVkRXZlbnRzID0gZnVuY3Rpb24od2hlbikge1xuXHRcdC8vIFRPRE86IHdoZW4vaWYgdGhlcmUgaXMgYXV0b21hdGlvblxuXHR9O1xuXG5cdHJldHVybiBub2RlO1xuXHRcblx0Ly9+fn5cblxuXHRmdW5jdGlvbiBtYWtlQnVmZmVyU291cmNlKCkge1xuXG5cdFx0dmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdFx0c291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgb25CdWZmZXJFbmRlZCk7XG5cdFx0c291cmNlLmNvbm5lY3Qobm9kZSk7XG5cdFx0c291cmNlLmlkID0gYnVmZmVyU291cmNlc0NvdW50Kys7XG5cdFx0YnVmZmVyU291cmNlc1tzb3VyY2UuaWRdID0gc291cmNlO1xuXG5cdFx0cGl0Y2hCZW5kLmNvbm5lY3Qoc291cmNlLnBsYXliYWNrUmF0ZSk7XG5cblx0XHRPYmplY3Qua2V5cyhub2RlUHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG5cdFx0XHRzb3VyY2VbbmFtZV0gPSBub2RlUHJvcGVydGllc1tuYW1lXTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBzb3VyY2U7XG5cdFx0XG5cdH1cblxuXHRmdW5jdGlvbiBvbkJ1ZmZlckVuZGVkKGUpIHtcblx0XHR2YXIgc291cmNlID0gZS50YXJnZXQ7XG5cdFx0c291cmNlLnN0b3AoKTtcblx0XHRzb3VyY2UuZGlzY29ubmVjdCgpO1xuXHRcdHBpdGNoQmVuZC5kaXNjb25uZWN0KHNvdXJjZS5wbGF5YmFja1JhdGUpO1xuXHRcdC8vIGFsc28gcmVtb3ZlIGZyb20gbGlzdFxuXHRcdHJlbW92ZUZyb21RdWV1ZShzb3VyY2UpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25Ob2RlUHJvcGVydHlTZXQocHJvcGVydHksIHZhbHVlKSB7XG5cdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhidWZmZXJTb3VyY2VzKTtcblx0XHRrZXlzLmZvckVhY2goZnVuY3Rpb24oaykge1xuXHRcdFx0dmFyIHNyYyA9IGJ1ZmZlclNvdXJjZXNba107XG5cdFx0XHRzcmMubG9vcFN0YXJ0ID0gbm9kZVByb3BlcnRpZXMubG9vcFN0YXJ0O1xuXHRcdFx0c3JjLmxvb3BFbmQgPSBub2RlUHJvcGVydGllcy5sb29wRW5kO1xuXHRcdFx0c3JjLmxvb3AgPSBub2RlUHJvcGVydGllcy5sb29wO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVtb3ZlRnJvbVF1ZXVlKHNvdXJjZSkge1xuXHRcdGRlbGV0ZSBidWZmZXJTb3VyY2VzW3NvdXJjZS5pZF07XG5cdH1cblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNhbXBsZVBsYXllcjtcbiIsIihmdW5jdGlvbigpIHtcblx0XG5cdGZ1bmN0aW9uIERDQmlhcyhjb250ZXh0KSB7XG5cdFx0XG5cdFx0dmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXHRcdHZhciBidWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCAxLCBjb250ZXh0LnNhbXBsZVJhdGUpO1xuXHRcdGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVswXSA9IDEuMDtcblxuXHRcdG91dHB1dC5zdGFydCA9IGZ1bmN0aW9uKHdoZW4pIHtcblx0XHRcdGJ1ZmZlclNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdFx0XHRidWZmZXJTb3VyY2UuYnVmZmVyID0gYnVmZmVyO1xuXHRcdFx0YnVmZmVyU291cmNlLmxvb3AgPSB0cnVlO1xuXHRcdFx0YnVmZmVyU291cmNlLmNvbm5lY3Qob3V0cHV0KTtcblx0XHRcdGJ1ZmZlclNvdXJjZS5zdGFydCh3aGVuKTtcblx0XHR9O1xuXG5cdFx0b3V0cHV0LnN0b3AgPSBmdW5jdGlvbih3aGVuKSB7XG5cdFx0XHRidWZmZXJTb3VyY2Uuc3RvcCh3aGVuKTtcblx0XHRcdGJ1ZmZlclNvdXJjZS5kaXNjb25uZWN0KCk7XG5cdFx0fTtcblx0XHRcblx0XHRyZXR1cm4gb3V0cHV0O1xuXG5cdH1cblxuXHQvL1xuXHRcblx0aWYodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IERDQmlhcztcblx0fSBlbHNlIHtcblx0XHR0aGlzLkRDQmlhcyA9IERDQmlhcztcblx0fVxuXG59KS5jYWxsKHRoaXMpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBzZXR0ZXJHZXR0ZXJpZnk7XG5cblxuZnVuY3Rpb24gc2V0dGVyR2V0dGVyaWZ5KG9iamVjdCwgcHJvcGVydGllcywgY2FsbGJhY2tzKSB7XG5cdGNhbGxiYWNrcyA9IGNhbGxiYWNrcyB8fCB7fTtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKTtcblx0a2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwgbWFrZUdldHRlclNldHRlcihwcm9wZXJ0aWVzLCBrZXksIGNhbGxiYWNrcykpO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlR2V0dGVyU2V0dGVyKHByb3BlcnRpZXMsIHByb3BlcnR5LCBjYWxsYmFja3MpIHtcblx0dmFyIGFmdGVyU2V0dGluZyA9IGNhbGxiYWNrcy5hZnRlclNldHRpbmcgfHwgZnVuY3Rpb24oKSB7fTtcblx0cmV0dXJuIHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGdldFByb3BlcnR5KHByb3BlcnRpZXMsIHByb3BlcnR5KTtcblx0XHR9LFxuXHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHNldFByb3BlcnR5KHByb3BlcnRpZXMsIHByb3BlcnR5LCB2YWx1ZSk7XG5cdFx0XHRhZnRlclNldHRpbmcocHJvcGVydHksIHZhbHVlKTtcblx0XHR9LFxuXHRcdGVudW1lcmFibGU6IHRydWVcblx0fTtcbn1cblxuXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eShwcm9wZXJ0aWVzLCBuYW1lKSB7XG5cdHJldHVybiBwcm9wZXJ0aWVzW25hbWVdO1xufVxuXG5cbmZ1bmN0aW9uIHNldFByb3BlcnR5KHByb3BlcnRpZXMsIG5hbWUsIHZhbHVlKSB7XG5cdHByb3BlcnRpZXNbbmFtZV0gPSB2YWx1ZTtcbn1cblxuXG4iLCJ2YXIgdHlwZXkgPSByZXF1aXJlKCdnZXQtb2JqZWN0LXR5cGUnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChlbCkge1xuICBmdW5jdGlvbiByZXNpemUgKCkge1xuICAgIHN3aXRjaCAodHlwZXkoZWwpKSB7XG4gICAgICBjYXNlICdIVE1MQ29sbGVjdGlvbic6XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBlbFtpXS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgKyAncHgnXG4gICAgICAgICAgZWxbaV0uc3R5bGUud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCArICdweCdcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnSFRNTENhbnZhc0VsZW1lbnQnOlxuICAgICAgICBlbC5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgKyAncHgnXG4gICAgICAgIGVsLndpZHRoID0gd2luZG93LmlubmVyV2lkdGggKyAncHgnXG4gICAgICAgIC8vIGdvIGZvciB0aGUgZ29sZCFcbiAgICAgICAgZWwuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0ICsgJ3B4J1xuICAgICAgICBlbC5zdHlsZS53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoICsgJ3B4J1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgZWwuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0ICsgJ3B4J1xuICAgICAgICBlbC5zdHlsZS53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoICsgJ3B4J1xuICAgICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemUsIGZhbHNlKVxuXG4gIHJlc2l6ZSgpXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcblx0cmV0dXJuICh7fSkudG9TdHJpbmcuY2FsbChvYmopLnNsaWNlKDgsIC0xKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFjLCBwYXRoLCBjYil7XG5cbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxdWVzdC5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcbiAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG4gIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgYWMuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGNiLCBvbkJ1ZmZlckxvYWRFcnJvcik7XG4gIH07XG5cbiAgcmVxdWVzdC5zZW5kKCk7XG5cbiAgZnVuY3Rpb24gb25CdWZmZXJMb2FkRXJyb3IoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihlcnIpO1xuICB9XG5cbn0iLCIvKlxuICAgIENvcHlyaWdodCAoYykgMjAxMiBEaW5haE1vZSBBQiAmIE9za2FyIEVyaWtzc29uXG5cbiAgICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICAgIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSxcbiAgICBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmVcbiAgICBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gICAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiAgICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICAgIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuICAgIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkVcbiAgICBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiovXG4oZnVuY3Rpb24od2luZG93KSB7XG4gICAgdmFyIHVzZXJDb250ZXh0LFxuICAgICAgICB1c2VySW5zdGFuY2UsXG4gICAgICAgIHBpcGUgPSBmdW5jdGlvbihwYXJhbSwgdmFsKSB7XG4gICAgICAgICAgICBwYXJhbS52YWx1ZSA9IHZhbDtcbiAgICAgICAgfSxcbiAgICAgICAgU3VwZXIgPSBPYmplY3QuY3JlYXRlKG51bGwsIHtcbiAgICAgICAgICAgIGFjdGl2YXRlOiB7XG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKGRvQWN0aXZhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvQWN0aXZhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXQuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dC5jb25uZWN0KHRoaXMuYWN0aXZhdGVOb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGl2YXRlQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2YXRlQ2FsbGJhY2soZG9BY3RpdmF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlucHV0LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXQuY29ubmVjdCh0aGlzLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYnlwYXNzOiB7XG4gICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2J5cGFzcztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RCeXBhc3NWYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ieXBhc3MgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSghdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sYXN0QnlwYXNzVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29ubmVjdDoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vdXRwdXQuY29ubmVjdCh0YXJnZXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkaXNjb25uZWN0OiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm91dHB1dC5kaXNjb25uZWN0KHRhcmdldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbm5lY3RJbk9yZGVyOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKG5vZGVBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IG5vZGVBcnJheS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW5vZGVBcnJheVtpXS5jb25uZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoXCJBdWRpb05vZGUuY29ubmVjdEluT3JkZXI6IFR5cGVFcnJvcjogTm90IGFuIEF1ZGlvTm9kZS5cIiwgbm9kZUFycmF5W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlQXJyYXlbaSArIDFdLmlucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUFycmF5W2ldLmNvbm5lY3Qobm9kZUFycmF5W2kgKyAxXS5pbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVBcnJheVtpXS5jb25uZWN0KG5vZGVBcnJheVtpICsgMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldERlZmF1bHRzOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IHRoaXMuZGVmYXVsdHNba2V5XS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhdXRvbWF0ZToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbihwcm9wZXJ0eSwgdmFsdWUsIGR1cmF0aW9uLCBzdGFydFRpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRUaW1lID8gfn4oc3RhcnRUaW1lIC8gMTAwMCkgOiB1c2VyQ29udGV4dC5jdXJyZW50VGltZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1ciA9IGR1cmF0aW9uID8gfn4oZHVyYXRpb24gLyAxMDAwKSA6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBfaXMgPSB0aGlzLmRlZmF1bHRzW3Byb3BlcnR5XSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtID0gdGhpc1twcm9wZXJ0eV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2lzLmF1dG9tYXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPSBcInNldFZhbHVlQXRUaW1lXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0gXCJsaW5lYXJSYW1wVG9WYWx1ZUF0VGltZVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbS5jYW5jZWxTY2hlZHVsZWRWYWx1ZXMoc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbS5zZXRWYWx1ZUF0VGltZShwYXJhbS52YWx1ZSwgc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbVttZXRob2RdKHZhbHVlLCBkdXIgKyBzdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSW52YWxpZCBQcm9wZXJ0eSBmb3IgXCIgKyB0aGlzLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgRkxPQVQgPSBcImZsb2F0XCIsXG4gICAgICAgIEJPT0xFQU4gPSBcImJvb2xlYW5cIixcbiAgICAgICAgU1RSSU5HID0gXCJzdHJpbmdcIixcbiAgICAgICAgSU5UID0gXCJpbnRcIjtcblxuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gVHVuYTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB3aW5kb3cuZGVmaW5lKFwiVHVuYVwiLCBkZWZpbml0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB3aW5kb3cuVHVuYSA9IFR1bmE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVmaW5pdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFR1bmE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gVHVuYShjb250ZXh0KSB7XG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUdW5hKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUdW5hKGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghd2luZG93LkF1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInR1bmEuanM6IE1pc3NpbmcgYXVkaW8gY29udGV4dCEgQ3JlYXRpbmcgYSBuZXcgY29udGV4dCBmb3IgeW91LlwiKTtcbiAgICAgICAgICAgIGNvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0ICYmIChuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlR1bmEgY2Fubm90IGluaXRpYWxpemUgYmVjYXVzZSB0aGlzIGVudmlyb25tZW50IGRvZXMgbm90IHN1cHBvcnQgd2ViIGF1ZGlvLlwiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25uZWN0aWZ5KGNvbnRleHQpO1xuICAgICAgICB1c2VyQ29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHVzZXJJbnN0YW5jZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29ubmVjdGlmeShjb250ZXh0KSB7XG4gICAgICAgIGlmIChjb250ZXh0Ll9fY29ubmVjdGlmaWVkX18gPT09IHRydWUpIHJldHVybjtcblxuICAgICAgICB2YXIgZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpLFxuICAgICAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoT2JqZWN0LmdldFByb3RvdHlwZU9mKGdhaW4pKSxcbiAgICAgICAgICAgIG9jb25uZWN0ID0gcHJvdG8uY29ubmVjdDtcblxuICAgICAgICBwcm90by5jb25uZWN0ID0gc2hpbUNvbm5lY3Q7XG4gICAgICAgIGNvbnRleHQuX19jb25uZWN0aWZpZWRfXyA9IHRydWU7IC8vIFByZXZlbnQgb3ZlcnJpZGluZyBjb25uZWN0IG1vcmUgdGhhbiBvbmNlXG5cbiAgICAgICAgZnVuY3Rpb24gc2hpbUNvbm5lY3QoKSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IEFycmF5LnByb3RvdHlwZS5zaGlmdC5hcHBseShhcmd1bWVudHMpO1xuICAgICAgICAgICAgbm9kZSA9IFN1cGVyLmlzUHJvdG90eXBlT2YgPyAoU3VwZXIuaXNQcm90b3R5cGVPZihub2RlKSA/IG5vZGUuaW5wdXQgOiBub2RlKSA6IChub2RlLmlucHV0IHx8IG5vZGUpO1xuICAgICAgICAgICAgYXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIGFyZ3VtZW50cy51bnNoaWZ0KG5vZGUpO1xuICAgICAgICAgICAgb2Nvbm5lY3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGJUb1dBVm9sdW1lKGRiKSB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKDEwMCAqIE1hdGgucG93KDIsIGRiIC8gNikpIC8gMTAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmbW9kKHgsIHkpIHtcbiAgICAgICAgLy8gaHR0cDovL2tldmluLnZhbnpvbm5ldmVsZC5uZXRcbiAgICAgICAgLy8gKiAgICAgZXhhbXBsZSAxOiBmbW9kKDUuNywgMS4zKTtcbiAgICAgICAgLy8gKiAgICAgcmV0dXJucyAxOiAwLjVcbiAgICAgICAgdmFyIHRtcCwgdG1wMiwgcCA9IDAsXG4gICAgICAgICAgICBwWSA9IDAsXG4gICAgICAgICAgICBsID0gMC4wLFxuICAgICAgICAgICAgbDIgPSAwLjA7XG5cbiAgICAgICAgdG1wID0geC50b0V4cG9uZW50aWFsKCkubWF0Y2goL14uXFwuPyguKillKC4rKSQvKTtcbiAgICAgICAgcCA9IHBhcnNlSW50KHRtcFsyXSwgMTApIC0gKHRtcFsxXSArIFwiXCIpLmxlbmd0aDtcbiAgICAgICAgdG1wID0geS50b0V4cG9uZW50aWFsKCkubWF0Y2goL14uXFwuPyguKillKC4rKSQvKTtcbiAgICAgICAgcFkgPSBwYXJzZUludCh0bXBbMl0sIDEwKSAtICh0bXBbMV0gKyBcIlwiKS5sZW5ndGg7XG5cbiAgICAgICAgaWYgKHBZID4gcCkge1xuICAgICAgICAgICAgcCA9IHBZO1xuICAgICAgICB9XG5cbiAgICAgICAgdG1wMiA9ICh4ICUgeSk7XG5cbiAgICAgICAgaWYgKHAgPCAtMTAwIHx8IHAgPiAyMCkge1xuICAgICAgICAgICAgLy8gdG9GaXhlZCB3aWxsIGdpdmUgYW4gb3V0IG9mIGJvdW5kIGVycm9yIHNvIHdlIGZpeCBpdCBsaWtlIHRoaXM6XG4gICAgICAgICAgICBsID0gTWF0aC5yb3VuZChNYXRoLmxvZyh0bXAyKSAvIE1hdGgubG9nKDEwKSk7XG4gICAgICAgICAgICBsMiA9IE1hdGgucG93KDEwLCBsKTtcblxuICAgICAgICAgICAgcmV0dXJuICh0bXAyIC8gbDIpLnRvRml4ZWQobCAtIHApICogbDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh0bXAyLnRvRml4ZWQoLXApKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNpZ24oeCkge1xuICAgICAgICBpZiAoeCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5hYnMoeCkgLyB4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGFuaChuKSB7XG4gICAgICAgIHJldHVybiAoTWF0aC5leHAobikgLSBNYXRoLmV4cCgtbikpIC8gKE1hdGguZXhwKG4pICsgTWF0aC5leHAoLW4pKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0VmFsdWUodXNlclZhbCwgZGVmYXVsdFZhbCkge1xuICAgICAgICByZXR1cm4gdXNlclZhbCA9PT0gdW5kZWZpbmVkID8gZGVmYXVsdFZhbCA6IHVzZXJWYWw7XG4gICAgfVxuXG4gICAgVHVuYS5wcm90b3R5cGUuQml0Y3J1c2hlciA9IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gdGhpcy5nZXREZWZhdWx0cygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnVmZmVyU2l6ZSA9IHByb3BlcnRpZXMuYnVmZmVyU2l6ZSB8fCB0aGlzLmRlZmF1bHRzLmJ1ZmZlclNpemUudmFsdWU7XG5cbiAgICAgICAgdGhpcy5pbnB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5hY3RpdmF0ZU5vZGUgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMucHJvY2Vzc29yID0gdXNlckNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKHRoaXMuYnVmZmVyU2l6ZSwgMSwgMSk7XG4gICAgICAgIHRoaXMub3V0cHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlLmNvbm5lY3QodGhpcy5wcm9jZXNzb3IpO1xuICAgICAgICB0aGlzLnByb2Nlc3Nvci5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICB2YXIgcGhhc2VyID0gMCxcbiAgICAgICAgICAgIGxhc3QgPSAwLFxuICAgICAgICAgICAgaW5wdXQsIG91dHB1dCwgc3RlcCwgaSwgbGVuZ3RoO1xuICAgICAgICB0aGlzLnByb2Nlc3Nvci5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGlucHV0ID0gZS5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIG91dHB1dCA9IGUub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgc3RlcCA9IE1hdGgucG93KDEgLyAyLCB0aGlzLmJpdHMpO1xuICAgICAgICAgICAgbGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGhhc2VyICs9IHRoaXMubm9ybWZyZXE7XG4gICAgICAgICAgICAgICAgaWYgKHBoYXNlciA+PSAxLjApIHtcbiAgICAgICAgICAgICAgICAgICAgcGhhc2VyIC09IDEuMDtcbiAgICAgICAgICAgICAgICAgICAgbGFzdCA9IHN0ZXAgKiBNYXRoLmZsb29yKGlucHV0W2ldIC8gc3RlcCArIDAuNSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dHB1dFtpXSA9IGxhc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5iaXRzID0gcHJvcGVydGllcy5iaXRzIHx8IHRoaXMuZGVmYXVsdHMuYml0cy52YWx1ZTtcbiAgICAgICAgdGhpcy5ub3JtZnJlcSA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLm5vcm1mcmVxLCB0aGlzLmRlZmF1bHRzLm5vcm1mcmVxLnZhbHVlKTtcbiAgICAgICAgdGhpcy5ieXBhc3MgPSBwcm9wZXJ0aWVzLmJ5cGFzcyB8fCBmYWxzZTtcbiAgICB9O1xuICAgIFR1bmEucHJvdG90eXBlLkJpdGNydXNoZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlciwge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICB2YWx1ZTogXCJCaXRjcnVzaGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICBiaXRzOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiA0LFxuICAgICAgICAgICAgICAgICAgICBtaW46IDEsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMTYsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogSU5UXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBidWZmZXJTaXplOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiA0MDk2LFxuICAgICAgICAgICAgICAgICAgICBtaW46IDI1NixcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxNjM4NCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJ5cGFzczoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBCT09MRUFOXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3JtZnJlcToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC4xLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAuMDAwMSxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLjAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGJpdHM6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3Nvci5iaXRzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3Nvci5iaXRzID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG5vcm1mcmVxOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzb3Iubm9ybWZyZXE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc29yLm5vcm1mcmVxID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIFR1bmEucHJvdG90eXBlLkNhYmluZXQgPSBmdW5jdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmICghcHJvcGVydGllcykge1xuICAgICAgICAgICAgcHJvcGVydGllcyA9IHRoaXMuZ2V0RGVmYXVsdHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlucHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZSA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5jb252b2x2ZXIgPSB0aGlzLm5ld0NvbnZvbHZlcihwcm9wZXJ0aWVzLmltcHVsc2VQYXRoIHx8XG4gICAgICAgICAgICBcIi4uL2ltcHVsc2VzL2ltcHVsc2VfZ3VpdGFyLndhdlwiKTtcbiAgICAgICAgdGhpcy5tYWtldXBOb2RlID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLm91dHB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZS5jb25uZWN0KHRoaXMuY29udm9sdmVyLmlucHV0KTtcbiAgICAgICAgdGhpcy5jb252b2x2ZXIub3V0cHV0LmNvbm5lY3QodGhpcy5tYWtldXBOb2RlKTtcbiAgICAgICAgdGhpcy5tYWtldXBOb2RlLmNvbm5lY3QodGhpcy5vdXRwdXQpO1xuXG4gICAgICAgIHRoaXMubWFrZXVwR2FpbiA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLm1ha2V1cEdhaW4sIHRoaXMuZGVmYXVsdHNcbiAgICAgICAgICAgIC5tYWtldXBHYWluKTtcbiAgICAgICAgdGhpcy5ieXBhc3MgPSBwcm9wZXJ0aWVzLmJ5cGFzcyB8fCBmYWxzZTtcbiAgICB9O1xuICAgIFR1bmEucHJvdG90eXBlLkNhYmluZXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlciwge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICB2YWx1ZTogXCJDYWJpbmV0XCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICBtYWtldXBHYWluOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMjAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYnlwYXNzOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBCT09MRUFOXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBtYWtldXBHYWluOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5tYWtldXBOb2RlLmdhaW47XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMubWFrZXVwTm9kZS5nYWluLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG5ld0NvbnZvbHZlcjoge1xuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKGltcHVsc2VQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB1c2VySW5zdGFuY2UuQ29udm9sdmVyKHtcbiAgICAgICAgICAgICAgICAgICAgaW1wdWxzZTogaW1wdWxzZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGRyeUxldmVsOiAwLFxuICAgICAgICAgICAgICAgICAgICB3ZXRMZXZlbDogMVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBUdW5hLnByb3RvdHlwZS5DaG9ydXMgPSBmdW5jdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmICghcHJvcGVydGllcykge1xuICAgICAgICAgICAgcHJvcGVydGllcyA9IHRoaXMuZ2V0RGVmYXVsdHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlucHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmF0dGVudWF0b3IgPSB0aGlzLmFjdGl2YXRlTm9kZSA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5zcGxpdHRlciA9IHVzZXJDb250ZXh0LmNyZWF0ZUNoYW5uZWxTcGxpdHRlcigyKTtcbiAgICAgICAgdGhpcy5kZWxheUwgPSB1c2VyQ29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgICAgICB0aGlzLmRlbGF5UiA9IHVzZXJDb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgICAgIHRoaXMuZmVlZGJhY2tHYWluTm9kZUxSID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmZlZWRiYWNrR2Fpbk5vZGVSTCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5tZXJnZXIgPSB1c2VyQ29udGV4dC5jcmVhdGVDaGFubmVsTWVyZ2VyKDIpO1xuICAgICAgICB0aGlzLm91dHB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgICAgICB0aGlzLmxmb0wgPSBuZXcgdXNlckluc3RhbmNlLkxGTyh7XG4gICAgICAgICAgICB0YXJnZXQ6IHRoaXMuZGVsYXlMLmRlbGF5VGltZSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBwaXBlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxmb1IgPSBuZXcgdXNlckluc3RhbmNlLkxGTyh7XG4gICAgICAgICAgICB0YXJnZXQ6IHRoaXMuZGVsYXlSLmRlbGF5VGltZSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBwaXBlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaW5wdXQuY29ubmVjdCh0aGlzLmF0dGVudWF0b3IpO1xuICAgICAgICB0aGlzLmF0dGVudWF0b3IuY29ubmVjdCh0aGlzLm91dHB1dCk7XG4gICAgICAgIHRoaXMuYXR0ZW51YXRvci5jb25uZWN0KHRoaXMuc3BsaXR0ZXIpO1xuICAgICAgICB0aGlzLnNwbGl0dGVyLmNvbm5lY3QodGhpcy5kZWxheUwsIDApO1xuICAgICAgICB0aGlzLnNwbGl0dGVyLmNvbm5lY3QodGhpcy5kZWxheVIsIDEpO1xuICAgICAgICB0aGlzLmRlbGF5TC5jb25uZWN0KHRoaXMuZmVlZGJhY2tHYWluTm9kZUxSKTtcbiAgICAgICAgdGhpcy5kZWxheVIuY29ubmVjdCh0aGlzLmZlZWRiYWNrR2Fpbk5vZGVSTCk7XG4gICAgICAgIHRoaXMuZmVlZGJhY2tHYWluTm9kZUxSLmNvbm5lY3QodGhpcy5kZWxheVIpO1xuICAgICAgICB0aGlzLmZlZWRiYWNrR2Fpbk5vZGVSTC5jb25uZWN0KHRoaXMuZGVsYXlMKTtcbiAgICAgICAgdGhpcy5kZWxheUwuY29ubmVjdCh0aGlzLm1lcmdlciwgMCwgMCk7XG4gICAgICAgIHRoaXMuZGVsYXlSLmNvbm5lY3QodGhpcy5tZXJnZXIsIDAsIDEpO1xuICAgICAgICB0aGlzLm1lcmdlci5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICB0aGlzLmZlZWRiYWNrID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuZmVlZGJhY2ssIHRoaXMuZGVmYXVsdHMuZmVlZGJhY2tcbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMucmF0ZSA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLnJhdGUsIHRoaXMuZGVmYXVsdHMucmF0ZS52YWx1ZSk7XG4gICAgICAgIHRoaXMuZGVsYXkgPSBpbml0VmFsdWUocHJvcGVydGllcy5kZWxheSwgdGhpcy5kZWZhdWx0cy5kZWxheS52YWx1ZSk7XG4gICAgICAgIHRoaXMuZGVwdGggPSBpbml0VmFsdWUocHJvcGVydGllcy5kZXB0aCwgdGhpcy5kZWZhdWx0cy5kZXB0aC52YWx1ZSk7XG4gICAgICAgIHRoaXMubGZvUi5waGFzZSA9IE1hdGguUEkgLyAyO1xuICAgICAgICB0aGlzLmF0dGVudWF0b3IuZ2Fpbi52YWx1ZSA9IDAuNjkzNDsgLy8gMSAvICgxMCBeICgoKDIwICogbG9nMTAoMykpIC8gMykgLyAyMCkpXG4gICAgICAgIHRoaXMubGZvTC5hY3RpdmF0ZSh0cnVlKTtcbiAgICAgICAgdGhpcy5sZm9SLmFjdGl2YXRlKHRydWUpO1xuICAgICAgICB0aGlzLmJ5cGFzcyA9IHByb3BlcnRpZXMuYnlwYXNzIHx8IGZhbHNlO1xuICAgIH07XG4gICAgVHVuYS5wcm90b3R5cGUuQ2hvcnVzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3VwZXIsIHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgdmFsdWU6IFwiQ2hvcnVzXCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC40LFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMC45NSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAuMDA0NSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDEsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlcHRoOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLjcsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByYXRlOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxLjUsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiA4LFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBieXBhc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogQk9PTEVBTlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9kZWxheTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGVsYXkgPSAwLjAwMDIgKiAoTWF0aC5wb3coMTAsIHZhbHVlKSAqIDIpO1xuICAgICAgICAgICAgICAgIHRoaXMubGZvTC5vZmZzZXQgPSB0aGlzLl9kZWxheTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb1Iub2Zmc2V0ID0gdGhpcy5fZGVsYXk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGVwdGggPSB0aGlzLl9kZXB0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVwdGg6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9kZXB0aDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGVwdGggPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb0wub3NjaWxsYXRpb24gPSB0aGlzLl9kZXB0aCAqIHRoaXMuX2RlbGF5O1xuICAgICAgICAgICAgICAgIHRoaXMubGZvUi5vc2NpbGxhdGlvbiA9IHRoaXMuX2RlcHRoICogdGhpcy5fZGVsYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZmVlZGJhY2s7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2ZlZWRiYWNrID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgdGhpcy5mZWVkYmFja0dhaW5Ob2RlTFIuZ2Fpbi52YWx1ZSA9IHRoaXMuX2ZlZWRiYWNrO1xuICAgICAgICAgICAgICAgIHRoaXMuZmVlZGJhY2tHYWluTm9kZVJMLmdhaW4udmFsdWUgPSB0aGlzLl9mZWVkYmFjaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcmF0ZToge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JhdGU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb0wuZnJlcXVlbmN5ID0gdGhpcy5fcmF0ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb1IuZnJlcXVlbmN5ID0gdGhpcy5fcmF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHVuYS5wcm90b3R5cGUuQ29tcHJlc3NvciA9IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gdGhpcy5nZXREZWZhdWx0cygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5wdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuY29tcE5vZGUgPSB0aGlzLmFjdGl2YXRlTm9kZSA9IHVzZXJDb250ZXh0LmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO1xuICAgICAgICB0aGlzLm1ha2V1cE5vZGUgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMub3V0cHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgICAgIHRoaXMuY29tcE5vZGUuY29ubmVjdCh0aGlzLm1ha2V1cE5vZGUpO1xuICAgICAgICB0aGlzLm1ha2V1cE5vZGUuY29ubmVjdCh0aGlzLm91dHB1dCk7XG5cbiAgICAgICAgdGhpcy5hdXRvbWFrZXVwID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuYXV0b21ha2V1cCwgdGhpcy5kZWZhdWx0c1xuICAgICAgICAgICAgLmF1dG9tYWtldXBcbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMubWFrZXVwR2FpbiA9IHByb3BlcnRpZXMubWFrZXVwR2FpbiB8fCB0aGlzLmRlZmF1bHRzLm1ha2V1cEdhaW5cbiAgICAgICAgICAgIC52YWx1ZTtcbiAgICAgICAgdGhpcy50aHJlc2hvbGQgPSBpbml0VmFsdWUocHJvcGVydGllcy50aHJlc2hvbGQsIHRoaXMuZGVmYXVsdHMudGhyZXNob2xkXG4gICAgICAgICAgICAudmFsdWUpO1xuICAgICAgICB0aGlzLnJlbGVhc2UgPSBwcm9wZXJ0aWVzLnJlbGVhc2UgfHwgdGhpcy5kZWZhdWx0cy5yZWxlYXNlLnZhbHVlO1xuICAgICAgICB0aGlzLmF0dGFjayA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLmF0dGFjaywgdGhpcy5kZWZhdWx0cy5hdHRhY2tcbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMucmF0aW8gPSBwcm9wZXJ0aWVzLnJhdGlvIHx8IHRoaXMuZGVmYXVsdHMucmF0aW8udmFsdWU7XG4gICAgICAgIHRoaXMua25lZSA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLmtuZWUsIHRoaXMuZGVmYXVsdHMua25lZS52YWx1ZSk7XG4gICAgICAgIHRoaXMuYnlwYXNzID0gcHJvcGVydGllcy5ieXBhc3MgfHwgZmFsc2U7XG4gICAgfTtcbiAgICBUdW5hLnByb3RvdHlwZS5Db21wcmVzc29yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3VwZXIsIHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgdmFsdWU6IFwiQ29tcHJlc3NvclwiXG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgdGhyZXNob2xkOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAtMjAsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogLTYwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVsZWFzZToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMjUwLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDEwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDIwMDAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWFrZXVwR2Fpbjoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAxLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhdHRhY2s6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxMDAwLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJhdGlvOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiA0LFxuICAgICAgICAgICAgICAgICAgICBtaW46IDEsXG4gICAgICAgICAgICAgICAgICAgIG1heDogNTAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAga25lZToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogNSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDQwLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGF1dG9tYWtldXA6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEJPT0xFQU5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJ5cGFzczoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBCT09MRUFOXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjb21wdXRlTWFrZXVwOiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hZ2ljQ29lZmZpY2llbnQgPSA0LFxuICAgICAgICAgICAgICAgICAgICAvLyByYWlzZSBtZSBpZiB0aGUgb3V0cHV0IGlzIHRvbyBob3RcbiAgICAgICAgICAgICAgICAgICAgYyA9IHRoaXMuY29tcE5vZGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0oYy50aHJlc2hvbGQudmFsdWUgLSBjLnRocmVzaG9sZC52YWx1ZSAvXG4gICAgICAgICAgICAgICAgICAgICAgICBjLnJhdGlvLnZhbHVlKSAvXG4gICAgICAgICAgICAgICAgICAgIG1hZ2ljQ29lZmZpY2llbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGF1dG9tYWtldXA6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdXRvbWFrZXVwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdXRvbWFrZXVwID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F1dG9tYWtldXApIHRoaXMubWFrZXVwR2FpbiA9IHRoaXMuY29tcHV0ZU1ha2V1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0aHJlc2hvbGQ6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBOb2RlLnRocmVzaG9sZDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21wTm9kZS50aHJlc2hvbGQudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYXV0b21ha2V1cCkgdGhpcy5tYWtldXBHYWluID0gdGhpcy5jb21wdXRlTWFrZXVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJhdGlvOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21wTm9kZS5yYXRpbztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21wTm9kZS5yYXRpby52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hdXRvbWFrZXVwKSB0aGlzLm1ha2V1cEdhaW4gPSB0aGlzLmNvbXB1dGVNYWtldXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAga25lZToge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcE5vZGUua25lZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21wTm9kZS5rbmVlLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F1dG9tYWtldXApIHRoaXMubWFrZXVwR2FpbiA9IHRoaXMuY29tcHV0ZU1ha2V1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhdHRhY2s6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBOb2RlLmF0dGFjaztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21wTm9kZS5hdHRhY2sudmFsdWUgPSB2YWx1ZSAvIDEwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlbGVhc2U6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBOb2RlLnJlbGVhc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcE5vZGUucmVsZWFzZSA9IHZhbHVlIC8gMTAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbWFrZXVwR2Fpbjoge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFrZXVwTm9kZS5nYWluO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1ha2V1cE5vZGUuZ2Fpbi52YWx1ZSA9IGRiVG9XQVZvbHVtZSh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIFR1bmEucHJvdG90eXBlLkNvbnZvbHZlciA9IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gdGhpcy5nZXREZWZhdWx0cygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5wdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmNvbnZvbHZlciA9IHVzZXJDb250ZXh0LmNyZWF0ZUNvbnZvbHZlcigpO1xuICAgICAgICB0aGlzLmRyeSA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5maWx0ZXJMb3cgPSB1c2VyQ29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgdGhpcy5maWx0ZXJIaWdoID0gdXNlckNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgICAgIHRoaXMud2V0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLm91dHB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZS5jb25uZWN0KHRoaXMuZmlsdGVyTG93KTtcbiAgICAgICAgdGhpcy5hY3RpdmF0ZU5vZGUuY29ubmVjdCh0aGlzLmRyeSk7XG4gICAgICAgIHRoaXMuZmlsdGVyTG93LmNvbm5lY3QodGhpcy5maWx0ZXJIaWdoKTtcbiAgICAgICAgdGhpcy5maWx0ZXJIaWdoLmNvbm5lY3QodGhpcy5jb252b2x2ZXIpO1xuICAgICAgICB0aGlzLmNvbnZvbHZlci5jb25uZWN0KHRoaXMud2V0KTtcbiAgICAgICAgdGhpcy53ZXQuY29ubmVjdCh0aGlzLm91dHB1dCk7XG4gICAgICAgIHRoaXMuZHJ5LmNvbm5lY3QodGhpcy5vdXRwdXQpO1xuXG4gICAgICAgIHRoaXMuZHJ5TGV2ZWwgPSBpbml0VmFsdWUocHJvcGVydGllcy5kcnlMZXZlbCwgdGhpcy5kZWZhdWx0cy5kcnlMZXZlbFxuICAgICAgICAgICAgLnZhbHVlKTtcbiAgICAgICAgdGhpcy53ZXRMZXZlbCA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLndldExldmVsLCB0aGlzLmRlZmF1bHRzLndldExldmVsXG4gICAgICAgICAgICAudmFsdWUpO1xuICAgICAgICB0aGlzLmhpZ2hDdXQgPSBwcm9wZXJ0aWVzLmhpZ2hDdXQgfHwgdGhpcy5kZWZhdWx0cy5oaWdoQ3V0LnZhbHVlO1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IHByb3BlcnRpZXMuaW1wdWxzZSB8fFxuICAgICAgICAgICAgXCIuLi9pbXB1bHNlcy9pcl9yZXZfc2hvcnQud2F2XCI7XG4gICAgICAgIHRoaXMubG93Q3V0ID0gcHJvcGVydGllcy5sb3dDdXQgfHwgdGhpcy5kZWZhdWx0cy5sb3dDdXQudmFsdWU7XG4gICAgICAgIHRoaXMubGV2ZWwgPSBpbml0VmFsdWUocHJvcGVydGllcy5sZXZlbCwgdGhpcy5kZWZhdWx0cy5sZXZlbC52YWx1ZSk7XG4gICAgICAgIHRoaXMuZmlsdGVySGlnaC50eXBlID0gXCJsb3dwYXNzXCI7XG4gICAgICAgIHRoaXMuZmlsdGVyTG93LnR5cGUgPSBcImhpZ2hwYXNzXCI7XG4gICAgICAgIHRoaXMuYnlwYXNzID0gcHJvcGVydGllcy5ieXBhc3MgfHwgZmFsc2U7XG4gICAgfTtcbiAgICBUdW5hLnByb3RvdHlwZS5Db252b2x2ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlciwge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICB2YWx1ZTogXCJDb252b2x2ZXJcIlxuICAgICAgICB9LFxuICAgICAgICBkZWZhdWx0czoge1xuICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgIGhpZ2hDdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDIyMDUwLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDIwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDIyMDUwLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxvd0N1dDoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMjAsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMjAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMjIwNTAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHJ5TGV2ZWw6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHdldExldmVsOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBsZXZlbDoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDEsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbG93Q3V0OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlckxvdy5mcmVxdWVuY3k7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyTG93LmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBoaWdoQ3V0OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlckhpZ2guZnJlcXVlbmN5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbHRlckhpZ2guZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGxldmVsOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm91dHB1dC5nYWluO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm91dHB1dC5nYWluLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRyeUxldmVsOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRyeS5nYWluXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHJ5LmdhaW4udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgd2V0TGV2ZWw6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud2V0LmdhaW47XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMud2V0LmdhaW4udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYnVmZmVyOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udm9sdmVyLmJ1ZmZlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKGltcHVsc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29udm9sdmVyID0gdGhpcy5jb252b2x2ZXIsXG4gICAgICAgICAgICAgICAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIGlmICghaW1wdWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlR1bmEuQ29udm9sdmVyLnNldEJ1ZmZlcjogTWlzc2luZyBpbXB1bHNlIHBhdGghXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHhoci5vcGVuKFwiR0VUXCIsIGltcHVsc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSBcImFycmF5YnVmZmVyXCI7XG4gICAgICAgICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzIDwgMzAwICYmIHhoci5zdGF0dXMgPiAxOTkgfHwgeGhyLnN0YXR1cyA9PT0gMzAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlckNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHhoci5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZvbHZlci5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZSkgY29uc29sZS5sb2coXCJUdW5hLkNvbnZvbHZlci5zZXRCdWZmZXI6IEVycm9yIGRlY29kaW5nIGRhdGFcIiArIGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB4aHIuc2VuZChudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHVuYS5wcm90b3R5cGUuRGVsYXkgPSBmdW5jdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmICghcHJvcGVydGllcykge1xuICAgICAgICAgICAgcHJvcGVydGllcyA9IHRoaXMuZ2V0RGVmYXVsdHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlucHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZSA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5kcnkgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMud2V0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmZpbHRlciA9IHVzZXJDb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICB0aGlzLmRlbGF5ID0gdXNlckNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICAgICAgdGhpcy5mZWVkYmFja05vZGUgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMub3V0cHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlLmNvbm5lY3QodGhpcy5kZWxheSk7XG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlLmNvbm5lY3QodGhpcy5kcnkpO1xuICAgICAgICB0aGlzLmRlbGF5LmNvbm5lY3QodGhpcy5maWx0ZXIpO1xuICAgICAgICB0aGlzLmZpbHRlci5jb25uZWN0KHRoaXMuZmVlZGJhY2tOb2RlKTtcbiAgICAgICAgdGhpcy5mZWVkYmFja05vZGUuY29ubmVjdCh0aGlzLmRlbGF5KTtcbiAgICAgICAgdGhpcy5mZWVkYmFja05vZGUuY29ubmVjdCh0aGlzLndldCk7XG4gICAgICAgIHRoaXMud2V0LmNvbm5lY3QodGhpcy5vdXRwdXQpO1xuICAgICAgICB0aGlzLmRyeS5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICB0aGlzLmRlbGF5VGltZSA9IHByb3BlcnRpZXMuZGVsYXlUaW1lIHx8IHRoaXMuZGVmYXVsdHMuZGVsYXlUaW1lLnZhbHVlO1xuICAgICAgICB0aGlzLmZlZWRiYWNrID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuZmVlZGJhY2ssIHRoaXMuZGVmYXVsdHMuZmVlZGJhY2sudmFsdWUpO1xuICAgICAgICB0aGlzLndldExldmVsID0gaW5pdFZhbHVlKHByb3BlcnRpZXMud2V0TGV2ZWwsIHRoaXMuZGVmYXVsdHMud2V0TGV2ZWwudmFsdWUpO1xuICAgICAgICB0aGlzLmRyeUxldmVsID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuZHJ5TGV2ZWwsIHRoaXMuZGVmYXVsdHMuZHJ5TGV2ZWwudmFsdWUpO1xuICAgICAgICB0aGlzLmN1dG9mZiA9IHByb3BlcnRpZXMuY3V0b2ZmIHx8IHRoaXMuZGVmYXVsdHMuY3V0b2ZmLnZhbHVlO1xuICAgICAgICB0aGlzLmZpbHRlci50eXBlID0gXCJsb3dwYXNzXCI7XG4gICAgICAgIHRoaXMuYnlwYXNzID0gcHJvcGVydGllcy5ieXBhc3MgfHwgZmFsc2U7XG4gICAgfTtcbiAgICBUdW5hLnByb3RvdHlwZS5EZWxheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyLCB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIHZhbHVlOiBcIkRlbGF5XCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICBkZWxheVRpbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxMDAwLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC40NSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDAuOSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjdXRvZmY6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDIwMDAwLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDIwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDIwMDAwLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHdldExldmVsOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLjUsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRyeUxldmVsOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkZWxheVRpbWU6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlbGF5LmRlbGF5VGltZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWxheS5kZWxheVRpbWUudmFsdWUgPSB2YWx1ZSAvIDEwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHdldExldmVsOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53ZXQuZ2FpbjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZXQuZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkcnlMZXZlbDoge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZHJ5LmdhaW47XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHJ5LmdhaW4udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZmVlZGJhY2s6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZlZWRiYWNrTm9kZS5nYWluO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZlZWRiYWNrTm9kZS5nYWluLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGN1dG9mZjoge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyLmZyZXF1ZW5jeTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIFR1bmEucHJvdG90eXBlLkZpbHRlciA9IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gdGhpcy5nZXREZWZhdWx0cygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5wdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmZpbHRlciA9IHVzZXJDb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICB0aGlzLm91dHB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZS5jb25uZWN0KHRoaXMuZmlsdGVyKTtcbiAgICAgICAgdGhpcy5maWx0ZXIuY29ubmVjdCh0aGlzLm91dHB1dCk7XG5cbiAgICAgICAgdGhpcy5mcmVxdWVuY3kgPSBwcm9wZXJ0aWVzLmZyZXF1ZW5jeSB8fCB0aGlzLmRlZmF1bHRzLmZyZXF1ZW5jeVxuICAgICAgICAgICAgLnZhbHVlO1xuICAgICAgICB0aGlzLlEgPSBwcm9wZXJ0aWVzLnJlc29uYW5jZSB8fCB0aGlzLmRlZmF1bHRzLlEudmFsdWU7XG4gICAgICAgIHRoaXMuZmlsdGVyVHlwZSA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLmZpbHRlclR5cGUsIHRoaXMuZGVmYXVsdHNcbiAgICAgICAgICAgIC5maWx0ZXJUeXBlXG4gICAgICAgICAgICAudmFsdWUpO1xuICAgICAgICB0aGlzLmdhaW4gPSBpbml0VmFsdWUocHJvcGVydGllcy5nYWluLCB0aGlzLmRlZmF1bHRzLmdhaW4udmFsdWUpO1xuICAgICAgICB0aGlzLmJ5cGFzcyA9IHByb3BlcnRpZXMuYnlwYXNzIHx8IGZhbHNlO1xuICAgIH07XG4gICAgVHVuYS5wcm90b3R5cGUuRmlsdGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3VwZXIsIHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgdmFsdWU6IFwiRmlsdGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICBmcmVxdWVuY3k6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDgwMCxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAyMjA1MCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBROiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAuMDAxLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBnYWluOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgICAgICAgICBtaW46IC00MCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiA0MCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBieXBhc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogQk9PTEVBTlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZmlsdGVyVHlwZToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogXCJsb3dwYXNzXCIsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU1RSSU5HXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmaWx0ZXJUeXBlOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIudHlwZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXIudHlwZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBROiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIuUTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXIuUS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnYWluOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIuZ2FpbjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXIuZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmcmVxdWVuY3k6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlci5mcmVxdWVuY3k7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBUdW5hLnByb3RvdHlwZS5Nb29nRmlsdGVyID0gZnVuY3Rpb24ocHJvcGVydGllcykge1xuICAgICAgICBpZiAoIXByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSB0aGlzLmdldERlZmF1bHRzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5idWZmZXJTaXplID0gcHJvcGVydGllcy5idWZmZXJTaXplIHx8IHRoaXMuZGVmYXVsdHMuYnVmZmVyU2l6ZVxuICAgICAgICAgICAgLnZhbHVlO1xuXG4gICAgICAgIHRoaXMuaW5wdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLnByb2Nlc3NvciA9IHVzZXJDb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3Nvcih0aGlzLmJ1ZmZlclNpemUsXG4gICAgICAgICAgICAxLFxuICAgICAgICAgICAgMSk7XG4gICAgICAgIHRoaXMub3V0cHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlLmNvbm5lY3QodGhpcy5wcm9jZXNzb3IpO1xuICAgICAgICB0aGlzLnByb2Nlc3Nvci5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICB2YXIgaW4xLCBpbjIsIGluMywgaW40LCBvdXQxLCBvdXQyLCBvdXQzLCBvdXQ0O1xuICAgICAgICBpbjEgPSBpbjIgPSBpbjMgPSBpbjQgPSBvdXQxID0gb3V0MiA9IG91dDMgPSBvdXQ0ID0gMC4wO1xuICAgICAgICB2YXIgaW5wdXQsIG91dHB1dCwgZiwgZmIsIGksIGxlbmd0aDtcbiAgICAgICAgdGhpcy5wcm9jZXNzb3Iub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gZS5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICAgICAgZiA9IHRoaXMuY3V0b2ZmICogMS4xNixcbiAgICAgICAgICAgICAgICBpbnB1dEZhY3RvciA9IDAuMzUwMTMgKiAoZiAqIGYpICogKGYgKiBmKTtcbiAgICAgICAgICAgIGZiID0gdGhpcy5yZXNvbmFuY2UgKiAoMS4wIC0gMC4xNSAqIGYgKiBmKTtcbiAgICAgICAgICAgIGxlbmd0aCA9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlucHV0W2ldIC09IG91dDQgKiBmYjtcbiAgICAgICAgICAgICAgICBpbnB1dFtpXSAqPSBpbnB1dEZhY3RvcjtcbiAgICAgICAgICAgICAgICBvdXQxID0gaW5wdXRbaV0gKyAwLjMgKiBpbjEgKyAoMSAtIGYpICogb3V0MTsgLy8gUG9sZSAxXG4gICAgICAgICAgICAgICAgaW4xID0gaW5wdXRbaV07XG4gICAgICAgICAgICAgICAgb3V0MiA9IG91dDEgKyAwLjMgKiBpbjIgKyAoMSAtIGYpICogb3V0MjsgLy8gUG9sZSAyXG4gICAgICAgICAgICAgICAgaW4yID0gb3V0MTtcbiAgICAgICAgICAgICAgICBvdXQzID0gb3V0MiArIDAuMyAqIGluMyArICgxIC0gZikgKiBvdXQzOyAvLyBQb2xlIDNcbiAgICAgICAgICAgICAgICBpbjMgPSBvdXQyO1xuICAgICAgICAgICAgICAgIG91dDQgPSBvdXQzICsgMC4zICogaW40ICsgKDEgLSBmKSAqIG91dDQ7IC8vIFBvbGUgNFxuICAgICAgICAgICAgICAgIGluNCA9IG91dDM7XG4gICAgICAgICAgICAgICAgb3V0cHV0W2ldID0gb3V0NDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmN1dG9mZiA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLmN1dG9mZiwgdGhpcy5kZWZhdWx0cy5jdXRvZmZcbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMucmVzb25hbmNlID0gaW5pdFZhbHVlKHByb3BlcnRpZXMucmVzb25hbmNlLCB0aGlzLmRlZmF1bHRzLnJlc29uYW5jZVxuICAgICAgICAgICAgLnZhbHVlKTtcbiAgICAgICAgdGhpcy5ieXBhc3MgPSBwcm9wZXJ0aWVzLmJ5cGFzcyB8fCBmYWxzZTtcbiAgICB9O1xuICAgIFR1bmEucHJvdG90eXBlLk1vb2dGaWx0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlciwge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICB2YWx1ZTogXCJNb29nRmlsdGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICBidWZmZXJTaXplOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiA0MDk2LFxuICAgICAgICAgICAgICAgICAgICBtaW46IDI1NixcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxNjM4NCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJ5cGFzczoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogQk9PTEVBTlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY3V0b2ZmOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLjA2NSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLjAwMDEsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMS4wLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXNvbmFuY2U6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDMuNSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLjAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogNC4wLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjdXRvZmY6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3Nvci5jdXRvZmY7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc29yLmN1dG9mZiA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZXNvbmFuY2U6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3Nvci5yZXNvbmFuY2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc29yLnJlc29uYW5jZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBUdW5hLnByb3RvdHlwZS5PdmVyZHJpdmUgPSBmdW5jdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmICghcHJvcGVydGllcykge1xuICAgICAgICAgICAgcHJvcGVydGllcyA9IHRoaXMuZ2V0RGVmYXVsdHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlucHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZSA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5pbnB1dERyaXZlID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLndhdmVzaGFwZXIgPSB1c2VyQ29udGV4dC5jcmVhdGVXYXZlU2hhcGVyKCk7XG4gICAgICAgIHRoaXMub3V0cHV0RHJpdmUgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMub3V0cHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlLmNvbm5lY3QodGhpcy5pbnB1dERyaXZlKTtcbiAgICAgICAgdGhpcy5pbnB1dERyaXZlLmNvbm5lY3QodGhpcy53YXZlc2hhcGVyKTtcbiAgICAgICAgdGhpcy53YXZlc2hhcGVyLmNvbm5lY3QodGhpcy5vdXRwdXREcml2ZSk7XG4gICAgICAgIHRoaXMub3V0cHV0RHJpdmUuY29ubmVjdCh0aGlzLm91dHB1dCk7XG5cbiAgICAgICAgdGhpcy53c190YWJsZSA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5rX25TYW1wbGVzKTtcbiAgICAgICAgdGhpcy5kcml2ZSA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLmRyaXZlLCB0aGlzLmRlZmF1bHRzLmRyaXZlLnZhbHVlKTtcbiAgICAgICAgdGhpcy5vdXRwdXRHYWluID0gaW5pdFZhbHVlKHByb3BlcnRpZXMub3V0cHV0R2FpbiwgdGhpcy5kZWZhdWx0c1xuICAgICAgICAgICAgLm91dHB1dEdhaW5cbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMuY3VydmVBbW91bnQgPSBpbml0VmFsdWUocHJvcGVydGllcy5jdXJ2ZUFtb3VudCwgdGhpcy5kZWZhdWx0c1xuICAgICAgICAgICAgLmN1cnZlQW1vdW50XG4gICAgICAgICAgICAudmFsdWUpO1xuICAgICAgICB0aGlzLmFsZ29yaXRobUluZGV4ID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuYWxnb3JpdGhtSW5kZXgsIHRoaXNcbiAgICAgICAgICAgIC5kZWZhdWx0c1xuICAgICAgICAgICAgLmFsZ29yaXRobUluZGV4LnZhbHVlKTtcbiAgICAgICAgdGhpcy5ieXBhc3MgPSBwcm9wZXJ0aWVzLmJ5cGFzcyB8fCBmYWxzZTtcbiAgICB9O1xuICAgIFR1bmEucHJvdG90eXBlLk92ZXJkcml2ZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyLCB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIHZhbHVlOiBcIk92ZXJkcml2ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgZHJpdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVQsXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3V0cHV0R2Fpbjoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDEsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVCxcbiAgICAgICAgICAgICAgICAgICAgc2NhbGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjdXJ2ZUFtb3VudDoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC43MjUsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhbGdvcml0aG1JbmRleDoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMCxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDUsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogSU5UXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBrX25TYW1wbGVzOiB7XG4gICAgICAgICAgICB2YWx1ZTogODE5MlxuICAgICAgICB9LFxuICAgICAgICBkcml2ZToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbnB1dERyaXZlLmdhaW47XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RyaXZlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGN1cnZlQW1vdW50OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jdXJ2ZUFtb3VudDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3VydmVBbW91bnQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYWxnb3JpdGhtSW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hbGdvcml0aG1JbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMud2F2ZXNoYXBlckFsZ29yaXRobXNbdGhpcy5fYWxnb3JpdGhtSW5kZXhdXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLl9jdXJ2ZUFtb3VudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua19uU2FtcGxlcywgdGhpcy53c190YWJsZSk7XG4gICAgICAgICAgICAgICAgdGhpcy53YXZlc2hhcGVyLmN1cnZlID0gdGhpcy53c190YWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb3V0cHV0R2Fpbjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vdXRwdXREcml2ZS5nYWluO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vdXRwdXRHYWluID0gZGJUb1dBVm9sdW1lKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYWxnb3JpdGhtSW5kZXg6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FsZ29yaXRobUluZGV4O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hbGdvcml0aG1JbmRleCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VydmVBbW91bnQgPSB0aGlzLl9jdXJ2ZUFtb3VudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgd2F2ZXNoYXBlckFsZ29yaXRobXM6IHtcbiAgICAgICAgICAgIHZhbHVlOiBbXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oYW1vdW50LCBuX3NhbXBsZXMsIHdzX3RhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGFtb3VudCA9IE1hdGgubWluKGFtb3VudCwgMC45OTk5KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGsgPSAyICogYW1vdW50IC8gKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgaSwgeDtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG5fc2FtcGxlczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gaSAqIDIgLyBuX3NhbXBsZXMgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgd3NfdGFibGVbaV0gPSAoMSArIGspICogeCAvICgxICsgayAqIE1hdGguYWJzKHgpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oYW1vdW50LCBuX3NhbXBsZXMsIHdzX3RhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpLCB4LCB5O1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbl9zYW1wbGVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSBpICogMiAvIG5fc2FtcGxlcyAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB5ID0gKCgwLjUgKiBNYXRoLnBvdygoeCArIDEuNCksIDIpKSAtIDEpICogeSA+PSAwID8gNS44IDogMS4yO1xuICAgICAgICAgICAgICAgICAgICAgICAgd3NfdGFibGVbaV0gPSB0YW5oKHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihhbW91bnQsIG5fc2FtcGxlcywgd3NfdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGksIHgsIHksIGEgPSAxIC0gYW1vdW50O1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbl9zYW1wbGVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSBpICogMiAvIG5fc2FtcGxlcyAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB5ID0geCA8IDAgPyAtTWF0aC5wb3coTWF0aC5hYnMoeCksIGEgKyAwLjA0KSA6IE1hdGgucG93KHgsIGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgd3NfdGFibGVbaV0gPSB0YW5oKHkgKiAyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oYW1vdW50LCBuX3NhbXBsZXMsIHdzX3RhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpLCB4LCB5LCBhYngsIGEgPSAxIC0gYW1vdW50ID4gMC45OSA/IDAuOTkgOiAxIC0gYW1vdW50O1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbl9zYW1wbGVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSBpICogMiAvIG5fc2FtcGxlcyAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBhYnggPSBNYXRoLmFicyh4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhYnggPCBhKSB5ID0gYWJ4O1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoYWJ4ID4gYSkgeSA9IGEgKyAoYWJ4IC0gYSkgLyAoMSArIE1hdGgucG93KChhYnggLSBhKSAvICgxIC0gYSksIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGFieCA+IDEpIHkgPSBhYng7XG4gICAgICAgICAgICAgICAgICAgICAgICB3c190YWJsZVtpXSA9IHNpZ24oeCkgKiB5ICogKDEgLyAoKGEgKyAxKSAvIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oYW1vdW50LCBuX3NhbXBsZXMsIHdzX3RhYmxlKSB7IC8vIGZpeGVkIGN1cnZlLCBhbW91bnQgZG9lc24ndCBkbyBhbnl0aGluZywgdGhlIGRpc3RvcnRpb24gaXMganVzdCBmcm9tIHRoZSBkcml2ZVxuICAgICAgICAgICAgICAgICAgICB2YXIgaSwgeDtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG5fc2FtcGxlczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gaSAqIDIgLyBuX3NhbXBsZXMgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggPCAtMC4wODkwNSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdzX3RhYmxlW2ldID0gKC0zIC8gNCkgKiAoMSAtIChNYXRoLnBvdygoMSAtIChNYXRoLmFicyh4KSAtIDAuMDMyODU3KSksIDEyKSkgKyAoMSAvIDMpICogKE1hdGguYWJzKHgpIC1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC4wMzI4NDcpKSArIDAuMDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHggPj0gLTAuMDg5MDUgJiYgeCA8IDAuMzIwMDE4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3NfdGFibGVbaV0gPSAoLTYuMTUzICogKHggKiB4KSkgKyAzLjkzNzUgKiB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3c190YWJsZVtpXSA9IDAuNjMwMDM1O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihhbW91bnQsIG5fc2FtcGxlcywgd3NfdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSAyICsgTWF0aC5yb3VuZChhbW91bnQgKiAxNCksXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBnbyBmcm9tIDIgdG8gMTYgYml0cywga2VlcCBpbiBtaW5kIGZvciB0aGUgVUlcbiAgICAgICAgICAgICAgICAgICAgICAgIGJpdHMgPSBNYXRoLnJvdW5kKE1hdGgucG93KDIsIGEgLSAxKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZWFsIG51bWJlciBvZiBxdWFudGl6YXRpb24gc3RlcHMgZGl2aWRlZCBieSAyXG4gICAgICAgICAgICAgICAgICAgICAgICBpLCB4O1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbl9zYW1wbGVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSBpICogMiAvIG5fc2FtcGxlcyAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB3c190YWJsZVtpXSA9IE1hdGgucm91bmQoeCAqIGJpdHMpIC8gYml0cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHVuYS5wcm90b3R5cGUuUGhhc2VyID0gZnVuY3Rpb24ocHJvcGVydGllcykge1xuICAgICAgICBpZiAoIXByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSB0aGlzLmdldERlZmF1bHRzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pbnB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5zcGxpdHRlciA9IHRoaXMuYWN0aXZhdGVOb2RlID0gdXNlckNvbnRleHQuY3JlYXRlQ2hhbm5lbFNwbGl0dGVyKDIpO1xuICAgICAgICB0aGlzLmZpbHRlcnNMID0gW107XG4gICAgICAgIHRoaXMuZmlsdGVyc1IgPSBbXTtcbiAgICAgICAgdGhpcy5mZWVkYmFja0dhaW5Ob2RlTCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5mZWVkYmFja0dhaW5Ob2RlUiA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5tZXJnZXIgPSB1c2VyQ29udGV4dC5jcmVhdGVDaGFubmVsTWVyZ2VyKDIpO1xuICAgICAgICB0aGlzLmZpbHRlcmVkU2lnbmFsID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLm91dHB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5sZm9MID0gbmV3IHVzZXJJbnN0YW5jZS5MRk8oe1xuICAgICAgICAgICAgdGFyZ2V0OiB0aGlzLmZpbHRlcnNMLFxuICAgICAgICAgICAgY2FsbGJhY2s6IHRoaXMuY2FsbGJhY2tcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGZvUiA9IG5ldyB1c2VySW5zdGFuY2UuTEZPKHtcbiAgICAgICAgICAgIHRhcmdldDogdGhpcy5maWx0ZXJzUixcbiAgICAgICAgICAgIGNhbGxiYWNrOiB0aGlzLmNhbGxiYWNrXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBpID0gdGhpcy5zdGFnZTtcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgdGhpcy5maWx0ZXJzTFtpXSA9IHVzZXJDb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICAgICAgdGhpcy5maWx0ZXJzUltpXSA9IHVzZXJDb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICAgICAgdGhpcy5maWx0ZXJzTFtpXS50eXBlID0gXCJhbGxwYXNzXCI7XG4gICAgICAgICAgICB0aGlzLmZpbHRlcnNSW2ldLnR5cGUgPSBcImFsbHBhc3NcIjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlucHV0LmNvbm5lY3QodGhpcy5zcGxpdHRlcik7XG4gICAgICAgIHRoaXMuaW5wdXQuY29ubmVjdCh0aGlzLm91dHB1dCk7XG4gICAgICAgIHRoaXMuc3BsaXR0ZXIuY29ubmVjdCh0aGlzLmZpbHRlcnNMWzBdLCAwLCAwKTtcbiAgICAgICAgdGhpcy5zcGxpdHRlci5jb25uZWN0KHRoaXMuZmlsdGVyc1JbMF0sIDEsIDApO1xuICAgICAgICB0aGlzLmNvbm5lY3RJbk9yZGVyKHRoaXMuZmlsdGVyc0wpO1xuICAgICAgICB0aGlzLmNvbm5lY3RJbk9yZGVyKHRoaXMuZmlsdGVyc1IpO1xuICAgICAgICB0aGlzLmZpbHRlcnNMW3RoaXMuc3RhZ2UgLSAxXS5jb25uZWN0KHRoaXMuZmVlZGJhY2tHYWluTm9kZUwpO1xuICAgICAgICB0aGlzLmZpbHRlcnNMW3RoaXMuc3RhZ2UgLSAxXS5jb25uZWN0KHRoaXMubWVyZ2VyLCAwLCAwKTtcbiAgICAgICAgdGhpcy5maWx0ZXJzUlt0aGlzLnN0YWdlIC0gMV0uY29ubmVjdCh0aGlzLmZlZWRiYWNrR2Fpbk5vZGVSKTtcbiAgICAgICAgdGhpcy5maWx0ZXJzUlt0aGlzLnN0YWdlIC0gMV0uY29ubmVjdCh0aGlzLm1lcmdlciwgMCwgMSk7XG4gICAgICAgIHRoaXMuZmVlZGJhY2tHYWluTm9kZUwuY29ubmVjdCh0aGlzLmZpbHRlcnNMWzBdKTtcbiAgICAgICAgdGhpcy5mZWVkYmFja0dhaW5Ob2RlUi5jb25uZWN0KHRoaXMuZmlsdGVyc1JbMF0pO1xuICAgICAgICB0aGlzLm1lcmdlci5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICB0aGlzLnJhdGUgPSBpbml0VmFsdWUocHJvcGVydGllcy5yYXRlLCB0aGlzLmRlZmF1bHRzLnJhdGUudmFsdWUpO1xuICAgICAgICB0aGlzLmJhc2VNb2R1bGF0aW9uRnJlcXVlbmN5ID0gcHJvcGVydGllcy5iYXNlTW9kdWxhdGlvbkZyZXF1ZW5jeSB8fCB0aGlzLmRlZmF1bHRzLmJhc2VNb2R1bGF0aW9uRnJlcXVlbmN5LnZhbHVlO1xuICAgICAgICB0aGlzLmRlcHRoID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuZGVwdGgsIHRoaXMuZGVmYXVsdHMuZGVwdGgudmFsdWUpO1xuICAgICAgICB0aGlzLmZlZWRiYWNrID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuZmVlZGJhY2ssIHRoaXMuZGVmYXVsdHMuZmVlZGJhY2sudmFsdWUpO1xuICAgICAgICB0aGlzLnN0ZXJlb1BoYXNlID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuc3RlcmVvUGhhc2UsIHRoaXMuZGVmYXVsdHMuc3RlcmVvUGhhc2UudmFsdWUpO1xuXG4gICAgICAgIHRoaXMubGZvTC5hY3RpdmF0ZSh0cnVlKTtcbiAgICAgICAgdGhpcy5sZm9SLmFjdGl2YXRlKHRydWUpO1xuICAgICAgICB0aGlzLmJ5cGFzcyA9IHByb3BlcnRpZXMuYnlwYXNzIHx8IGZhbHNlO1xuICAgIH07XG4gICAgVHVuYS5wcm90b3R5cGUuUGhhc2VyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3VwZXIsIHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgdmFsdWU6IFwiUGhhc2VyXCJcbiAgICAgICAgfSxcbiAgICAgICAgc3RhZ2U6IHtcbiAgICAgICAgICAgIHZhbHVlOiA0XG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgcmF0ZToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC4xLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogOCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGVwdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAuNixcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDEsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLjcsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdGVyZW9QaGFzZToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogNDAsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxODAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJhc2VNb2R1bGF0aW9uRnJlcXVlbmN5OiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiA3MDAsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDE1MDAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oZmlsdGVycywgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBzdGFnZSA9IDA7IHN0YWdlIDwgNDsgc3RhZ2UrKykge1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJzW3N0YWdlXS5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlcHRoOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9kZXB0aDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGVwdGggPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb0wub3NjaWxsYXRpb24gPSB0aGlzLl9iYXNlTW9kdWxhdGlvbkZyZXF1ZW5jeSAqIHRoaXMuX2RlcHRoO1xuICAgICAgICAgICAgICAgIHRoaXMubGZvUi5vc2NpbGxhdGlvbiA9IHRoaXMuX2Jhc2VNb2R1bGF0aW9uRnJlcXVlbmN5ICogdGhpcy5fZGVwdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJhdGU6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JhdGU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb0wuZnJlcXVlbmN5ID0gdGhpcy5fcmF0ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb1IuZnJlcXVlbmN5ID0gdGhpcy5fcmF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYmFzZU1vZHVsYXRpb25GcmVxdWVuY3k6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9iYXNlTW9kdWxhdGlvbkZyZXF1ZW5jeTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYmFzZU1vZHVsYXRpb25GcmVxdWVuY3kgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb0wub2Zmc2V0ID0gdGhpcy5fYmFzZU1vZHVsYXRpb25GcmVxdWVuY3k7XG4gICAgICAgICAgICAgICAgdGhpcy5sZm9SLm9mZnNldCA9IHRoaXMuX2Jhc2VNb2R1bGF0aW9uRnJlcXVlbmN5O1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlcHRoID0gdGhpcy5fZGVwdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9mZWVkYmFjaztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZmVlZGJhY2sgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmZlZWRiYWNrR2Fpbk5vZGVMLmdhaW4udmFsdWUgPSB0aGlzLl9mZWVkYmFjaztcbiAgICAgICAgICAgICAgICB0aGlzLmZlZWRiYWNrR2Fpbk5vZGVSLmdhaW4udmFsdWUgPSB0aGlzLl9mZWVkYmFjaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc3RlcmVvUGhhc2U6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0ZXJlb1BoYXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGVyZW9QaGFzZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHZhciBuZXdQaGFzZSA9IHRoaXMubGZvTC5fcGhhc2UgKyB0aGlzLl9zdGVyZW9QaGFzZSAqXG4gICAgICAgICAgICAgICAgICAgIE1hdGguUEkgL1xuICAgICAgICAgICAgICAgICAgICAxODA7XG4gICAgICAgICAgICAgICAgbmV3UGhhc2UgPSBmbW9kKG5ld1BoYXNlLCAyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgdGhpcy5sZm9SLl9waGFzZSA9IG5ld1BoYXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBUdW5hLnByb3RvdHlwZS5QaW5nUG9uZ0RlbGF5ID0gZnVuY3Rpb24ocHJvcGVydGllcykge1xuICAgICAgICBpZiAoIXByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSB0aGlzLmdldERlZmF1bHRzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pbnB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy53ZXRMZXZlbCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5zdGVyZW9Ub01vbm9NaXggPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuZmVlZGJhY2tMZXZlbCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5vdXRwdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuZGVsYXlMZWZ0ID0gdXNlckNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICAgICAgdGhpcy5kZWxheVJpZ2h0ID0gdXNlckNvbnRleHQuY3JlYXRlRGVsYXkoKTtcblxuICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZSA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5zcGxpdHRlciA9IHVzZXJDb250ZXh0LmNyZWF0ZUNoYW5uZWxTcGxpdHRlcigyKTtcbiAgICAgICAgdGhpcy5tZXJnZXIgPSB1c2VyQ29udGV4dC5jcmVhdGVDaGFubmVsTWVyZ2VyKDIpO1xuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlLmNvbm5lY3QodGhpcy5zcGxpdHRlcik7XG4gICAgICAgIHRoaXMuc3BsaXR0ZXIuY29ubmVjdCh0aGlzLnN0ZXJlb1RvTW9ub01peCwgMCwgMCk7XG4gICAgICAgIHRoaXMuc3BsaXR0ZXIuY29ubmVjdCh0aGlzLnN0ZXJlb1RvTW9ub01peCwgMSwgMCk7XG4gICAgICAgIHRoaXMuc3RlcmVvVG9Nb25vTWl4LmdhaW4udmFsdWUgPSAuNTtcbiAgICAgICAgdGhpcy5zdGVyZW9Ub01vbm9NaXguY29ubmVjdCh0aGlzLndldExldmVsKTtcbiAgICAgICAgdGhpcy53ZXRMZXZlbC5jb25uZWN0KHRoaXMuZGVsYXlMZWZ0KTtcbiAgICAgICAgdGhpcy5mZWVkYmFja0xldmVsLmNvbm5lY3QodGhpcy5kZWxheUxlZnQpO1xuICAgICAgICB0aGlzLmRlbGF5TGVmdC5jb25uZWN0KHRoaXMuZGVsYXlSaWdodCk7XG4gICAgICAgIHRoaXMuZGVsYXlSaWdodC5jb25uZWN0KHRoaXMuZmVlZGJhY2tMZXZlbCk7XG4gICAgICAgIHRoaXMuZGVsYXlMZWZ0LmNvbm5lY3QodGhpcy5tZXJnZXIsIDAsIDApO1xuICAgICAgICB0aGlzLmRlbGF5UmlnaHQuY29ubmVjdCh0aGlzLm1lcmdlciwgMCwgMSk7XG4gICAgICAgIHRoaXMubWVyZ2VyLmNvbm5lY3QodGhpcy5vdXRwdXQpO1xuICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZS5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICB0aGlzLmRlbGF5VGltZUxlZnQgPSBwcm9wZXJ0aWVzLmRlbGF5VGltZUxlZnQgIT09IHVuZGVmaW5lZCA/IHByb3BlcnRpZXMuZGVsYXlUaW1lTGVmdCA6IHRoaXMuZGVmYXVsdHMuZGVsYXlUaW1lTGVmdC52YWx1ZTtcbiAgICAgICAgdGhpcy5kZWxheVRpbWVSaWdodCA9IHByb3BlcnRpZXMuZGVsYXlUaW1lUmlnaHQgIT09IHVuZGVmaW5lZCA/IHByb3BlcnRpZXMuZGVsYXlUaW1lUmlnaHQgOiB0aGlzLmRlZmF1bHRzLmRlbGF5VGltZVJpZ2h0LnZhbHVlO1xuICAgICAgICB0aGlzLmZlZWRiYWNrTGV2ZWwuZ2Fpbi52YWx1ZSA9IHByb3BlcnRpZXMuZmVlZGJhY2sgIT09IHVuZGVmaW5lZCA/IHByb3BlcnRpZXMuZmVlZGJhY2sgOiB0aGlzLmRlZmF1bHRzLmZlZWRiYWNrLnZhbHVlO1xuICAgICAgICB0aGlzLndldExldmVsLmdhaW4udmFsdWUgPSBwcm9wZXJ0aWVzLndldExldmVsICE9PSB1bmRlZmluZWQgPyBwcm9wZXJ0aWVzLndldExldmVsIDogdGhpcy5kZWZhdWx0cy53ZXRMZXZlbC52YWx1ZTtcbiAgICAgICAgdGhpcy5ieXBhc3MgPSBwcm9wZXJ0aWVzLmJ5cGFzcyB8fCBmYWxzZTtcbiAgICB9O1xuICAgIFR1bmEucHJvdG90eXBlLlBpbmdQb25nRGVsYXkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlciwge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICB2YWx1ZTogXCJQaW5nUG9uZ0RlbGF5XCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVsYXlUaW1lTGVmdDoge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlbGF5VGltZUxlZnQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlbGF5VGltZUxlZnQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGF5TGVmdC5kZWxheVRpbWUudmFsdWUgPSB2YWx1ZSAvIDEwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGF5VGltZVJpZ2h0OiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZGVsYXlUaW1lUmlnaHQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlbGF5VGltZVJpZ2h0ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWxheVJpZ2h0LmRlbGF5VGltZS52YWx1ZSA9IHZhbHVlIC8gMTAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICBkZWxheVRpbWVMZWZ0OiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAyMDAsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMSxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxMDAwMCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlbGF5VGltZVJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiA0MDAsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMSxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxMDAwMCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLjMsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB3ZXRMZXZlbDoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC41LFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHVuYS5wcm90b3R5cGUuVHJlbW9sbyA9IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gdGhpcy5nZXREZWZhdWx0cygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5wdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuc3BsaXR0ZXIgPSB0aGlzLmFjdGl2YXRlTm9kZSA9IHVzZXJDb250ZXh0LmNyZWF0ZUNoYW5uZWxTcGxpdHRlcihcbiAgICAgICAgICAgICAgICAyKSxcbiAgICAgICAgICAgIHRoaXMuYW1wbGl0dWRlTCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKSwgdGhpcy5hbXBsaXR1ZGVSID1cbiAgICAgICAgICAgIHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKSwgdGhpcy5tZXJnZXIgPSB1c2VyQ29udGV4dC5jcmVhdGVDaGFubmVsTWVyZ2VyKFxuICAgICAgICAgICAgICAgIDIpLCB0aGlzLm91dHB1dCA9IHVzZXJDb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5sZm9MID0gbmV3IHVzZXJJbnN0YW5jZS5MRk8oe1xuICAgICAgICAgICAgdGFyZ2V0OiB0aGlzLmFtcGxpdHVkZUwuZ2FpbixcbiAgICAgICAgICAgIGNhbGxiYWNrOiBwaXBlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxmb1IgPSBuZXcgdXNlckluc3RhbmNlLkxGTyh7XG4gICAgICAgICAgICB0YXJnZXQ6IHRoaXMuYW1wbGl0dWRlUi5nYWluLFxuICAgICAgICAgICAgY2FsbGJhY2s6IHBpcGVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pbnB1dC5jb25uZWN0KHRoaXMuc3BsaXR0ZXIpO1xuICAgICAgICB0aGlzLnNwbGl0dGVyLmNvbm5lY3QodGhpcy5hbXBsaXR1ZGVMLCAwKTtcbiAgICAgICAgdGhpcy5zcGxpdHRlci5jb25uZWN0KHRoaXMuYW1wbGl0dWRlUiwgMSk7XG4gICAgICAgIHRoaXMuYW1wbGl0dWRlTC5jb25uZWN0KHRoaXMubWVyZ2VyLCAwLCAwKTtcbiAgICAgICAgdGhpcy5hbXBsaXR1ZGVSLmNvbm5lY3QodGhpcy5tZXJnZXIsIDAsIDEpO1xuICAgICAgICB0aGlzLm1lcmdlci5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICB0aGlzLnJhdGUgPSBwcm9wZXJ0aWVzLnJhdGUgfHwgdGhpcy5kZWZhdWx0cy5yYXRlLnZhbHVlO1xuICAgICAgICB0aGlzLmludGVuc2l0eSA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLmludGVuc2l0eSwgdGhpcy5kZWZhdWx0cy5pbnRlbnNpdHlcbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMuc3RlcmVvUGhhc2UgPSBpbml0VmFsdWUocHJvcGVydGllcy5zdGVyZW9QaGFzZSwgdGhpcy5kZWZhdWx0c1xuICAgICAgICAgICAgLnN0ZXJlb1BoYXNlXG4gICAgICAgICAgICAudmFsdWUpO1xuXG4gICAgICAgIHRoaXMubGZvTC5vZmZzZXQgPSAxIC0gKHRoaXMuaW50ZW5zaXR5IC8gMik7XG4gICAgICAgIHRoaXMubGZvUi5vZmZzZXQgPSAxIC0gKHRoaXMuaW50ZW5zaXR5IC8gMik7XG4gICAgICAgIHRoaXMubGZvTC5waGFzZSA9IHRoaXMuc3RlcmVvUGhhc2UgKiBNYXRoLlBJIC8gMTgwO1xuXG4gICAgICAgIHRoaXMubGZvTC5hY3RpdmF0ZSh0cnVlKTtcbiAgICAgICAgdGhpcy5sZm9SLmFjdGl2YXRlKHRydWUpO1xuICAgICAgICB0aGlzLmJ5cGFzcyA9IHByb3BlcnRpZXMuYnlwYXNzIHx8IGZhbHNlO1xuICAgIH07XG4gICAgVHVuYS5wcm90b3R5cGUuVHJlbW9sby5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyLCB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIHZhbHVlOiBcIlRyZW1vbG9cIlxuICAgICAgICB9LFxuICAgICAgICBkZWZhdWx0czoge1xuICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgIGludGVuc2l0eToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC4zLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3RlcmVvUGhhc2U6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxODAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJhdGU6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDUsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMC4xLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDExLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBpbnRlbnNpdHk6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbnRlbnNpdHk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2ludGVuc2l0eSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHRoaXMubGZvTC5vZmZzZXQgPSAxIC0gdGhpcy5faW50ZW5zaXR5IC8gMjtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb1Iub2Zmc2V0ID0gMSAtIHRoaXMuX2ludGVuc2l0eSAvIDI7XG4gICAgICAgICAgICAgICAgdGhpcy5sZm9MLm9zY2lsbGF0aW9uID0gdGhpcy5faW50ZW5zaXR5O1xuICAgICAgICAgICAgICAgIHRoaXMubGZvUi5vc2NpbGxhdGlvbiA9IHRoaXMuX2ludGVuc2l0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcmF0ZToge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JhdGU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb0wuZnJlcXVlbmN5ID0gdGhpcy5fcmF0ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxmb1IuZnJlcXVlbmN5ID0gdGhpcy5fcmF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc3RlcmVvUGhhc2U6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yYXRlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGVyZW9QaGFzZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHZhciBuZXdQaGFzZSA9IHRoaXMubGZvTC5fcGhhc2UgKyB0aGlzLl9zdGVyZW9QaGFzZSAqXG4gICAgICAgICAgICAgICAgICAgIE1hdGguUEkgL1xuICAgICAgICAgICAgICAgICAgICAxODA7XG4gICAgICAgICAgICAgICAgbmV3UGhhc2UgPSBmbW9kKG5ld1BoYXNlLCAyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgdGhpcy5sZm9SLnBoYXNlID0gbmV3UGhhc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIFR1bmEucHJvdG90eXBlLldhaFdhaCA9IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gdGhpcy5nZXREZWZhdWx0cygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5wdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmVudmVsb3BlRm9sbG93ZXIgPSBuZXcgdXNlckluc3RhbmNlLkVudmVsb3BlRm9sbG93ZXIoe1xuICAgICAgICAgICAgdGFyZ2V0OiB0aGlzLFxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKGNvbnRleHQsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5zd2VlcCA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5maWx0ZXJCcCA9IHVzZXJDb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICB0aGlzLmZpbHRlclBlYWtpbmcgPSB1c2VyQ29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgdGhpcy5vdXRwdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICAgICAgLy9Db25uZWN0IEF1ZGlvTm9kZXNcbiAgICAgICAgdGhpcy5hY3RpdmF0ZU5vZGUuY29ubmVjdCh0aGlzLmZpbHRlckJwKTtcbiAgICAgICAgdGhpcy5maWx0ZXJCcC5jb25uZWN0KHRoaXMuZmlsdGVyUGVha2luZyk7XG4gICAgICAgIHRoaXMuZmlsdGVyUGVha2luZy5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICAvL1NldCBQcm9wZXJ0aWVzXG4gICAgICAgIHRoaXMuaW5pdCgpO1xuICAgICAgICB0aGlzLmF1dG9tb2RlID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuZW5hYmxlQXV0b01vZGUsIHRoaXMuZGVmYXVsdHNcbiAgICAgICAgICAgIC5hdXRvbW9kZVxuICAgICAgICAgICAgLnZhbHVlKTtcbiAgICAgICAgdGhpcy5yZXNvbmFuY2UgPSBwcm9wZXJ0aWVzLnJlc29uYW5jZSB8fCB0aGlzLmRlZmF1bHRzLnJlc29uYW5jZVxuICAgICAgICAgICAgLnZhbHVlO1xuICAgICAgICB0aGlzLnNlbnNpdGl2aXR5ID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuc2Vuc2l0aXZpdHksIHRoaXMuZGVmYXVsdHNcbiAgICAgICAgICAgIC5zZW5zaXRpdml0eVxuICAgICAgICAgICAgLnZhbHVlKTtcbiAgICAgICAgdGhpcy5iYXNlRnJlcXVlbmN5ID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuYmFzZUZyZXF1ZW5jeSwgdGhpcy5kZWZhdWx0c1xuICAgICAgICAgICAgLmJhc2VGcmVxdWVuY3lcbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMuZXhjdXJzaW9uT2N0YXZlcyA9IHByb3BlcnRpZXMuZXhjdXJzaW9uT2N0YXZlcyB8fCB0aGlzLmRlZmF1bHRzXG4gICAgICAgICAgICAuZXhjdXJzaW9uT2N0YXZlc1xuICAgICAgICAgICAgLnZhbHVlO1xuICAgICAgICB0aGlzLnN3ZWVwID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuc3dlZXAsIHRoaXMuZGVmYXVsdHMuc3dlZXAudmFsdWUpO1xuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVOb2RlLmdhaW4udmFsdWUgPSAyO1xuICAgICAgICB0aGlzLmVudmVsb3BlRm9sbG93ZXIuYWN0aXZhdGUodHJ1ZSk7XG4gICAgICAgIHRoaXMuYnlwYXNzID0gcHJvcGVydGllcy5ieXBhc3MgfHwgZmFsc2U7XG4gICAgfTtcbiAgICBUdW5hLnByb3RvdHlwZS5XYWhXYWgucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlciwge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICB2YWx1ZTogXCJXYWhXYWhcIlxuICAgICAgICB9LFxuICAgICAgICBkZWZhdWx0czoge1xuICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgIGF1dG9tb2RlOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEJPT0xFQU5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJhc2VGcmVxdWVuY3k6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAuNSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDEsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGV4Y3Vyc2lvbk9jdGF2ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDIsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMSxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiA2LFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzd2VlcDoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC4yLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVzb25hbmNlOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxMCxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAxLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2Vuc2l0aXZpdHk6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAuNSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhY3RpdmF0ZUNhbGxiYWNrOiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF1dG9tb2RlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGF1dG9tb2RlOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdXRvbW9kZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXV0b21vZGUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZU5vZGUuY29ubmVjdCh0aGlzLmVudmVsb3BlRm9sbG93ZXIuaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVudmVsb3BlRm9sbG93ZXIuYWN0aXZhdGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbnZlbG9wZUZvbGxvd2VyLmFjdGl2YXRlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZU5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2YXRlTm9kZS5jb25uZWN0KHRoaXMuZmlsdGVyQnApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZmlsdGVyRnJlcVRpbWVvdXQ6IHtcbiAgICAgICAgICAgIHZhbHVlOiAwXG4gICAgICAgIH0sXG4gICAgICAgIHNldEZpbHRlckZyZXE6IHtcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbHRlckJwLmZyZXF1ZW5jeS52YWx1ZSA9IHRoaXMuX2Jhc2VGcmVxdWVuY3kgKyB0aGlzLl9leGN1cnNpb25GcmVxdWVuY3kgKiB0aGlzLl9zd2VlcDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maWx0ZXJQZWFraW5nLmZyZXF1ZW5jeS52YWx1ZSA9IHRoaXMuX2Jhc2VGcmVxdWVuY3kgKyB0aGlzLl9leGN1cnNpb25GcmVxdWVuY3kgKiB0aGlzLl9zd2VlcDtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmZpbHRlckZyZXFUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICAgICAgLy9wdXQgb24gdGhlIG5leHQgY3ljbGUgdG8gbGV0IGFsbCBpbml0IHByb3BlcnRpZXMgYmUgc2V0XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyRnJlcVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRGaWx0ZXJGcmVxKCk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzd2VlcDoge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N3ZWVwLnZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zd2VlcCA9IE1hdGgucG93KHZhbHVlID4gMSA/IDEgOiB2YWx1ZSA8XG4gICAgICAgICAgICAgICAgICAgIDAgPyAwIDpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NlbnNpdGl2aXR5KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEZpbHRlckZyZXEoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYmFzZUZyZXF1ZW5jeToge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2Jhc2VGcmVxdWVuY3k7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2Jhc2VGcmVxdWVuY3kgPSA1MCAqIE1hdGgucG93KDEwLCB2YWx1ZSAqXG4gICAgICAgICAgICAgICAgICAgIDIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2V4Y3Vyc2lvbkZyZXF1ZW5jeSA9IE1hdGgubWluKHVzZXJDb250ZXh0XG4gICAgICAgICAgICAgICAgICAgIC5zYW1wbGVSYXRlIC9cbiAgICAgICAgICAgICAgICAgICAgMixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iYXNlRnJlcXVlbmN5ICogTWF0aC5wb3coMiwgdGhpcy5fZXhjdXJzaW9uT2N0YXZlcylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0RmlsdGVyRnJlcSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBleGN1cnNpb25PY3RhdmVzOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZXhjdXJzaW9uT2N0YXZlcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXhjdXJzaW9uT2N0YXZlcyA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX2V4Y3Vyc2lvbkZyZXF1ZW5jeSA9IE1hdGgubWluKHVzZXJDb250ZXh0XG4gICAgICAgICAgICAgICAgICAgIC5zYW1wbGVSYXRlIC9cbiAgICAgICAgICAgICAgICAgICAgMixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iYXNlRnJlcXVlbmN5ICogTWF0aC5wb3coMiwgdGhpcy5fZXhjdXJzaW9uT2N0YXZlcylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0RmlsdGVyRnJlcSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZW5zaXRpdml0eToge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NlbnNpdGl2aXR5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZW5zaXRpdml0eSA9IE1hdGgucG93KDEwLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlc29uYW5jZToge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Jlc29uYW5jZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVzb25hbmNlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXJQZWFraW5nLlEgPSB0aGlzLl9yZXNvbmFuY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGluaXQ6IHtcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm91dHB1dC5nYWluLnZhbHVlID0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbHRlclBlYWtpbmcudHlwZSA9IFwicGVha2luZ1wiO1xuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyQnAudHlwZSA9IFwiYmFuZHBhc3NcIjtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbHRlclBlYWtpbmcuZnJlcXVlbmN5LnZhbHVlID0gMTAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyUGVha2luZy5nYWluLnZhbHVlID0gMjA7XG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXJQZWFraW5nLlEudmFsdWUgPSA1O1xuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyQnAuZnJlcXVlbmN5LnZhbHVlID0gMTAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyQnAuUS52YWx1ZSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIFR1bmEucHJvdG90eXBlLkVudmVsb3BlRm9sbG93ZXIgPSBmdW5jdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmICghcHJvcGVydGllcykge1xuICAgICAgICAgICAgcHJvcGVydGllcyA9IHRoaXMuZ2V0RGVmYXVsdHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlucHV0ID0gdXNlckNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmpzTm9kZSA9IHRoaXMub3V0cHV0ID0gdXNlckNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKFxuICAgICAgICAgICAgdGhpcy5idWZmZXJzaXplLFxuICAgICAgICAgICAgMSwgMSk7XG5cbiAgICAgICAgdGhpcy5pbnB1dC5jb25uZWN0KHRoaXMub3V0cHV0KTtcblxuICAgICAgICB0aGlzLmF0dGFja1RpbWUgPSBpbml0VmFsdWUocHJvcGVydGllcy5hdHRhY2tUaW1lLCB0aGlzLmRlZmF1bHRzXG4gICAgICAgICAgICAuYXR0YWNrVGltZVxuICAgICAgICAgICAgLnZhbHVlKTtcbiAgICAgICAgdGhpcy5yZWxlYXNlVGltZSA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLnJlbGVhc2VUaW1lLCB0aGlzLmRlZmF1bHRzXG4gICAgICAgICAgICAucmVsZWFzZVRpbWVcbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMuX2VudmVsb3BlID0gMDtcbiAgICAgICAgdGhpcy50YXJnZXQgPSBwcm9wZXJ0aWVzLnRhcmdldCB8fCB7fTtcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IHByb3BlcnRpZXMuY2FsbGJhY2sgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICB9O1xuICAgIFR1bmEucHJvdG90eXBlLkVudmVsb3BlRm9sbG93ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlciwge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICB2YWx1ZTogXCJFbnZlbG9wZUZvbGxvd2VyXCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgYXR0YWNrVGltZToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMC4wMDMsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAwLjUsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlbGVhc2VUaW1lOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLjUsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAwLjUsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGJ1ZmZlcnNpemU6IHtcbiAgICAgICAgICAgIHZhbHVlOiAyNTZcbiAgICAgICAgfSxcbiAgICAgICAgZW52ZWxvcGU6IHtcbiAgICAgICAgICAgIHZhbHVlOiAwXG4gICAgICAgIH0sXG4gICAgICAgIHNhbXBsZVJhdGU6IHtcbiAgICAgICAgICAgIHZhbHVlOiA0NDEwMFxuICAgICAgICB9LFxuICAgICAgICBhdHRhY2tUaW1lOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYXR0YWNrVGltZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0YWNrVGltZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dGFja0MgPSBNYXRoLmV4cCgtMSAvIHRoaXMuX2F0dGFja1RpbWUgKlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNhbXBsZVJhdGUgL1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlcnNpemUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZWxlYXNlVGltZToge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlbGVhc2VUaW1lO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWxlYXNlVGltZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbGVhc2VDID0gTWF0aC5leHAoLTEgLyB0aGlzLl9yZWxlYXNlVGltZSAqXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2FtcGxlUmF0ZSAvXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyc2l6ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jYWxsYmFjaztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcInR1bmEuanM6IFwiICsgdGhpcy5uYW1lICtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiOiBDYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24hXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFyZ2V0OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl90YXJnZXQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhcmdldCA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhY3RpdmF0ZToge1xuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKGRvQWN0aXZhdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFjdGl2YXRlZCA9IGRvQWN0aXZhdGU7XG4gICAgICAgICAgICAgICAgaWYgKGRvQWN0aXZhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5qc05vZGUuY29ubmVjdCh1c2VyQ29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuanNOb2RlLm9uYXVkaW9wcm9jZXNzID0gdGhpcy5yZXR1cm5Db21wdXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5qc05vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmpzTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZXR1cm5Db21wdXRlOiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY29tcHV0ZShldmVudCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY29tcHV0ZToge1xuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gZXZlbnQuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMClcbiAgICAgICAgICAgICAgICAgICAgLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbHMgPSBldmVudC5pbnB1dEJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50LCBjaGFuLCBybXMsIGk7XG4gICAgICAgICAgICAgICAgY2hhbiA9IHJtcyA9IGkgPSAwO1xuICAgICAgICAgICAgICAgIGlmIChjaGFubmVscyA+IDEpIHsgLy9uZWVkIHRvIG1peGRvd25cbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvdW50OyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoOyBjaGFuIDwgY2hhbm5lbHM7ICsrY2hhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBldmVudC5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YShjaGFuKVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBybXMgKz0gKGN1cnJlbnQgKiBjdXJyZW50KSAvIGNoYW5uZWxzO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvdW50OyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBldmVudC5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJtcyArPSAoY3VycmVudCAqIGN1cnJlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJtcyA9IE1hdGguc3FydChybXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2VudmVsb3BlIDwgcm1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VudmVsb3BlICo9IHRoaXMuX2F0dGFja0M7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VudmVsb3BlICs9ICgxIC0gdGhpcy5fYXR0YWNrQykgKiBybXM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZW52ZWxvcGUgKj0gdGhpcy5fcmVsZWFzZUM7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VudmVsb3BlICs9ICgxIC0gdGhpcy5fcmVsZWFzZUMpICpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJtcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2sodGhpcy5fdGFyZ2V0LCB0aGlzLl9lbnZlbG9wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIFR1bmEucHJvdG90eXBlLkxGTyA9IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtcbiAgICAgICAgLy9JbnN0YW50aWF0ZSBBdWRpb05vZGVcbiAgICAgICAgdGhpcy5vdXRwdXQgPSB1c2VyQ29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoMjU2LCAxLCAxKTtcbiAgICAgICAgdGhpcy5hY3RpdmF0ZU5vZGUgPSB1c2VyQ29udGV4dC5kZXN0aW5hdGlvbjtcblxuICAgICAgICAvL1NldCBQcm9wZXJ0aWVzXG4gICAgICAgIHRoaXMuZnJlcXVlbmN5ID0gaW5pdFZhbHVlKHByb3BlcnRpZXMuZnJlcXVlbmN5LCB0aGlzLmRlZmF1bHRzLmZyZXF1ZW5jeVxuICAgICAgICAgICAgLnZhbHVlKTtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSBpbml0VmFsdWUocHJvcGVydGllcy5vZmZzZXQsIHRoaXMuZGVmYXVsdHMub2Zmc2V0LnZhbHVlKTtcbiAgICAgICAgdGhpcy5vc2NpbGxhdGlvbiA9IGluaXRWYWx1ZShwcm9wZXJ0aWVzLm9zY2lsbGF0aW9uLCB0aGlzLmRlZmF1bHRzXG4gICAgICAgICAgICAub3NjaWxsYXRpb25cbiAgICAgICAgICAgIC52YWx1ZSk7XG4gICAgICAgIHRoaXMucGhhc2UgPSBpbml0VmFsdWUocHJvcGVydGllcy5waGFzZSwgdGhpcy5kZWZhdWx0cy5waGFzZS52YWx1ZSk7XG4gICAgICAgIHRoaXMudGFyZ2V0ID0gcHJvcGVydGllcy50YXJnZXQgfHwge307XG4gICAgICAgIHRoaXMub3V0cHV0Lm9uYXVkaW9wcm9jZXNzID0gdGhpcy5jYWxsYmFjayhwcm9wZXJ0aWVzLmNhbGxiYWNrIHx8XG4gICAgICAgICAgICBmdW5jdGlvbigpIHt9KTtcbiAgICAgICAgdGhpcy5ieXBhc3MgPSBwcm9wZXJ0aWVzLmJ5cGFzcyB8fCBmYWxzZTtcbiAgICB9O1xuICAgIFR1bmEucHJvdG90eXBlLkxGTy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN1cGVyLCB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIHZhbHVlOiBcIkxGT1wiXG4gICAgICAgIH0sXG4gICAgICAgIGJ1ZmZlclNpemU6IHtcbiAgICAgICAgICAgIHZhbHVlOiAyNTZcbiAgICAgICAgfSxcbiAgICAgICAgc2FtcGxlUmF0ZToge1xuICAgICAgICAgICAgdmFsdWU6IDQ0MTAwXG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgIGZyZXF1ZW5jeToge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDIwLFxuICAgICAgICAgICAgICAgICAgICBhdXRvbWF0YWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IEZMT0FUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAuODUsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAyMjA0OSxcbiAgICAgICAgICAgICAgICAgICAgYXV0b21hdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBGTE9BVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3NjaWxsYXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAuMyxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAtMjIwNTAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMjIwNTAsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBoYXNlOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMiAqIE1hdGguUEksXG4gICAgICAgICAgICAgICAgICAgIGF1dG9tYXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogRkxPQVRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZyZXF1ZW5jeToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZnJlcXVlbmN5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9mcmVxdWVuY3kgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLl9waGFzZUluYyA9IDIgKiBNYXRoLlBJICogdGhpcy5fZnJlcXVlbmN5ICpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWZmZXJTaXplIC9cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zYW1wbGVSYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvZmZzZXQ6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb2Zmc2V0ID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9zY2lsbGF0aW9uOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9vc2NpbGxhdGlvbjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb3NjaWxsYXRpb24gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcGhhc2U6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BoYXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9waGFzZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YXJnZXQ6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RhcmdldDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFyZ2V0ID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGFjdGl2YXRlOiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oZG9BY3RpdmF0ZSkge1xuICAgICAgICAgICAgICAgIGlmICghZG9BY3RpdmF0ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm91dHB1dC5kaXNjb25uZWN0KHVzZXJDb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm91dHB1dC5jb25uZWN0KHVzZXJDb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9waGFzZSArPSB0aGF0Ll9waGFzZUluYztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuX3BoYXNlID4gMiAqIE1hdGguUEkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX3BoYXNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh0aGF0Ll90YXJnZXQsIHRoYXQuX29mZnNldCArXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9vc2NpbGxhdGlvbiAqXG4gICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnNpbih0aGF0Ll9waGFzZSkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIFR1bmEudG9TdHJpbmcgPSBUdW5hLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXCJQbGVhc2UgdmlzaXQgaHR0cHM6Ly9naXRodWIuY29tL1RoZW9kZXVzL3R1bmEvd2lraSBmb3IgaW5zdHJ1Y3Rpb25zIG9uIGhvdyB0byB1c2UgVHVuYS5qc1wiO1xuICAgIH07XG59KSh0aGlzKTtcbiIsInZhciBmdWxsSG91c2UgPSByZXF1aXJlKCdmdWxsLWhvdXNlJylcbi8vIHZhciBpbWdzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW1nJyk7XG4vLyBmb3IgKHZhciBpID0gaW1ncy5sZW5ndGg7IGkgPj0gMDsgaS0tKSB7XG4vLyAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbWdzW01hdGgucmFuZG9tKCkgKiBpIHwgMF0pO1xuLy8gfVxuZnVsbEhvdXNlKGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbWcnKSlcbnZhciBUdW5hID0gcmVxdWlyZSgndHVuYWpzJylcblxudmFyIFNhbXBsZVBsYXllciA9IHJlcXVpcmUoJ0Bjb2xld3cvb3Blbm11c2ljLXNhbXBsZS1wbGF5ZXInKVxudmFyIGxvYWRTYW1wbGUyQnVmZiA9IHJlcXVpcmUoJ2xvYWQtc2FtcGxlLTItYnVmZicpXG5cbnZhciBhYyA9IG5ldyBBdWRpb0NvbnRleHQoKVxudmFyIHR1bmEgPSBuZXcgVHVuYShhYyk7XG52YXIgZGVsYXkgPSBuZXcgdHVuYS5EZWxheSh7XG4gICAgZmVlZGJhY2s6IDAuNjUsICAgIC8vMCB0byAxK1xuICAgIGRlbGF5VGltZTogMTUsICAgIC8vaG93IG1hbnkgbWlsbGlzZWNvbmRzIHNob3VsZCB0aGUgd2V0IHNpZ25hbCBiZSBkZWxheWVkP1xuICAgIHdldExldmVsOiAwLjc1LCAgICAvLzAgdG8gMStcbiAgICBkcnlMZXZlbDogMC4yNSwgICAgICAgLy8wIHRvIDErXG4gICAgY3V0b2ZmOiAxMjUwLCAgICAgIC8vY3V0b2ZmIGZyZXF1ZW5jeSBvZiB0aGUgYnVpbHQgaW4gbG93cGFzcy1maWx0ZXIuIDIwIHRvIDIwMDUwXG4gICAgYnlwYXNzOiAwXG59KTtcblxudmFyIGRlbGF5MiA9IG5ldyB0dW5hLkRlbGF5KHtcbiAgICBmZWVkYmFjazogMC42NSwgICAgLy8wIHRvIDErXG4gICAgZGVsYXlUaW1lOiA3NSwgICAgLy9ob3cgbWFueSBtaWxsaXNlY29uZHMgc2hvdWxkIHRoZSB3ZXQgc2lnbmFsIGJlIGRlbGF5ZWQ/XG4gICAgd2V0TGV2ZWw6IDAuNSwgICAgLy8wIHRvIDErXG4gICAgZHJ5TGV2ZWw6IDAuMjUsICAgICAgIC8vMCB0byAxK1xuICAgIGN1dG9mZjogNTAwLCAgICAgIC8vY3V0b2ZmIGZyZXF1ZW5jeSBvZiB0aGUgYnVpbHQgaW4gbG93cGFzcy1maWx0ZXIuIDIwIHRvIDIwMDUwXG4gICAgYnlwYXNzOiAwXG59KTtcblxudmFyIGQxcGxheWVyID0gU2FtcGxlUGxheWVyKGFjKVxuZDFwbGF5ZXIuY29ubmVjdChkZWxheSlcbi8vIGRlbGF5LmNvbm5lY3QoYWMuZGVzdGluYXRpb24pXG5cbmxvYWRTYW1wbGUyQnVmZihhYywgJy4vZDEud2F2JywgZnVuY3Rpb24oYnVmZmVyKXtcbiAgZDFwbGF5ZXIuYnVmZmVyID0gYnVmZmVyXG59KVxuXG52YXIgZDJwbGF5ZXIgPSBTYW1wbGVQbGF5ZXIoYWMpXG5kMnBsYXllci5jb25uZWN0KGRlbGF5KVxuXG5kZWxheS5jb25uZWN0KGRlbGF5MilcbmRlbGF5Mi5jb25uZWN0KGFjLmRlc3RpbmF0aW9uKVxuXG5sb2FkU2FtcGxlMkJ1ZmYoYWMsICcuL2QyLndhdicsIGZ1bmN0aW9uKGJ1ZmZlcil7XG4gIGQycGxheWVyLmJ1ZmZlciA9IGJ1ZmZlclxufSlcblxuXG52YXIgZGVsYXkzID0gbmV3IHR1bmEuRGVsYXkoe1xuICAgIGZlZWRiYWNrOiAwLjc1LCAgICAvLzAgdG8gMStcbiAgICBkZWxheVRpbWU6IDI1LCAgICAvL2hvdyBtYW55IG1pbGxpc2Vjb25kcyBzaG91bGQgdGhlIHdldCBzaWduYWwgYmUgZGVsYXllZD9cbiAgICB3ZXRMZXZlbDogMC43NSwgICAgLy8wIHRvIDErXG4gICAgZHJ5TGV2ZWw6IDAuNSwgICAgICAgLy8wIHRvIDErXG4gICAgY3V0b2ZmOiA3MDAsICAgICAgLy9jdXRvZmYgZnJlcXVlbmN5IG9mIHRoZSBidWlsdCBpbiBsb3dwYXNzLWZpbHRlci4gMjAgdG8gMjAwNTBcbiAgICBieXBhc3M6IDBcbn0pO1xudmFyIGQzcGxheWVyID0gU2FtcGxlUGxheWVyKGFjKVxuZDNwbGF5ZXIuY29ubmVjdChkZWxheTMpXG5kZWxheTMuY29ubmVjdChkZWxheTIpXG5cbnZhciBnID0gIGFjLmNyZWF0ZUdhaW4oKTtcblxuZGVsYXkzLmNvbm5lY3QoZylcblxuZGVsYXkuY29ubmVjdChnKVxuXG5kZWxheTIuY29ubmVjdChnKVxuZy5jb25uZWN0KGFjLmRlc3RpbmF0aW9uKVxuZy5nYWluLnNldFZhbHVlQXRUaW1lKDAsIGFjLmN1cnJlbnRUaW1lKVxuXG5sb2FkU2FtcGxlMkJ1ZmYoYWMsICcuL2QzLndhdicsIGZ1bmN0aW9uKGJ1ZmZlcil7XG4gIGQzcGxheWVyLmJ1ZmZlciA9IGJ1ZmZlclxufSlcblxuZnVuY3Rpb24gcmFuZG9tKCl7XG4gIHJldHVybiAoTWF0aC5yYW5kb20oKSAqIDIwKSAtIDEwXG59XG5cbnZhciBkb2xwaGluX2luZGV4ID0gMFxudmFyIGRvbmUgPSBmYWxzZVxuZnVuY3Rpb24gZG9scGgoKXtcbiAgaWYgKCFkb25lKSAoZG9uZSA9IHRydWUpICYmIGcuZ2Fpbi5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSgwLjksIGFjLmN1cnJlbnRUaW1lICsgMTcpXG5cbiAgZG9scGhpbl9pbmRleCA9PSAzID8gZDJwbGF5ZXIuc3RhcnQoMCkgOiBkMXBsYXllci5zdGFydCgwKVxuICBkb2xwaGluX2luZGV4KytcbiAgaWYoZG9scGhpbl9pbmRleCA+IDMpIGRvbHBoaW5faW5kZXggPSAwXG4gIGlmIChNYXRoLnJhbmRvbSgpIDwgMC4zKSBkM3BsYXllci5zdGFydCgwKVxuICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgIGRvbHBoKClcblxuICB9LCA1MDAgKyBNYXRoLnJhbmRvbSgpICogMzAwMClcbn1cblxuLy8gWlpPTUcgQ0FST1VTRUxcbnZhciBpID0gMVxuXG5mdW5jdGlvbiBjeWNsZSgpe1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbWc6bnRoLWNoaWxkKCcrIGkgKycpJykuc3R5bGUub3BhY2l0eSA9IDBcbiAgLy8gaWYgKGkgPiAyKSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbWc6bnRoLWNoaWxkKCcrIChpIC0gMSkgKycpJykuc3R5bGUub3BhY2l0eSA9IDAuM1xuICBpID0gfn4oTWF0aC5yYW5kb20oKSAqIDE5KSArIDFcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaW1nOm50aC1jaGlsZCgnKyBpICsnKScpLnN0eWxlLm9wYWNpdHkgPSAwLjk1XG4gIC8vIGlmKGkgPCA0MCkgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaW1nOm50aC1jaGlsZCgnKyAoaSArIDEpICsnKScpLnN0eWxlLm9wYWNpdHkgPSAwLjNcbiAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICBjeWNsZSgpXG4gIH0sIDI1MCArIE1hdGgucmFuZG9tKCkgKiAyNTAwKVxufVxuXG52YXIgaiA9IDEwXG5cbmZ1bmN0aW9uIGRvdWJsZUl0KCl7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2ltZzpudGgtY2hpbGQoJysgaiArJyknKS5zdHlsZS5vcGFjaXR5ID0gMFxuICAvLyBpZiAoaSA+IDIpIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2ltZzpudGgtY2hpbGQoJysgKGkgLSAxKSArJyknKS5zdHlsZS5vcGFjaXR5ID0gMC4zXG4gIGlmKCsraiA+IDIwKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaW1nOm50aC1jaGlsZCgnKyBqICsnKScpLnN0eWxlLm9wYWNpdHkgPSAwXG4gICAgaiA9IDFcbiAgfVxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbWc6bnRoLWNoaWxkKCcrIGogKycpJykuc3R5bGUub3BhY2l0eSA9IDAuNVxuICAvLyBpZihpIDwgNDApIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2ltZzpudGgtY2hpbGQoJysgKGkgKyAxKSArJyknKS5zdHlsZS5vcGFjaXR5ID0gMC4zXG4gIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgZG91YmxlSXQoKVxuICB9LCAzNTAgKyBNYXRoLnJhbmRvbSgpICogMTUwKVxufVxuXG53aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpe1xuICBkb3VibGVJdCgpXG59LCAxMDEwMylcblxudmFyIGsgPSAxNVxuXG5mdW5jdGlvbiB0cmlwbGVJdCgpe1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbWc6bnRoLWNoaWxkKCcrIGsgKycpJykuc3R5bGUub3BhY2l0eSA9IDBcbiAgLy8gaWYgKGkgPiAyKSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbWc6bnRoLWNoaWxkKCcrIChpIC0gMSkgKycpJykuc3R5bGUub3BhY2l0eSA9IDAuM1xuICBpZigrK2sgPiAyMCkge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2ltZzpudGgtY2hpbGQoJysgayArJyknKS5zdHlsZS5vcGFjaXR5ID0gMFxuICAgIGsgPSAxXG4gIH1cbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaW1nOm50aC1jaGlsZCgnKyBrICsnKScpLnN0eWxlLm9wYWNpdHkgPSAwLjQ1XG4gIC8vIGlmKGkgPCA0MCkgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaW1nOm50aC1jaGlsZCgnKyAoaSArIDEpICsnKScpLnN0eWxlLm9wYWNpdHkgPSAwLjNcbiAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICB0cmlwbGVJdCgpXG4gIH0sIDE1MCArIE1hdGgucmFuZG9tKCkgKiAzNTApXG59XG5cbndpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gIHRyaXBsZUl0KClcbn0sIDIwNzAwKVxuXG5cbndpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2gxJykuc3R5bGUub3BhY2l0eSA9IDBcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaDMnKS5zdHlsZS5vcGFjaXR5ID0gMFxuICBjeWNsZSgpXG4gIGRvbHBoKClcblxuXG59LCAzMDAwKVxuXG5cblxudmFyIHRvZ2dseSA9IHRydWVcbndpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoMScpLnN0eWxlLm9wYWNpdHkgPSB0b2dnbHkgPyAwIDogMC43NVxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoMScpLnN0eWxlLnRvcCA9ICAofn4oTWF0aC5yYW5kb20oKSAqIDc1MCkgKyAyNSkgKyAncHgnXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2gxJykuc3R5bGUubGVmdCA9ICh+fihNYXRoLnJhbmRvbSgpICogNzUwKSArIDI1KSArICdweCdcbiAgdG9nZ2x5ID0gIXRvZ2dseVxufSwgNzAwMClcblxudmFyIGRlY3JlYXNlID0gZmFsc2VcbnZhciBuZXJmID0gZmFsc2VcblxudmFyIGNvdW50ZXIgPSAwXG5cbndpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICBjb3VudGVyKytcbiAgbmVyZiA9ICAoY291bnRlciA+IDI1KVxuICBkZWNyZWFzZSA9IChjb3VudGVyID4gNTApXG4gIGNvbnNvbGUubG9nKFwiSU5DUkVBU0lOR1wiLCBkZWxheS5kZWxheVRpbWUudmFsdWUsIGRlbGF5Mi5kZWxheVRpbWUudmFsdWUsIGRlbGF5My5kZWxheVRpbWUudmFsdWUsIGcuZ2Fpbi52YWx1ZSlcbiAgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXkuZGVsYXlUaW1lLnZhbHVlICogMS43NVxuICBkZWxheTMuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXkzLmRlbGF5VGltZS52YWx1ZSAqIDEuODVcbiAgZGVsYXkyLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5Mi5kZWxheVRpbWUudmFsdWUgKiAxLjVcbiAgaWYgKG5lcmYpIHtcblxuICAgIGRlbGF5LmRyeUxldmVsLnZhbHVlID0gZGVsYXkuZHJ5TGV2ZWwudmFsdWUgKiAwLjg1XG4gICAgZGVsYXkzLmRyeUxldmVsLnZhbHVlID0gZGVsYXkzLmRyeUxldmVsLnZhbHVlICogMC44NVxuICAgIGRlbGF5Mi5kcnlMZXZlbC52YWx1ZSA9IGRlbGF5Mi5kcnlMZXZlbC52YWx1ZSAqIDAuODVcbiAgfVxuICBpZiAoZGVjcmVhc2Upe1xuICAgIGRlbGF5LmN1dG9mZi52YWx1ZSA9IGRlbGF5LmN1dG9mZi52YWx1ZSAqIDAuODVcbiAgICBkZWxheTMuY3V0b2ZmLnZhbHVlID0gZGVsYXkzLmN1dG9mZi52YWx1ZSAqIDAuODVcbiAgICBkZWxheTIuY3V0b2ZmLnZhbHVlID0gZGVsYXkyLmN1dG9mZi52YWx1ZSAqIDAuODVcbiAgICBnLmdhaW4udmFsdWUgPSBnLmdhaW4udmFsdWUgKiAwLjk1XG4gIH1cbn0sIDUwMDApIl19
