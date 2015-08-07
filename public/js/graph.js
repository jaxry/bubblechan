'use strict';

var myApp = myApp || {};

myApp.constants = {
    op: '#fff',
    standalone: '#e94',
    reply: '#34a',
    highlight: '#ffa',

    graphScale: 140,
    maxNodeSize: 230,
    imageNodeSize: 200,
    minNodeSize: 90,

    edgeWidth: 12,
    arrowMargin: 15,
    baseMargin: 0,

    edgeScaleLimit: 9,
    nodeScaleLimit: 1,

    nodeExpandDuration: 200,

    wheelStick: 5,
    panSensitivity: 1.3
};

myApp.constants.time = Date.now();
myApp.constants.maxNodeScale = myApp.constants.graphScale;
myApp.constants.arrowWidth = document.getElementById('Arrow').getAttribute('markerWidth');
myApp.constants.baseWidth = document.getElementById('Circle-reply').getAttribute('markerWidth') / 2.5 - 0.1;
myApp.constants.edgeSVGPadding = myApp.constants.edgeScaleLimit * myApp.constants.edgeWidth;

myApp.onWindowResize = function(callback) {

    var id;
    function callbackWithDelay() {
        clearTimeout(id);
        id = setTimeout(callback, 100);
    }

    window.addEventListener('resize', callbackWithDelay);
};

myApp.setAttributes = function(elem, attrs) {
    for (var a in attrs) {
        elem.setAttribute(a, String(attrs[a]));
    }
};

myApp.createElem = function(type, attrs) {
    var elem = document.createElement(type);
    if (attrs) myApp.setAttributes(elem, attrs);
    return elem;
};

myApp.createSVGElem = function(type, attrs) {
    var elem = document.createElementNS('http://www.w3.org/2000/svg', type);
    if (attrs) myApp.setAttributes(elem, attrs);
    return elem;
};

myApp.clamp = function(x, min, max) {
    return Math.max(Math.min(x, max), min);
};

myApp.timeElapsed = function(t) {
    var minutes = (myApp.constants.time / 1000 - t) / 60,
        elapsed, verbose;

    if (minutes < 60) {
        elapsed = Math.round(minutes);
        verbose = elapsed === 1 ? ' minute ago' : ' minutes ago';
    }
    else {
        elapsed = Math.round(minutes / 60);
        verbose = elapsed === 1 ? ' hour ago' : ' hours ago';
    }
    return  elapsed + verbose;
};

myApp.animate = (function() {

    // In Out Cubic
    function ease(t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
    }

    return function(from, to, duration, callback, finish, callbackScope) {
        
        var changeInValue = to - from,
            startTime = Date.now();
        
        function step() {
            var time = Date.now() - startTime;
            if (time > duration) time = duration;

            callback.call(callbackScope, ease(time, from, changeInValue, duration));

            if (time < duration) {
                requestAnimationFrame(step);
            }
            else if (finish) {
                finish.call(callbackScope);
            }
        }

        step();
    };
})();

myApp.Node = function(post) {
    this.id = post.id;
    this.no = post.no;
    this.type = post.type;
    this.pos = [post.pos[0] * myApp.constants.graphScale, post.pos[1] * myApp.constants.graphScale];
    this.centrality = post.centrality;
    this.scale = 1.0;
    this.parents = [];
    this.children = [];
    this.size = {};
    if (post.img) {
        this.img = { 
            full: post.img, 
            thumb: post.thumb, 
            isWebm: post.ext === '.webm',
            max: Math.max(post.width, post.height),
        };
    }

    this._createNodeDiv(post);
};

myApp.Node.prototype = {
    updateTransform: function() {
        this.container.style.transform = 'translate(-50%, -50%) matrix(' + this.scale  + ',0,0,' + this.scale  + ',' + this.pos[0] + ',' + this.pos[1] + ')';
    },
    updateEdges: function() {
        for (var i = 0; i < this.parents.length; i++) {
            this.parents[i].update();
        }
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].update();
        }
    },
    cacheRadius: function() {
        this.radius = this.container.offsetWidth / 2;
    },
    setRadius: function(value, noUpdate) {
        this.size.current = value;

        this.content.style.width = this.content.style.height = value / 1.41 + 'px';
        this.container.style.width = this.container.style.height = value + 'px';

        this.cacheRadius();
        if (!noUpdate) this.updateEdges();
    },
    expand: function(maxRadius) {
        if (this.size.isExpanded) return;

        var expandTo = this.img ? myApp.clamp(this.img.max, this.size.full, maxRadius) : this.size.full;
        myApp.animate(this.size.current, expandTo, myApp.constants.nodeExpandDuration, this.setRadius, null, this);
       
       this.container.classList.add('expanded');

        if (this.img && this.img.usingThumb) this.setThumbnail(false, true);

        this.size.isExpanded = true;
    },
    reduce: function() {
        myApp.animate(this.size.current, this.size.reduced, myApp.constants.nodeExpandDuration, this.setRadius, null, this);
        this.container.classList.remove('expanded');
        
        if (this.img && this.img.usingThumb) this.setThumbnail(true, true);
        
        this.size.isExpanded = false;
    },
    setScale: function(s) {
        this.scale = s;
        this.updateTransform();
    },
    setScaleWithCentrality: function(baseScale, interpolation) {
        this.scale = 1 + (Math.min(this.centrality, 15) * baseScale / this.size.reduced - 1) * interpolation;
        this.updateTransform();
    },
    setThumbnail: function(thumb, noStatusUpdate) {
        this.container.style['background-image'] = 'url(' + (thumb ? this.img.thumb : this.img.full) + ')';
        if (!noStatusUpdate) this.img.usingThumb = thumb;
    },
    highlightOn: function() {
        this.container.classList.add('node-highlight');
    },
    highlightOff: function() {
        this.container.classList.remove('node-highlight');
    },
    hideContent: function() {
        this.container.classList.add('hide-content');
    },
    showContent: function() {
        this.container.classList.remove('hide-content');
    },
    _createNodeDiv: function(post) {
        this.container = myApp.createElem('div', {class: 'node', 'data-id': this.id});
        
        // append to body so offsetHeight is computable
        document.body.appendChild(this.container);

        this.container.classList.add('node-' + post.type);

        this.content = this.container.appendChild(myApp.createElem('div', {class: 'node-content'}));
        this.content.appendChild(this._createHeader(post));

        var reducedWidth = 0;

        if (post.com) {
            this.message = this.content.appendChild(myApp.createElem('div', {class: 'node-message'}));
            this.message.innerHTML = post.com;

            reducedWidth = this._calcWidth();
            this.message.style['min-width'] = reducedWidth + 'px';
        }

        if (this.img) {
            this.content.appendChild(this._createFooter(post));
            this.setThumbnail(this.img.isWebm);
            this.container.classList.add('node-image');
        }

        this.container.classList.add('expanded');
        var expandedWidth = this._calcWidth();
        this.container.classList.remove('expanded');

        this.size.reduced = myApp.clamp(reducedWidth * 1.41, post.img ? myApp.constants.imageNodeSize : myApp.constants.minNodeSize, myApp.constants.maxNodeSize);
        this.size.full = expandedWidth * 1.48;
        this.size.current = this.size.reduced;

        this.container.style['border-width'] = 3 * Math.pow(this.centrality, 0.75) + 'px';

        this.setRadius(this.size.current, true);
    },
    _calcWidth: function() {
        // resize the content to a square. Multiple iterations are required for maximum precision.
        for (var i = 0; i < 3; i++) {
            this.content.style.width = Math.sqrt(this.content.offsetWidth * this.content.offsetHeight) + 'px';
        }
        return this.content.offsetWidth;
    },
    _createHeader: function(post) {
        var header = myApp.createElem('div', {class: 'header node-detail'});
        
        header.innerHTML = (post.trip ? "<span class='name-block'>" + post.name + post.trip + " </span>" : "") +
                           "No.<a target='_blank' class='post-num' href='" + post.postUrl + "'>" + post.no + " </a><br>" + 
                           "<span class='dateTime'>" + myApp.timeElapsed(post.time) + " </span>";

        return header;
    },
    _createFooter: function(post) {
        var footer = myApp.createElem('div', {class: 'footer node-detail'});

        var il = myApp.createElem('a', {class: 'image-link', target: '_blank', href: post.img});
        il.innerHTML = post.filename + post.ext;
        footer.appendChild(il);

        il.addEventListener('mouseover', this.hideContent.bind(this));
        il.addEventListener('mouseout', this.showContent.bind(this));

        return footer;
    }
};

myApp.Edge = function(parent, child) {
    this.parent = parent;
    this.child = child;

    this.c = {
        dirX: this.parent.pos[0] - this.child.pos[0],
        dirY: this.parent.pos[1] - this.child.pos[1]
    };
    this.c.dist = Math.sqrt(this.c.dirX*this.c.dirX + this.c.dirY*this.c.dirY);
    this.c.dirX  /= this.c.dist;
    this.c.dirY /= this.c.dist;
    
    this.dim = {
        left: Math.min(this.parent.pos[0], this.child.pos[0]) - myApp.constants.edgeSVGPadding / 2,
        top: Math.min(this.parent.pos[1], this.child.pos[1]) - myApp.constants.edgeSVGPadding / 2,
        width: Math.abs(this.parent.pos[0] - this.child.pos[0]) + myApp.constants.edgeSVGPadding,
        height: Math.abs(this.parent.pos[1] - this.child.pos[1]) + myApp.constants.edgeSVGPadding,
    };

    this._createEdgeDiv();
};

myApp.Edge.prototype = {
    _renderEdge: function(iteration) {
        var radius1 = (this.parent.radius + myApp.constants.baseMargin) * this.parent.scale + this.strokeWidth * (this.isBaseVisible ? myApp.constants.baseWidth : 0),
            radius2 = (this.child.radius + myApp.constants.arrowMargin) * this.child.scale + this.strokeWidth * myApp.constants.arrowWidth,
            x1 = this.parent.pos[0] - this.c.dirX * radius1,
            x2 = this.child.pos[0] + this.c.dirX * radius2;

        if (x1 - x2 > 0 !== this.c.dirX > 0 && iteration < 3) {
            this.strokeWidth /= 2;
            this._renderEdge(++iteration);
            return;
        }

        var y1 = this.parent.pos[1] - this.c.dirY * radius1,
            y2 = this.child.pos[1] + this.c.dirY * radius2;
                    
        var attributes = {
            x1: x1 - this.dim.left,
            y1: y1 - this.dim.top,
            x2: x2 - this.dim.left,
            y2: y2 - this.dim.top,
            'stroke-width' : this.strokeWidth
        };

        myApp.setAttributes(this.line, attributes);
        if (this.gradient) myApp.setAttributes(this.gradient, attributes);
    },
    update: function() {
        this.strokeWidth = this.idealStrokeWidth;
        this._renderEdge(0);
    }, 
    setScale: function(s) {
        this.idealStrokeWidth = s;
        this.update();
    },
    showBase: function(visible, highlight) {
        if (visible) {
            var type = highlight ? 'highlight' : this.parent.type;
            this.line.setAttribute('marker-start', 'url(#Circle-' + type + ')');
            this.isBaseVisible = true;
        }
        else {
            this.line.setAttribute('marker-start', '');
            this.isBaseVisible = false;
        }
    },
    highlightOn: function() {
        this.line.setAttribute('stroke', myApp.constants.highlight);
        this.showBase(this.isBaseVisible, true);
        this.parent.highlightOn();
        this.child.highlightOn();
    },
    highlightOff: function() {
        this.line.setAttribute('stroke', this.stroke);
        this.showBase(this.isBaseVisible, false);
        this.parent.highlightOff();
        this.child.highlightOff();
    },
    _createEdgeDiv: function() {
        this.container = myApp.createSVGElem('svg', {'class': 'edge', 'width': this.dim.width + 'px', 'height': this.dim.height + 'px'});
        
        this.container.style.top = this.dim.top + 'px';
        this.container.style.left = this.dim.left + 'px';

        var start = myApp.constants[this.parent.type],
            stop = myApp.constants[this.child.type];

        if (start === stop) {
            this.stroke = stop;
        }
        else {
            var gradientId = 'edge-gradient-' + this.parent.id + '-' + this.child.id;
            this.stroke = 'url(#' + gradientId + ')';

            this.gradient = myApp.createSVGElem('linearGradient', {id: gradientId, gradientUnits: 'userSpaceOnUse'});
            this.gradient.appendChild(myApp.createSVGElem('stop', {offset: '0%', 'stop-color': start}));
            this.gradient.appendChild(myApp.createSVGElem('stop', {offset: '100%', 'stop-color': stop}));

            var defs = this.container.appendChild(myApp.createSVGElem('defs'));
            defs.appendChild(this.gradient);
        }

        this.line = myApp.createSVGElem('line', {stroke: this.stroke, 'marker-end': 'url(#Arrow)'});
        
        this.line.addEventListener('mouseover', this.highlightOn.bind(this));
        this.line.addEventListener('mouseleave', this.highlightOff.bind(this));
        
        this.container.appendChild(this.line);

        this.highlightOff();
    }
};

myApp.Graph = function() {

    var container = document.getElementById('graph-container'),
        graphDiv = container.appendChild(myApp.createElem('div', {id: 'graph'})),
        edgeDiv = myApp.createElem('div', {class: 'graph-group'}),
        nodeDiv = myApp.createElem('div', {class: 'graph-group'}),
        containerWidth, containerHeight, resizeCallbacks = [],
        maxCentrality = 0;

    var nodes = [],
        edges = [],
        nodesWithImages = [];

    function edgeOnTopEvent() {
        edgeDiv.appendChild(this.parentElement);
    }

    function addNode(post) {
        var node = new myApp.Node(post);
        
        nodes.push(node);
        if (node.img && !node.img.isWebm) nodesWithImages.push(node);
        if (node.centrality > maxCentrality) maxCentrality = node.centrality;
        
        nodeDiv.appendChild(node.container);

        for (var i = 0; i < post.parents.length; i++) {
            var parent = nodes[post.parents[i]];

            var edge = new myApp.Edge(parent, node);

            node.parents.push(edge);
            parent.children.push(edge);

            edges.push(edge);
            edge.line.addEventListener('mouseover', edgeOnTopEvent);

            edgeDiv.appendChild(edge.container);
        }
    }

    function cacheGraphSize() {
        containerWidth = container.offsetWidth;
        containerHeight = container.offsetHeight;
        for (var i = 0; i < resizeCallbacks.length; i++) {
            resizeCallbacks[i]();
        }
    }
    myApp.onWindowResize(cacheGraphSize);
    cacheGraphSize();

    var updateState = function() {
        var state = {};
        return function(name, value, callback) {
            if (state[name] !== value) {
                state[name] = value;
                callback(value);
            }
        };
    }();


    function edgeBaseVisible(visible) {
        for (var i = 0; i < edges.length; i++) {
            edges[i].showBase(visible);
        }
    }
    function setImageThumbs(useThumb) {
        for (var i = 0; i < nodesWithImages.length; i++) {
            nodesWithImages[i].setThumbnail(useThumb);
        }
    }

    return {
        transform: function(x, y, s) {
            graphDiv.style.transform = 'matrix(' + s + ',0,0,' + s + ',' + x + ',' + y + ')';
        },
        nodeScale: function(s, minScale) {
            var invS = 1 / s,
                edgeScale = myApp.constants.edgeWidth * Math.min(invS, myApp.constants.edgeScaleLimit);

            if (s >= 1) {
                for (var i = 0; i < nodes.length; i++) {
                    nodes[i].setScale(invS);
                }
                updateState('baseVisible', true, edgeBaseVisible);
            }
            else {

                // alternative node scaling
                // var baseScale = invS * myApp.constants.maxNodeScale / maxCentrality,
                //     interpolation = (s - 1) / (minScale - 1);

                var baseScale = myApp.constants.maxNodeScale,
                    interpolation = (invS - 1) / (1/minScale - 1);

                for (var i = 0; i < nodes.length; i++) {
                    nodes[i].setScaleWithCentrality(baseScale, interpolation);
                }
                updateState('baseVisible', false, edgeBaseVisible);
            }
            for (var i = 0; i < edges.length; i++) {
                edges[i].setScale(edgeScale);
            }

            updateState('useThumb', s < 1, setImageThumbs);
        },
        putEdgeOnTop: function(edge) {
            edgeDiv.appendChild(edge.container);
        },
        addPosts: function(posts) {
            for (var i = 0; i < posts.length; i++) {
                addNode(posts[i]);
            }

            graphDiv.appendChild(edgeDiv);
            graphDiv.appendChild(nodeDiv);
        },
        onresize: function(callback) {
            resizeCallbacks.push(callback);
        },
        nodes: nodes,
        container: container,
        get width() { return containerWidth; },
        get height() { return containerHeight; }
    };
};

myApp.InputWrapper = function(elem) {
    var touchDragInit,
        touchDrag,
        rect,
        m = {};

    function cacheRect() {
        rect = elem.getBoundingClientRect();
    }
    myApp.onWindowResize(cacheRect);
    cacheRect();

    elem.addEventListener('mousemove', function(e) {
        m.x = e.clientX - rect.left;
        m.y = e.clientY - rect.top;
    });

    function touchEvent(e) {
        m.x = e.touches[0].clientX - rect.left;
        m.y = e.touches[0].clientY - rect.top;
        if (e.touches[1]) {
            m.x2 = e.touches[1].clientX - rect.left;
            m.y2 = e.touches[1].clientY - rect.top; 
        }
    }
    elem.addEventListener('touchstart', touchEvent);
    elem.addEventListener('touchmove', touchEvent);

    return {
        hold: function(holdHandler) {
            var scope = {};
            holdHandler = holdHandler.bind(scope);

            var animating, startTime, previousTime;

            function interval() {
                var newTime = Date.now();
                holdHandler(newTime - startTime, newTime - previousTime, m.x, m.y);
                previousTime = newTime;
                if (animating) window.requestAnimationFrame(interval);
            }

            function mousedown() {
                animating = true;
                startTime = Date.now();
                previousTime = startTime;
                interval();
            }

            function mouseup() {
                animating = false;
            }

            elem.addEventListener('mousedown', mousedown);
            elem.addEventListener('mouseup', mouseup);
            elem.addEventListener('touchstart', mousedown);
            elem.addEventListener('touchend', mouseup);
        },
        drag: function(init, dragHandler) {
            var scope = {};
            init = init.bind(scope);
            dragHandler = dragHandler.bind(scope);

            var mousemoveHandler = function(e) {
                e.preventDefault();
                dragHandler(m.x, m.y, e);
            };

            elem.addEventListener('mousedown', function(e) {
                init(m.x, m.y, e);
                elem.addEventListener('mousemove', mousemoveHandler);
            });

            elem.addEventListener('mouseup', function() {
                elem.removeEventListener('mousemove', mousemoveHandler);
            });

            touchDragInit = function(e) {
                if (e.touches.length === 1) init(m.x, m.y, e);
            };

            touchDrag = function(e) {
                e.preventDefault();
                dragHandler(m.x, m.y, e);
            };
            elem.addEventListener('touchstart', touchDragInit);
            elem.addEventListener('touchmove', touchDrag);
        },
        pinch: function(init, pinchHandler, end) {
            var scope = {};
            init = init.bind(scope);
            pinchHandler = pinchHandler.bind(scope);

            var touchmoveHandler = function(e) {
                e.preventDefault();
                pinchHandler(m.x, m.y, m.x2, m.y2, e);
            };
            elem.addEventListener('touchstart', function(e) {
                if (e.touches.length === 2) {
                    if (touchDrag) elem.removeEventListener('touchmove', touchDrag);
                    elem.addEventListener('touchmove', touchmoveHandler);
                    init(m.x, m.y, m.x2, m.y2, e);
                }
            });

            elem.addEventListener('touchend', function(e) {
                if (e.touches.length < 2) {
                    elem.removeEventListener('touchmove', touchmoveHandler);
                    if (touchDrag) {
                        touchDragInit(e);
                        elem.addEventListener('touchmove', touchDrag);
                    }
                    end(e);
                }
            });
        },
        wheel: function(wheelHandler) {
            var scope = {};
            wheelHandler = wheelHandler.bind(scope);

            elem.addEventListener('wheel', function(e) {
                e.preventDefault();
                wheelHandler(e.deltaY < 0 ? 1 : -1, m.x, m.y, e);
            });
        },
        click: function(clickHandler) {
            var time;
            elem.addEventListener('mousedown', function() {
                time = Date.now();

            });
            elem.addEventListener('mouseup', function(e) {
                if (Date.now() - time < 225) {
                    clickHandler(m.x, m.y, e);
                }
            });
        },
        get mx() { return m.x; },
        get my() { return m.y; }
    };
};

myApp.Controls = function(graph) {
    var t = {x: 0, y: 0, s: 1},
        prevT = {},
        bounds = {},
        minScale,
        graphEvents = new myApp.InputWrapper(graph.container);

    function distance(x1, y1, x2, y2) {
        var dx = x2 - x1,
            dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function copyT() {
        prevT.x = t.x;
        prevT.y = t.y;
        prevT.s = t.s;
    }

    function animateTransformation(animateDur) {
        var newX = t.x,
            newY = t.y,
            newS = t.s;

        function step(v) {
            t.x = prevT.x + (newX - prevT.x) * v;
            t.y = prevT.y + (newY - prevT.y) * v;
            t.s = prevT.s + (newS - prevT.s) * v;
            graph.transform(t.x, t.y, t.s);
        }

        myApp.animate(0, 1, animateDur, step, copyT);
    }

    function applyTransformation(nodeScale, animateDur) {
        var hw = graph.width / 2,
            hh = graph.height / 2;

        t.x = myApp.clamp(t.x, -bounds.maxX*t.s + hw, -bounds.minX*t.s + hw);
        t.y = myApp.clamp(t.y, -bounds.maxY*t.s + hh, -bounds.minY*t.s + hh);

        if (nodeScale) graph.nodeScale(t.s, minScale);

        if (animateDur) {
            animateTransformation(animateDur);
        }
        else {
            graph.transform(t.x, t.y, t.s);
            copyT();
        }
    }

    function setMinScale() {
        minScale = 0.9 * Math.min(graph.width / bounds.width, graph.height / bounds.height);
    }

    function scaleAroundPoint(s, x, y) {
        s = myApp.clamp(s, minScale, 8);
        var ds = s / t.s;
        t.x = x - ds * (x - t.x);
        t.y = y - ds * (y - t.y);
        t.s = s;
    }

    function centerOn(x, y) {
        t.x = 0.5 * graph.width - x * t.s;
        t.y = 0.5 * graph.height - y * t.s;
    }

    function calcBounds() {
        var minX, maxX, minY, maxY;

        for (var i = 0; i < graph.nodes.length; i++) {
            var pos = graph.nodes[i].pos;
            
            if (i === 0) {
                minX = maxX = pos[0];
                minY = maxY = pos[1];
                continue;
            }
            if      (pos[0] < minX) minX = pos[0];
            else if (pos[0] > maxX) maxX = pos[0];
            if      (pos[1] < minY) minY = pos[1];
            else if (pos[1] > maxY) maxY = pos[1];
        }
        bounds = {
            minX: minX, 
            maxX: maxX, 
            minY: minY, 
            maxY: maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    function toggleScale() {
        if (t.s !== 1) {
            scaleAroundPoint(1, graphEvents.mx, graphEvents.my);
        }
        else {
            scaleAroundPoint(0, graph.width/2, graph.height/2);
        }
        applyTransformation(true, 300);
    }

    graphEvents.hold(function(totalTime, elapsed, x, y) {
        var dx = 1 - 2 * x / graph.width,
            dy = 1 - 2 * y / graph.height,
            accel = totalTime / 325,
            velocity = Math.min(accel*accel, 1) * elapsed * myApp.constants.panSensitivity;

        t.x += dx * Math.abs(dx) * velocity * graph.width / graph.height;
        t.y += dy * Math.abs(dy) * velocity;
        applyTransformation();
    });

    graphEvents.click(function(x, y) {
        centerOn((x - t.x) / t.s, (y - t.y) / t.s);
        applyTransformation();
    });

    graphEvents.pinch(
        function(x1, y1, x2, y2) {
            this.prevDistance = distance(x1, y1, x2, y2);
        },
        function(x1, y1, x2, y2) {
            var newDistance = distance(x1, y1, x2, y2),
                ds = newDistance / this.prevDistance;

            scaleAroundPoint(t.s * ds, (x1 + x2) / 2, (y1 + y2) / 2);
            this.prevDistance = newDistance;
            applyTransformation();
        },
        function() {
            applyTransformation(true);
        }
    );

    graphEvents.wheel(
        function(dir, x, y) {
            
            var scaleAmount = 1.4,
                ds = dir === 1 ? scaleAmount : 1 / scaleAmount,
                newScale = t.s * ds;

            if (Math.round(t.s * 2) / 2 === 1) {
                if (!this.stick) this.stick = myApp.constants.wheelStick;
                if (this.stick++ < myApp.constants.wheelStick) newScale = 1;
                else this.stick = 1;
            }

            scaleAroundPoint(newScale, x, y);
            applyTransformation(true);
        }
    );

    window.addEventListener('keypress', function(e) {
        if (e.which === 32) toggleScale(); //spacebar
    });

    calcBounds();
    graph.onresize(setMinScale);
    setMinScale();

    return {
        centerOnOp: function() {
            var x = graph.nodes[0].pos[0],
                y = graph.nodes[0].pos[1];

            scaleAroundPoint(0, 0, 0);
            centerOn(bounds.centerX, bounds.centerY);
            applyTransformation(true);

            centerOn(x, y);
            applyTransformation(false, 2000);

            setTimeout(function() {
                scaleAroundPoint(1, 0, 0);
                centerOn(x, y);
                applyTransformation(true, 1000);
            }, 2100);
        }
    };

};

function nodeInteraction(graph) {
    var latestHoveredNode;

    function nodeHover() {
        var nodeID = this.dataset.id;
        if (nodeID !== latestHoveredNode) {
            var node = graph.nodes[nodeID];
            node.expand(0.9 * Math.min(graph.width, graph.height));
            node.container.style['z-index'] = 1;
            latestHoveredNode = nodeID;
        }
    }

    function nodeLeave() {
        var node = graph.nodes[this.dataset.id];
        node.reduce();
        node.container.style['z-index'] = 0;
        latestHoveredNode = null;
    }

    function quoteHover() {
        var edge = graph.nodes[this.dataset.id].parents[this.dataset.order];
        edge.highlightOn();
        graph.putEdgeOnTop(edge);
    }

    function quoteLeave() {
        graph.nodes[this.dataset.id].parents[this.dataset.order].highlightOff();
    }

    function processNodes(nodes) {  
        for (var i = 0; i < nodes.length; i++) {
            
            var node = graph.nodes[i];

            node.container.addEventListener('mouseover', nodeHover);
            node.container.addEventListener('mouseleave', nodeLeave);

            if (node.type !== 'reply') continue;
            
            var quotes = node.message.getElementsByTagName('a');
            for (var j = 0; j < quotes.length; j++) {
                var quote = quotes[j];

                quote.setAttribute('data-id', node.id);
                quote.setAttribute('data-order', j);
                quote.addEventListener('mouseover', quoteHover);
                quote.addEventListener('mouseleave', quoteLeave);
            }
        }
    }

    processNodes(graph.nodes);
}

(function() {
    // var time = Date.now();

    var graph = myApp.Graph();
    graph.addPosts(myApp.thread.posts);

    var controls = myApp.Controls(graph);
    nodeInteraction(graph);

    controls.centerOnOp();
    // alert((Date.now() - time) + ' ms');
}());
