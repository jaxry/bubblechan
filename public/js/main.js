'use strict';

var myApp = myApp || {};

myApp.constants = {
    op: '#fff',
    standalone: '#e94',
    reply: '#34a',

    graphScale: 145,

    maxNodeSize: 230,
    imageNodeSize: 200,
    minNodeSize: 70,

    edgeWidth: 10,
    arrowMargin: 20,
    baseMargin: 0,
    arrowWidth: document.getElementById('Arrow').getAttribute('markerWidth'),

    edgeScaleLimit: 9,
    nodeScaleLimit: 1,

    nodeExpandDuration: 0.2
};

myApp.constants.time = Date.now();
myApp.constants.edgeSVGPadding = myApp.constants.edgeScaleLimit * myApp.constants.edgeWidth;

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
    var minutes = (myApp.constants.time / 1000 - t) / 60
      , elapsed, verbose;

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

myApp.animate = (function(from, to, duration, callback) {

    // In Out Cubic
    function ease(t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
    }

    return function(from, to, duration, callback) {
        
        var changeInValue = to - from
          , startTime = Date.now();

        duration *= 1000;
        
        function step() {
            var time = Date.now() - startTime;
            if (time > duration) time = duration;

            callback(ease(time, from, changeInValue, duration));

            if (time < duration) {
                requestAnimationFrame(step);
            }
        }

        step();
    };
})();


myApp.Node = function(post) {
    this.id = post.id;
    this.type = post.type;
    this.pos = [post.pos[0] * myApp.constants.graphScale, post.pos[1] * myApp.constants.graphScale];
    this.scale = 1.0;
    this.parents = [];
    this.children = [];
    this.size = {};

    this.createNodeDiv(post);
    this.setRadius = this.setRadius.bind(this);
};

myApp.Node.prototype = {
    updateTransform: function() {
        this.container.style.transform = 'translate(-50%, -50%) matrix(' + this.scale  + ',0,0,' + this.scale  + ',' + this.pos[0] + ',' + this.pos[1] + ')';
    },
    updateEdges: function() {
        for (var i = 0; i < this.parents.length; i++) {
            this.parents[i].updateChild();
        }
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].updateParent();
        }
    },
    cacheRadius: function() {
        this.radius = this.container.offsetWidth / 2;
    },
    setRadius: function(value) {
        this.size.current = value;

        this.content.style.width = this.content.style.height = value / 1.41 + 'px';
        this.container.style.width = this.container.style.height = value + 'px';
        this.cacheRadius();
        this.updateEdges();

    },
    expand: function(maxRadius) {
        if (!this.size.isFull) {
            var expandTo = this.img ? myApp.clamp(this.img.max, this.size.full, maxRadius) : this.size.full;
            myApp.animate(this.size.current, expandTo, myApp.constants.nodeExpandDuration, this.setRadius);
            this.container.classList.add('expanded');
        }

        this.size.isFull = true;
    },
    reduce: function() {
        myApp.animate(this.size.current, this.size.reduced, myApp.constants.nodeExpandDuration, this.setRadius);
        this.container.classList.remove('expanded');
        this.size.isFull = false;
    },
    setScale: function(s) {
        if (this.scale !== s) {
            this.scale = s;
            this.updateTransform();
        }
    },
    setThumbnail: function(thumb) {
        if (thumb === this.img.isFull) {
            this.container.style['background-image'] = 'url(' + (thumb ? this.img.thumb : this.img.full) + ')';
            this.img.isFull = !thumb;
        }
    },
    createNodeDiv: function(post) {
        this.container = myApp.createElem('div', {class: 'node', 'data-id': this.id});
        
        // append to body so offsetHeight is computable
        document.body.appendChild(this.container);

        this.container.classList.add(post.type);

        if (post.img) {
            this.img = { 
                full: post.img, 
                thumb: post.thumb, 
                isFull: false,
                max: Math.max(post.width, post.height)
            };
            this.setThumbnail(false);
            this.container.classList.add('image');
        }

        this.content = this.container.appendChild(myApp.createElem('div', {class: 'node-content'}));

        this.content.appendChild(this._createHeader(post));

        var reducedWidth = 0;

        if (post.com) {
            var message = this.content.appendChild(myApp.createElem('div', {class: 'message'}));
            message.innerHTML = '<div>' + post.com + '</div>'; 

            reducedWidth = this._calcWidth();
            message.style['min-width'] = reducedWidth + 'px';
        }

        this.content.appendChild(this._createFooter(post));

        this.container.classList.add('expanded');
        var expandedWidth = this._calcWidth();
        this.container.classList.remove('expanded');

        this.size.reduced = myApp.clamp(reducedWidth * 1.41, post.img ? myApp.constants.imageNodeSize : myApp.constants.minNodeSize, myApp.constants.maxNodeSize);
        this.size.full = expandedWidth * 1.5;
        this.size.current = this.size.reduced;

        this.setRadius(this.size.current);
        this.cacheRadius();
        this.updateTransform();
    },
    _calcWidth: function() {
        // resize the content to a square. Multiple iterations are required for maximum precision.
        for (var i = 0; i < 3; i++) {
            this.content.style.width = Math.sqrt(this.content.offsetWidth * this.content.offsetHeight) + 'px';
        }
        return this.content.offsetWidth;
    },
    _createHeader: function(post) {
        var header = myApp.createElem('div', {class: 'header detail'});
        
        header.innerHTML = (post.trip ? "<span class='name-block'>" + post.name + post.trip + " </span>" : "") +
                           "No.<a target='_blank' class='post-num' href='" + post.postUrl + "'>" + post.no + " </a><br>" + 
                           "<span class='dateTime'>" + myApp.timeElapsed(post.time) + " </span>";

        return header;
    },
    _createFooter: function(post) {
        var footer = myApp.createElem('div', {class: 'footer detail'});

        if (post.img) {
            var il = myApp.createElem('a', {class: 'image-link', target: '_blank', href: post.img});
            il.innerHTML = post.filename + post.ext;
            footer.appendChild(il);

            il.addEventListener('mouseover', function() {
                this.container.classList.add('hide-content');
            }.bind(this));
            il.addEventListener('mouseout', function() {
                this.container.classList.remove('hide-content');
            }.bind(this));
        }

        return footer;
    }
};

myApp.Edge = function(parent, child) {
    this.parent = parent;
    this.child = child;
    this.dim = {
        left: Math.min(this.parent.pos[0], this.child.pos[0]) - myApp.constants.edgeSVGPadding / 2,
        top: Math.min(this.parent.pos[1], this.child.pos[1]) - myApp.constants.edgeSVGPadding / 2,
        width: Math.abs(this.parent.pos[0] - this.child.pos[0]) + myApp.constants.edgeSVGPadding,
        height: Math.abs(this.parent.pos[1] - this.child.pos[1]) + myApp.constants.edgeSVGPadding,
    };
    this.createEdgeDiv();
};

myApp.Edge.prototype = {
    calcNodeBorder: function(node1, node2, offset, offset2) {
        var x = node1.pos[0] - node2.pos[0]
          , y = node1.pos[1] - node2.pos[1]
          , d = Math.sqrt(x*x + y*y)
          , radius = (node1.radius + offset)*node1.scale + (offset2 || 0);
          
        return [node1.pos[0] - x / d * radius - this.dim.left, 
                node1.pos[1] - y / d * radius - this.dim.top];
    },
    updateParent: function() {
        var border = this.calcNodeBorder(this.parent, this.child, myApp.constants.baseMargin);
        this.line.setAttribute('x1', border[0]);
        this.line.setAttribute('y1', border[1]);
        if (this.gradient) {
            this.gradient.setAttribute('x1', border[0]);
            this.gradient.setAttribute('y1', border[1]);
        }
    },
    updateChild: function() {
        var border = this.calcNodeBorder(this.child, this.parent, myApp.constants.arrowMargin, this.strokeWidth * myApp.constants.arrowWidth);
        this.line.setAttribute('x2', border[0]);
        this.line.setAttribute('y2', border[1]);
        if (this.gradient) {
            this.gradient.setAttribute('x2', border[0]);
            this.gradient.setAttribute('y2', border[1]);
        }
    },
    updateBoth: function() {
        this.updateParent();
        this.updateChild();
    },
    setScale: function(s) {
        if (this.strokeWidth !== s) {
            this.strokeWidth = s;
            this.line.setAttribute('stroke-width', this.strokeWidth);
            this.updateBoth();
        }
    },
    createEdgeDiv: function() {
        this.container = myApp.createSVGElem('svg', {'class': 'edge', 'width': this.dim.width + 'px', 'height': this.dim.height + 'px'});
        
        // this.container.style.transform = 'translate(' + this.dim.left + 'px,' + this.dim.top + 'px)';
        this.container.style.top = this.dim.top + 'px';
        this.container.style.left = this.dim.left + 'px';

        var start = myApp.constants[this.parent.type]
          , stop = myApp.constants[this.child.type]
          , stroke;

        if (start === stop) {
            stroke = stop;
        }
        else {
            var gradientId = 'edge-gradient-' + this.parent.id + '-' + this.child.id;
            stroke = 'url(#' + gradientId + ')';

            this.gradient = myApp.createSVGElem('linearGradient', {id: gradientId, gradientUnits: 'userSpaceOnUse'});
            this.gradient.appendChild(myApp.createSVGElem('stop', {offset: '0%', 'stop-color': start}));
            this.gradient.appendChild(myApp.createSVGElem('stop', {offset: '100%', 'stop-color': stop}));

            var defs = this.container.appendChild(myApp.createSVGElem('defs'));
            defs.appendChild(this.gradient);
        }

        this.line = myApp.createSVGElem('line', {stroke: stroke, 'marker-end': 'url(#Arrow)'});
        this.container.appendChild(this.line);

        this.updateBoth();
        this.setScale(myApp.constants.edgeWidth);
    }
};


myApp.Graph = function() {

    var container = document.getElementById('graph-container')
      , graphDiv = container.appendChild(myApp.createElem('div', {id: 'graph'}))
      , edgeDiv = myApp.createElem('div', {class: 'graph-group'})
      , nodeDiv = myApp.createElem('div', {class: 'graph-group'})
      , graphWidth, graphHeight;


    var nodes = [],
        edges = [],
        nodesWithImages = [];

    function addNode(post) {
        var node = new myApp.Node(post, graphWidth, graphHeight);
        nodes.push(node);
        if (node.img) nodesWithImages.push(node);
        nodeDiv.appendChild(node.container);

        for (var i = 0; i < post.parents.length; i++) {
            var parent = nodes[post.parents[i]];
            var edge = new myApp.Edge(parent, node);

            node.parents.push(edge);
            parent.children.push(edge);
            edges.push(edge);
            edgeDiv.appendChild(edge.container);
        }
    }

    function cacheGraphSize() {
        graphWidth = container.offsetWidth;
        graphHeight = container.offsetHeight;
    }

    window.addEventListener('resize', cacheGraphSize);
    cacheGraphSize();

    return {
        transform: function(x, y, s) {
            graphDiv.style.transform = 'matrix(' + s + ',0,0,' + s + ',' + x + ',' + y + ')';
        },
        nodeScale: function(s) {
            var invS = 1 / s
              , nodeScale = Math.min(invS, myApp.constants.nodeScaleLimit)
              , edgeScale = myApp.constants.edgeWidth * Math.min(invS, myApp.constants.edgeScaleLimit)
              , thumbnail = invS <= 1.5 ? false : true;

            for (var i = 0; i < nodes.length; i++) {
                nodes[i].setScale(nodeScale);
            }
            for (var i = 0; i < edges.length; i++) {
                edges[i].setScale(edgeScale);
            }
            for (var i = 0; i < nodesWithImages.length; i++) {
                nodesWithImages[i].setThumbnail(thumbnail);
            }
        },
        addPosts: function(posts) {
            for (var i = 0; i < posts.length; i++) {
                addNode(posts[i]);
            }
            graphDiv.appendChild(edgeDiv);
            graphDiv.appendChild(nodeDiv);
        },
        nodes: nodes,
        container: container,
        get width() { return graphWidth; },
        get height() { return graphHeight; }
    };
};

myApp.Input = function(elem) {
    var touchDragInit, touchDrag;

    return {
        drag: function(init, dragHandler) {
            var scope = {};
            init = init.bind(scope);
            dragHandler = dragHandler.bind(scope);

            var mousemoveHandler = function(e) {
                e.preventDefault();
                dragHandler(e, e.clientX, e.clientY);
            };

            elem.addEventListener('mousedown', function(e) {
                init(e, e.clientX, e.clientY);
                elem.addEventListener('mousemove', mousemoveHandler);
            });

            elem.addEventListener('mouseup', function() {
                elem.removeEventListener('mousemove', mousemoveHandler);
            });

            touchDragInit = function(e) {
                if (e.touches.length === 1) {
                    init(e, e.touches[0].clientX, e.touches[0].clientY);
                }
            };

            touchDrag = function(e) {
                e.preventDefault();
                dragHandler(e, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
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
                pinchHandler(e, e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.changedTouches[1].clientX, e.changedTouches[1].clientY);
            };
            elem.addEventListener('touchstart', function(e) {
                if (e.touches.length === 2) {
                    if (touchDrag) elem.removeEventListener('touchmove', touchDrag);
                    elem.addEventListener('touchmove', touchmoveHandler);
                    init(e, e.touches[0].clientX, e.touches[0].clientY, e.touches[1].clientX, e.touches[1].clientY);
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
                wheelHandler(e, e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
            });
        },
        click: function(clickHandler) {
            var time;
            elem.addEventListener('mousedown', function(e) {
                time = Date.now();

            });
            elem.addEventListener('mouseup', function(e) {
                if (Date.now() - time < 150) {
                    clickHandler(e, e.clientX, e.clientY);
                }
            });
        }
    };
};

myApp.Navigation = function(graph) {
    var t = {x: 0, y: 0, s: 1}
      , lastHoveredNode = null;

    function applyTransformation() {
        graph.transform(t.x, t.y, t.s);
    }

    function applyNodeScale() {
        graph.nodeScale(t.s);
    }

    function relativeMousePos(x, y) {
        var rect = graph.container.getBoundingClientRect();
        return [x - rect.left, y - rect.top];
    }

    function centerOn(x, y) {
        t.x = -(x - t.x) + graph.width / 2;
        t.y = -(y - t.y) + graph.height / 2;
    }

    function centerOnNode(node) {
        centerOn(node.pos[0], node.pos[1]);
        applyTransformation();
    }

    function distance(x1, y1, x2, y2) {
        var dispX = x2 - x1
          , dispY = y2 - y1;
        return Math.sqrt(dispX * dispX + dispY * dispY);
    }

    function nodeOver(e) {
        var nodeID = this.dataset.id;
        if (nodeID !== lastHoveredNode) {
            var node = graph.nodes[nodeID];
            node.container.style['z-index'] = 1;
            node.expand(0.9 * Math.min(graph.width, graph.height));

            lastHoveredNode = nodeID;
        }
    }

    function nodeLeave(e) {
        var node = graph.nodes[this.dataset.id];
        node.container.style['z-index'] = 0;
        node.reduce();
        lastHoveredNode = null;
    }

    var graphEvents = new myApp.Input(graph.container);

    graphEvents.drag(
        function(e, x, y) {
            this.lastX = x;
            this.lastY = y;
        }, 
        function(e, x, y) {
            t.x += x - this.lastX;
            t.y += y - this.lastY;
            applyTransformation();
            this.lastX = x;
            this.lastY = y;
        }
    );

    graphEvents.click(function(e, x, y) {
        var p = relativeMousePos(x, y);
        centerOn(p[0], p[1]);
        applyTransformation();
    });

    graphEvents.pinch(
        function(e, x1, y1, x2, y2) {
            this.prevDistance = distance(x1, y1, x2, y2);
        },
        function(e, x1, y1, x2, y2) {
            var newDistance = distance(x1, y1, x2, y2)
              , ds = newDistance / this.prevDistance
              , pos = relativeMousePos((x1 + x2) / 2, (y1 + y2) / 2);
            
            t.x = pos[0] - ds * (pos[0] - t.x);
            t.y = pos[1] - ds * (pos[1] - t.y);
            t.s *= ds;
            this.prevDistance = newDistance;
            applyTransformation();
        },
        function(e) {
            applyNodeScale();
        }
    );

    graphEvents.wheel(
        function(e, dir, x, y) {
            var scaleAmount = 1.3
              , ds = dir === 1 ? scaleAmount : 1 / scaleAmount
              , pos = relativeMousePos(x, y);

            t.x = pos[0] - ds * (pos[0] - t.x);
            t.y = pos[1] - ds * (pos[1] - t.y);
            t.s *= ds;
            applyTransformation();
            applyNodeScale();
        }
    );

    for (var i = 0; i < graph.nodes.length; i++) {
        graph.nodes[i].container.addEventListener('mouseover', nodeOver);
        graph.nodes[i].container.addEventListener('mouseleave', nodeLeave);
    }

    return {
        centerOnNode: centerOnNode
    };
};


(function() {
    // var time = Date.now();

    var graph = myApp.Graph();
    graph.addPosts(myApp.posts);

    var navigation = myApp.Navigation(graph);
    navigation.centerOnNode(graph.nodes[0]);
    
    // alert((Date.now() - time) + ' ms');

    delete myApp.posts;
}());
