//@module
/*
  Copyright 2011-2014 Marvell Semiconductor, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var scrollerSkin = exports.scrollerSkin = null;

var horizontalScrollbarTexture = exports.horizontalScrollbarTexture = (screenScale == 2) ? new Texture('assets/horizontalScrollbar.png', 1) : (screenScale == 1.5) ? new Texture('assets/horizontalScrollbar.png', 1) : new Texture('assets/horizontalScrollbar.png', 1);
var horizontalScrollbarSkin = exports.horizontalScrollbarSkin = new Skin({ texture: horizontalScrollbarTexture, width: 40, height: 10, tiles: { left:10, right:10 }, });
var horizontalScrollerShadowTexture = exports.horizontalScrollerShadowTexture = (screenScale == 2) ? new Texture('assets/horizontalScrollerShadow.png', 1) : (screenScale == 1.5) ? new Texture('assets/horizontalScrollerShadow.png', 1) : new Texture('assets/horizontalScrollerShadow.png', 1);
var leftScrollerShadowSkin = exports.leftScrollerShadowSkin = new Skin({ texture: horizontalScrollerShadowTexture, width: 20, height: 40, tiles: { top:0, bottom:0 }, });
var rightScrollerShadowSkin = exports.rightScrollerShadowSkin = new Skin({ texture: horizontalScrollerShadowTexture, x: 20, width: 20, height: 40, tiles: { top:0, bottom:0 }, });

var verticalScrollbarTexture = exports.verticalScrollbarTexture = (screenScale == 2) ? new Texture('assets/verticalScrollbar.png', 1) : (screenScale == 1.5) ? new Texture('assets/verticalScrollbar.png', 1) : new Texture('assets/verticalScrollbar.png', 1);
var verticalScrollbarSkin = exports.verticalScrollbarSkin = new Skin({ texture: verticalScrollbarTexture, width: 10, height: 40, tiles: { top:10, bottom:10 }, });
var verticalScrollerShadowTexture = exports.verticalScrollerShadowTexture = (screenScale == 2) ? new Texture('assets/verticalScrollerShadow.png', 1) : (screenScale == 1.5) ? new Texture('assets/verticalScrollerShadow.png', 1) : new Texture('assets/verticalScrollerShadow.png', 1);
var topScrollerShadowSkin = exports.topScrollerShadowSkin = new Skin({ texture: verticalScrollerShadowTexture, width: 40, height: 20, tiles: { left:0, right:0 }, });
var bottomScrollerShadowSkin = exports.bottomScrollerShadowSkin = new Skin({ texture: verticalScrollerShadowTexture, y: 20, width: 40, height: 20, tiles: { left:0, right:0 }, });


var easeOut = function(start, stop, fraction) {
	return start + Math.round((1 - Math.pow(1 - fraction, 2)) * (stop - start));
}

/*
	Note:  v0, v1, and duration should all be either positive or negative
	
	v0	:	initial velocity
	v1	:	terminating velocity
	k	:	coefficient of kinetic friction
*/
var scrollerMode = Object.create(Object.prototype, {
	absV1: { value: 0.005 },
	k: { value: 0.0015 },
	bind: { 
		value: function(behavior, scroller) {
			behavior.mode = this;
		}
	},
	computeDistance: {
		value: function(v0, v1, k) {
			return (v0 - v1) / k
		}
	},
	computeDuration: {
		value: function(v0, v1, k) {
			return Math.log(v0 / v1) / k
		}
	},
	computePrediction: { 
		value: function(behavior, coordinate) {
			var range = behavior.range;
			var size = behavior.size;
			range -= size;
			if (behavior.direction > 0) {
				coordinate += size;
			}
			else {
				coordinate -= size;
			}
			if (coordinate < 0)
				coordinate = 0;
			else if (coordinate > range)
				coordinate = range;
			return coordinate;
		}
	},
	evaluateBounceback: {
		value: function(v0, duration, time) {
			if (time >= duration)	
				return 0
			else if (time >= 0)		
				return v0 * time * Math.exp(-10.0 * time / duration)
			else 													
				return NaN											
		}
	},
	evaluatePositionAtTime: {
		value: function(v0, v1, k, t) {
			if (t >= this.computeDuration(v0, v1, k))
				return this.computeDistance(v0, v1, k)
			else if (t <= 0)					
				return 0
			else								
				return (1.0 - Math.exp(-k * t)) * v0 / k
		}
	},
	evaluateTimeAtPosition: {
		value: function(v0, v1, k, position) {
			var distance = this.computeDistance(v0, v1, k)
			if (Math.abs(position) > Math.abs(distance))
				return NaN
			else if (position == 0)								
				return NaN
			else												
				return - Math.log(1.0 - k * position / v0) / k
		}
	},
	evaluateVelocityAtTime: {
		value: function(v0, v1, k, time) {
			if (time >= this.computeDuration(v0, v1, k))
				return 0
			else if (time < 0)						
				return 0
			else								
				return Math.exp(-k * time) * v0
		}
	},
	onFinished: { 
		value: function(behavior, scroller) {
		}
	},
	onTimeChanged: { 
		value: function(behavior, scroller) {
		}
	},
	onTouchBegan: { 
		value: function(behavior, scroller, id, x, y, ticks) {
		}
	},
	onTouchCancelled: { 
		value: function(behavior, scroller, id, x, y, ticks) {
			scroller.scroll = scroller.constraint;
			scrollerStillMode.bind(behavior, scroller);
		}
	},
	onTouchEnded: { 
		value: function(behavior, scroller, id, x, y, ticks) {
		}
	},
	onTouchMoved: {
		value: function(behavior, scroller, id, x, y, ticks) {
		}
	},
	onTouchScrolled: {
		value: function(behavior, scroller, touched, dx, dy, ticks) {
		}
	},
});

var scrollerStillMode = Object.create(scrollerMode, {
	bind: { 
		value: function(behavior, scroller) {
			behavior.boost = 0.5;
			behavior.direction = 0;
			behavior.mode = this;
			behavior.bouncing = false;
			if (scroller.tracking) {
				scroller.tracking = false;
				scroller.distribute("onScrolled");
			}
		}
	},
	onTouchBegan: { 
		value: function(behavior, scroller, id, x, y, ticks) {
			if (scroller.running) {
				scroller.stop();
				behavior.scrollTo(scroller, behavior.stop);
			}
			behavior.anchor = behavior.selectParameter(x, y);
			behavior.antiAnchor = behavior.selectParameter(y, x);
			behavior.boost *= 2;
			behavior.first = behavior.last = { previous: null, coordinate: behavior.selectParameter(x, y), ticks: ticks };
			behavior.range = behavior.selectSize(scroller.first.size);
			behavior.size = behavior.selectSize(scroller.size);
			behavior.start = behavior.stop = behavior.selectPosition(scroller.scroll);
		}
	},
	onTouchMoved: { 
		value: function(behavior, scroller, id, x, y, ticks) {
			var delta = Math.abs(behavior.selectParameter(x, y) - behavior.anchor);
			var antiDelta = Math.abs(behavior.selectParameter(y, x) - behavior.antiAnchor);
			if ((delta > antiDelta) && (delta > 8)) {
				if (behavior.captureTouch(scroller, id, x, y, ticks)) {
					scroller.tracking = true;
					scrollerScrollMode.bind(behavior, scroller);
					scrollerScrollMode.onTouchMoved(behavior, scroller, id, x, y, ticks);
				}
			}
		}
	},
	onTouchScrolled: {
		value: function(behavior, scroller, touched, dx, dy, ticks) {
			var start = behavior.selectParameter(scroller.scroll.x, + scroller.scroll.y);
			var stop = behavior.selectParameter(scroller.constraint.x, + scroller.constraint.y);
			if (touched || ((dx || dy) && (start == stop) && !behavior.bouncing)) {
				if (scroller.running)
					scroller.stop();
				scroller.tracking = true;
				if (touched)
					behavior.bouncing = false;
				
				var delta = behavior.selectParameter(dx, dy);
				if (delta) {
					if (start != stop)
						delta = easeOut(delta, 0, Math.abs(stop - start) / scroller.height);
					behavior.scrollBy(scroller, delta);
				}
			}
			else if (!scroller.running && !behavior.bouncing) {
				behavior.bouncing = start != stop;
				behavior.start = start;
				behavior.stop = stop;
				scroller.time = 0;
				scroller.duration = 500;
				scroller.start();
			}
		}
	},
	onTimeChanged: { 
		value: function(behavior, scroller) {
			var fraction = scroller.fraction;
			behavior.scrollTo(scroller, easeOut(behavior.start, behavior.stop, fraction));
		}
	},
	onFinished: {
		value: function(behavior, scroller) {
			if (scroller.tracking) {
				scroller.tracking = false;
				scroller.distribute("onScrolled");
				behavior.scrollTo(scroller, behavior.stop);
			}
		}
	},
});

var scrollerScrollMode = Object.create(scrollerMode, {
	onTouchEnded: { 
		value: function(behavior, scroller, id, x, y, ticks) {
			this.onTouchMoved(behavior, scroller, id, x, y, ticks);
			scrollerTossMode.bind(behavior, scroller);
		}
	},
	onTouchMoved: { 
		value: function(behavior, scroller, id, x, y, ticks) {
			var points = behavior.peek(id);
			var c = points.length;
			for (var i = 0; i < c; i++) {
				var point = points[i];
				var coordinate = behavior.selectParameter(point.x, point.y);
				ticks = point.ticks;
				if (behavior.last.coordinate != coordinate) {
					var direction = (coordinate > behavior.last.coordinate) ? -1 : 1
					if (behavior.direction != direction) {
						behavior.boost = 1;
						behavior.direction = direction;
						behavior.first = { previous: null, coordinate: coordinate, ticks: ticks };
					}
                }
                behavior.last = { previous: behavior.last, coordinate: coordinate, ticks: ticks };
			}
			behavior.stop = behavior.start - behavior.last.coordinate + behavior.anchor;
			behavior.scrollTo(scroller, behavior.stop);
			//behavior.predictTo(scroller, this.computePrediction(behavior, behavior.stop));
		}
	},
});

var scrollerTossMode = Object.create(scrollerMode, {
	bind: { 
		value: function(behavior, scroller) {
			var speed = 0;
			var start = behavior.stop;
			var stop;
			if (scroller.loop)
				stop = start;
			else
				stop = behavior.selectPosition(scroller.constraint);
			if (start == stop) {
				var delta = 0;
				var duration = 60;
				var former = behavior.last;
				var coordinate = former.coordinate;
				var ticks = former.ticks - duration;
				var sample = behavior.first;
				if (ticks < sample.ticks) {
					delta = coordinate - sample.coordinate;
					speed = delta / (former.ticks - sample.ticks);
				}
				else {
					sample = former.previous;
					while (sample) {
						if (ticks >= sample.ticks) {
							delta = (coordinate - sample.coordinate) + ((former.coordinate - sample.coordinate) * (ticks - sample.ticks) / (former.ticks - sample.ticks))
							speed = delta / duration;
							break;
						}
						former = sample;
						sample = former.previous;
					}
				}
				if (Math.abs(delta) > 20)
					speed *= behavior.boost
				else
					speed = 0;
			}	
			if (speed) {
				behavior.mode = this;
				behavior.v0 = speed
				behavior.v1 = (speed < 0) ? -this.absV1 : this.absV1
				var scroll = start - this.computeDistance(behavior.v0, behavior.v1, this.k);
				var stop = behavior.snap(scroller, scroll, scroll - start);
				var duration;
				if (scroll != stop)
					duration = this.evaluateTimeAtPosition(behavior.v0, behavior.v1, this.k, start - stop);
				else
					duration = this.computeDuration(behavior.v0, behavior.v1, this.k);
				if (duration > 0) {
					behavior.start = start;
					behavior.stop = stop;
					behavior.time = 0;
					scroller.duration = duration;
					scroller.time = 0;
					scroller.start();
				}
				else {
					this.onFinished(behavior, scroller);
				}
			}
			else {
				this.onFinished(behavior, scroller);
			}
		}
	},
	onFinished: {
		value: function(behavior, scroller) {
			scrollerBounceMode.bind(behavior, scroller);
		}
	},
	onTouchBegan: { 
		value: function(behavior, scroller, id, x, y, ticks) {
			var scroll = behavior.selectPosition(scroller.scroll);			
			var stop = behavior.snap(scroller, scroller.scroll, behavior.direction);
			if (scroll != stop) {
				if (behavior.captureTouch(scroller, id, x, y, ticks)) {
					behavior.boost = 0.5;
					behavior.direction = 0;
					
					behavior.first = behavior.last = { previous: null, coordinate: behavior.selectParameter(x, y), ticks: ticks };
					behavior.range = behavior.selectSize(scroller.first.size);
					behavior.size = behavior.selectSize(scroller.size);
					behavior.start = behavior.stop = behavior.selectPosition(scroller.scroll);
			
					behavior.anchor = behavior.selectParameter(x, y);
					behavior.antiAnchor = behavior.selectParameter(y, x);
					scroller.tracking = true;
					scrollerScrollMode.bind(behavior, scroller);
					scrollerScrollMode.onTouchMoved(behavior, scroller, id, x, y, ticks);
				}
			}
			else {						
				scroller.stop();
				var boost = behavior.boost;
				scrollerStillMode.bind(behavior, scroller);
				behavior.boost = boost;
				scrollerStillMode.onTouchBegan(behavior, scroller, id, x, y, ticks);
			}
		}
	},
	onTimeChanged: { 
		value: function(behavior, scroller) {
			var time = scroller.time;
			var position = this.evaluatePositionAtTime(behavior.v0, behavior.v1, this.k, time);
			behavior.scrollTo(scroller, behavior.start - position);
			if (!scroller.loop) {
				var scroll = behavior.selectPosition(scroller.scroll);
				var constraint = behavior.selectPosition(scroller.constraint);
				if (scroll != constraint) {
					scroller.stop();
					position = behavior.start - constraint;
					time = this.evaluateTimeAtPosition(behavior.v0, behavior.v1, this.k, position);
					behavior.v0 = this.evaluateVelocityAtTime(behavior.v0, behavior.v1, this.k, time);
					behavior.stop = behavior.start = constraint;
					scrollerElasticMode.bind(behavior, scroller);
					return;
				}
			}
			var delta = time - behavior.time;
			behavior.time = time;
			//time += delta;
			//coordinate = behavior.start - this.evaluatePositionAtTime(behavior.v0, behavior.v1, this.k, time);
			//behavior.predictTo(scroller, this.computePrediction(behavior, coordinate));
		}
	},
});

var scrollerElasticMode = Object.create(scrollerTossMode, {
	bind: { 
		value: function(behavior, scroller) {
			behavior.mode = this;
			scroller.duration = 1000;
			scroller.time = 0;
			scroller.start();
		}
	},
	onFinished: {
		value: function(behavior, scroller) {
			scrollerStillMode.bind(behavior, scroller);
		}
	},
	onTimeChanged: { 
		value: function(behavior, scroller) {
			var position = this.evaluateBounceback(behavior.v0, scroller.duration, scroller.time) 
			position = (position > 0) ? Math.floor(position) : Math.ceil(position)
			behavior.scrollTo(scroller, behavior.start - position);
		}
	},
});

var scrollerBounceMode = Object.create(scrollerTossMode, {
	bind: { 
		value: function(behavior, scroller) {
			var start = behavior.stop;
			var stop;
			if (scroller.loop)
				stop = behavior.snap(scroller, start, 0);
			else
				stop = behavior.snap(scroller, behavior.selectPosition(scroller.constraint), 0);
			if (start != stop) {
				behavior.mode = this;
				behavior.start = start;
				behavior.stop = stop;
				scroller.duration = 500;
				scroller.time = 0;
				scroller.start();
			}
			else 
				this.onFinished(behavior, scroller);
		}
	},
	onFinished: {
		value: function(behavior, scroller) {
			scrollerStillMode.bind(behavior, scroller);
		}
	},
	onTimeChanged: { 
		value: function(behavior, scroller) {
			var fraction = scroller.fraction;
			behavior.scrollTo(scroller, easeOut(behavior.start, behavior.stop, fraction));
		}
	},
});

var ScrollerBehavior = function(scroller, data) {
	Behavior.call(this, scroller, data);
};
ScrollerBehavior.template = Behavior.template;
ScrollerBehavior.prototype = Object.create(Behavior.prototype, {
	captureTouch: {
		value: function(scroller, id, x, y, ticks) {
			scroller.captureTouch(id, x, y, ticks);
			return true;
		}
	},
	onCreate: {
		value: function(scroller, data) {
			this.data = data;
			scrollerStillMode.bind(this, scroller);
		}
	},
	onDisplaying: {
		value: function(scroller) {
			if ("scroll" in this.data)
				scroller.scroll = this.data.scroll;
		}
	},
	onFinished: {
		value: function(scroller) {
			this.mode.onFinished(this, scroller);
		}
	},
	onTimeChanged: {
		value: function(scroller) {
			this.mode.onTimeChanged(this, scroller);
		}
	},
	onTouchBegan: {
		value: function(scroller, id, x, y, ticks) {
			this.mode.onTouchBegan(this, scroller, id, x, y, ticks);
		}
	},
	onTouchCancelled: {
		value: function(scroller, id, x, y, ticks) {
			this.mode.onTouchCancelled(this, scroller, id, x, y, ticks);
		}
	},
	onTouchEnded: {
		value: function(scroller, id, x, y, ticks) {
			this.mode.onTouchEnded(this, scroller, id, x, y, ticks);
		}
	},
	onTouchMoved: {
		value: function(scroller, id, x, y, ticks) {
			this.mode.onTouchMoved(this, scroller, id, x, y, ticks);
		}
	},
	onTouchScrolled: {
		value: function(scroller, touched, dx, dy, ticks) {
			this.mode.onTouchScrolled(this, scroller, touched, - Math.round(dx), - Math.round(dy), ticks);
		}
	},
	onUndisplayed: {
		value: function(scroller) {
			if ("scroll" in this.data)
				this.data.scroll = scroller.scroll;
		}
	},
	peek: {
		value: function(id) {
			return touches.peek(id);
		}
	},
	snap: {
		value: function(scroller, position, direction) {
			return position;
		}
	},
});

var HorizontalScrollerBehavior = exports.HorizontalScrollerBehavior = ScrollerBehavior.template({
	predictTo: function(scroller, coordinate) {
		scroller.predictTo(coordinate, 0);
	},
	scrollBy: function(scroller, coordinate) {
		scroller.scrollBy(coordinate, 0);
	},
	scrollTo: function(scroller, coordinate) {
		scroller.scrollTo(coordinate, 0);
	},
	selectParameter: function(x, y) {
		return x;
	},
	selectPosition: function(position) {
		return position.x;
	},
	selectSize: function(size) {
		return size.width;
	}
})

var HorizontalScrollbarBehavior = exports.HorizontalScrollbarBehavior = Behavior.template({
	onCreate: function(scrollbar) {
		var tiles = scrollbar.skin.tiles;
		this.minimum = tiles.left + tiles.right;
	},
	onScrolled: function(scrollbar) {
		var scroller = scrollbar.container;
		var size = scroller.width;
		var range = scroller.first.width;
		var ratio = size / range;
		if (ratio < 1) {
			var offset = scroller.scroll.x;
			var left = offset * ratio;
			var right = (offset + size) * ratio;
			var width = Math.round(right - left);
			if (width < this.minimum) {
				scrollbar.x = scroller.x + Math.round((left + right - this.minimum) / 2);
				scrollbar.width = this.minimum;
			}
			else {
				scrollbar.x = scroller.x + Math.round(left);
				scrollbar.width = width;
			}
			scrollbar.visible = scroller.tracking;
		}
		else
			scrollbar.visible = false;
	}
})

var LeftScrollerShadowBehavior = exports.LeftScrollerShadowBehavior = Behavior.template({
	onScrolled: function(shadow) {
		var scroller = shadow.container;
		var content = scroller.first;
		var size = scroller.width;
		var range = content.width;
		var offset = scroller.x - content.x;
		if (offset > 0) {
			var width = shadow.width;
			var x = scroller.x;
			if (offset < width) x -= width - offset;
			shadow.x = x;
			shadow.visible = true;
		}
		else
			shadow.visible = false;
	}
})

var RightScrollerShadowBehavior = exports.RightScrollerShadowBehavior = Behavior.template({
	onScrolled: function(shadow) {
		var scroller = shadow.container;
		var content = scroller.first;
		var size = scroller.width;
		var range = content.width;
		var offset = (content.x + range) - (scroller.x + size);
		if (offset > 0) {
			var width = shadow.width;
			var x = scroller.x + size - width;
			if (offset < width) x += width - offset;
			shadow.x = x;
			shadow.visible = true;
		}
		else
			shadow.visible = false;
	}
})

var VerticalScrollerBehavior = exports.VerticalScrollerBehavior = ScrollerBehavior.template({
	predictTo: function(scroller, coordinate) {
		scroller.predictTo(0, coordinate);
	},
	scrollBy: function(scroller, coordinate) {
		scroller.scrollBy(0, coordinate);
	},
	scrollTo: function(scroller, coordinate) {
		scroller.scrollTo(0, coordinate);
	},
	selectParameter: function(x, y) {
		return y;
	},
	selectPosition: function(position) {
		return position.y;
	},
	selectSize: function(size) {
		return size.height;
	},
})
var VerticalScrollbarBehavior = exports.VerticalScrollbarBehavior = Behavior.template({
	onCreate: function(scrollbar) {
		var tiles = scrollbar.skin.tiles;
		this.minimum = tiles.top + tiles.bottom;
	},
	onScrolled: function(scrollbar) {
		var scroller = scrollbar.container;
		var size = scroller.height;
		var range = scroller.first.height;
		var ratio = size / range;
		if (ratio < 1) {
			var offset = scroller.scroll.y;
			var top = offset * ratio;
			var bottom = (offset + size) * ratio;
			var height = Math.round(bottom - top);
			if (height < this.minimum) {
				scrollbar.y = scroller.y + Math.round((top + bottom - this.minimum) / 2);
				scrollbar.height = this.minimum;
			}
			else {
				scrollbar.y = scroller.y + Math.round(top);
				scrollbar.height = height;
			}
			scrollbar.visible = scroller.tracking;
		}
		else
			scrollbar.visible = false;
	}
})
var TopScrollerShadowBehavior = exports.TopScrollerShadowBehavior = Behavior.template({
	onScrolled: function(shadow) {
		var scroller = shadow.container;
		var content = scroller.first;
		var size = scroller.height;
		var range = content.height;
		var offset = scroller.y - content.y;
		if (offset > 0) {
			var height = shadow.height;
			var y = scroller.y;
			if (offset < height) y -= height - offset;
			shadow.y = y;
			shadow.visible = true;
		}
		else
			shadow.visible = false;
	}
})
var BottomScrollerShadowBehavior = exports.BottomScrollerShadowBehavior = Behavior.template({
	onScrolled: function(shadow) {
		var scroller = shadow.container;
		var content = scroller.first;
		var size = scroller.height;
		var range = content.height;
		var offset = (content.y + range) - (scroller.y + size);
		if (offset > 0) {
			var height = shadow.height;
			var y = scroller.y + size - height;
			if (offset < height) y += height - offset;
			shadow.y = y;
			shadow.visible = true;
		}
		else
			shadow.visible = false;
	}
})

var HorizontalScroller = exports.HorizontalScroller = Scroller.template(function($) { return { left: 0, right: 0, top: 0, bottom: 0, active: true, skin: scrollerSkin, behavior: Object.create((HorizontalScrollerBehavior).prototype), }});
var HorizontalScrollbar = exports.HorizontalScrollbar = Content.template(function($) { return { left: 0, width: 20, height: 20, bottom: 0, skin: horizontalScrollbarSkin, behavior: Object.create((HorizontalScrollbarBehavior).prototype), }});
var LeftScrollerShadow = exports.LeftScrollerShadow = Content.template(function($) { return { left: 0, width: 20, top: 0, bottom: 0, skin: leftScrollerShadowSkin, state: 0, behavior: Object.create((LeftScrollerShadowBehavior).prototype), }});
var RightScrollerShadow = exports.RightScrollerShadow = Content.template(function($) { return { width: 20, right: 0, top: 0, bottom: 0, skin: rightScrollerShadowSkin, state: 1, behavior: Object.create((RightScrollerShadowBehavior).prototype), }});

var VerticalScroller = exports.VerticalScroller = Scroller.template(function($) { return { left: 0, right: 0, top: 0, bottom: 0, active: true, skin: scrollerSkin, behavior: Object.create((VerticalScrollerBehavior).prototype), }});
var VerticalScrollbar = exports.VerticalScrollbar = Content.template(function($) { return { width: 10, right: 0, top: 0, height: 20, skin: verticalScrollbarSkin, behavior: Object.create((VerticalScrollbarBehavior).prototype), }});
var TopScrollerShadow = exports.TopScrollerShadow = Content.template(function($) { return { left: 0, right: 0, top: 0, height: 20, skin: topScrollerShadowSkin, state: 0, behavior: Object.create((TopScrollerShadowBehavior).prototype), }});
var BottomScrollerShadow = exports.BottomScrollerShadow = Content.template(function($) { return { left: 0, right: 0, height: 20, bottom: 0, skin: bottomScrollerShadowSkin, state: 1, behavior: Object.create((BottomScrollerShadowBehavior).prototype), }});


