var TweenDeck = (function () {

	var slides,
		timeline = new TimelineMax({paused:true}),
		positions = [],
		positionIndex = 0,
		timeScale = 0,
		pauseAtStart = true,
		i,j,k;

	function init(slides, tweens) {
		if (slides.length === 0) {
			console.dir(slides);
			throw 'TweenDeck Error: Bad selector. No slides found.';
		}
		
		document.documentElement.className += ' tweendeck-on';

		TweenMax.set(slides[0],{css:{'display':'flex'}});

		for (i = 0; i < slides.length; i++) {
			var slide = slides[i];
			
			var tweenElements = slide.querySelectorAll('[data-tween]'),
				intro = new TimelineMax(),
				trans = [],
				outro = new TimelineMax();

			for (j=0; j<tweenElements.length; j++) {
				var el = tweenElements[j];
				if (el.dataset.tween == 'remove') {
					el.parentNode.removeChild(el);
				} else {
					var elTweens = el.dataset.tween.split(',');
					for (k=0; k<elTweens.length; k++) {
						var elTween = elTweens[k];
						if (elTween.length !== 0) {
							var tweenProps = elTween.split(':');
							tweenProps = tweenProps.map(function (p) {
								return p.trim();
							});
							if (tweenProps[0] == 'css') {
								var cssProp = {};
								cssProp[tweenProps[1]] = tweenProps[2];
								TweenMax.set(el,{css:cssProp});
							} else {
								var tweenPos = tweenProps[0];
								
								var tweenData = {
									el: el,
									type: tweenProps[1],
									dur: typeof tweenProps[2] == 'undefined' ? 0 : parseFloat(tweenProps[2]),
									delay: typeof tweenProps[3] == 'undefined' ? 0 : parseFloat(tweenProps[3]),
									params: tweenProps.slice(4)
								};
								
								if (tweenPos == 'intro') {
									if (i === 0) {
										pauseAtStart = false;
									}
									intro.add(getTweenFromData(tweenData),0);
								} else if (tweenPos == 'outro') {
									outro.add(getTweenFromData(tweenData),0);
								} else {
									if (typeof trans[tweenPos] == 'undefined') {
										trans[tweenPos] = new TimelineMax();
									}
									trans[tweenPos].add(getTweenFromData(tweenData),0);
								}
							}
						}
					}
				}
			}

			if (i > 0) {
				var onStartComplete = function() {};
				if (intro.getChildren().length) {
					onStartComplete = function() { tweenTo(positionIndex+1); };
				}
				timeline.add(TweenMax.to(slide,0.01,{css:{'display':'flex'},
					onComplete: onStartComplete,
					onReverseComplete:function() {
						tweenTo(positionIndex-1);
					}
				}));
			}

			if (intro.getChildren().length) {
				intro.eventCallback('onReverseComplete', function() {
					tweenTo(positionIndex-1);
				});
				timeline.add(intro);
			}

			for (j=0; j<trans.length; j++) {
				if (typeof trans[j] != 'undefined') {
					timeline.add(trans[j]);
				} else {
					throw 'TweenDeck Error: Slide '+i+' transition at '+j+' is undefined. Slide text content is '+ slides[i].innerText;
				}
			}

			if (outro.getChildren().length) {
				outro.eventCallback('onComplete', function() {
					tweenTo(positionIndex+1);
				});
				timeline.add(outro);
			}

			if (i != slides.length) {
				var onOutroReverseComplete = function() {};
				if (outro.getChildren().length) {
					onOutroReverseComplete = function() { tweenTo(positionIndex-1); };
				}
				timeline.add(TweenMax.to(slide,0.01,{css:{'display':'none'},
					onComplete:function() {
						tweenTo(positionIndex+1);
					},
					onReverseComplete:onOutroReverseComplete
				}));
			}
		}

		var animations = timeline.getChildren(false);
		for (i=0; i<animations.length; i++) {
			positions.push(animations[i].startTime());
		}
		positions.push(timeline._totalDuration);

		if (!pauseAtStart) {
			tweenTo(1);
		}

		document.addEventListener('keydown', function(e) {
			// down/right arrow, pagedown, space = play forward
			if ((e.keyCode === 34 || e.keyCode === 39 || e.keyCode === 32 || e.keyCode === 40) && positionIndex < positions.length) {
				tweenTo(positionIndex+1);
			}
			// up/left arrow, pageup = rewind
			else if ((e.keyCode === 33 || e.keyCode === 37 || e.keyCode === 38) && positionIndex > 0) {
				tweenTo(positionIndex-1);
			}
		});

		document.addEventListener('touchstart', handleTouchStart, false);
		document.addEventListener('touchmove', handleTouchMove, false);

		var startXY = null;

		function handleTouchStart(e) {
			startXY = getXY(e);
		}

		function handleTouchMove(e) {
			if (!startXY) {
				return;
			}

			var moveXY = getXY(e),
				xDiff = moveXY.x - startXY.x,
				yDiff = moveXY.y - startXY.y;

			if (Math.abs(xDiff) > 5 && Math.abs(xDiff) > Math.abs(yDiff)) {
				if (xDiff > 0) {
					tweenTo(positionIndex-1); // left
				} else {
					tweenTo(positionIndex+1); // right
				}
			}
			startXY = null;
		}

		function getXY(e) {
			var touchEvent = {pageX: 0, pageY: 0};

			if (typeof e.changedTouches !== 'undefined') {
				touchEvent = e.changedTouches[0];
			} else if (typeof e.originalEvent !== 'undefined' &&
				typeof e.originalEvent.changedTouches !== 'undefined') {
				touchEvent = e.originalEvent.changedTouches[0];
			}

			return {
				x:e.offsetX || e.layerX || touchEvent.pageX,
				y:e.offsetY || e.layerY || touchEvent.pageY
			};
		}
	}

	function getTweenFromData(tweenData) {
		if (typeof tweenData == 'undefined') {
			throw 'TweenDeck Error: tweenData is not defined';
		} else if (typeof tweenData.type == 'undefined') {
			console.dir(tweenData);
			var findElMessage = '';
			if (typeof tweenData.el != 'undefined' && tweenData.el.innerText.length !== 0) {
				findElMessage = ' for data-tween element with text content: '+tweenData.el.innerText;
			}
			throw 'TweenDeck Error: Tween type is not defined'+findElMessage;
		} else if (tweenData.type == 'backgroundColor') {
			return TweenMax.to(document.body, tweenData.dur, {delay:tweenData.delay, backgroundColor:tweenData.params[0]});
		} else if (typeof tweens[tweenData.type] != 'function') {
			throw 'TweenDeck Error: Tween type ' + tweenData.type + ' not found for tween data '+tweenData.el.dataset.tween+' with text content: '+tweenData.el.innerText;
		} else {
			return tweens[tweenData.type](tweenData.el, tweenData.dur, tweenData.delay, tweenData.params);
		}
	}

	// Move playhead to appropriate position (based on the index)
	function tweenTo(i) {

		timeScale++; //speed up if user keeps pushing the button.
		positionIndex = i;
		// Tween playhead to new position using a linear ease.
		TweenMax.to(timeline, Math.abs(positions[i] - timeline.time()), {time:positions[i], ease:Linear.easeNone, onComplete:function() {
				// Reset timeScale when tween is done
				timeScale = 0;
			}
		}).timeScale(timeScale);
	}

	return {
		init: function(slides, tweens) {
			init(slides, tweens);
		},
		prev: function(i) {
			tweenTo(positionIndex-1);
		},
		next: function(i) {
			tweenTo(positionIndex+1);
		}
	};
}());