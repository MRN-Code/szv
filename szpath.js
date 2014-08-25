/* jshint -W040, -W083, unused:false */
(function loadsz(window, d3, Promise, undefined) {
    "use strict";

    if (!window) throw new Error("Attepted to load hdp into invalid environment");
    if (!d3) throw new Error("hdp dependency unmet: d3");
    if (!Promise) throw new Error("hdp dependency unmet: RSVP Promise");

    var domTarget = "body",
        height = 400,
        width = 800,
        cb,
        controls,
        controller,
        group,
        gui,
        paths,
        labels,
        line,
        svg;

    var colors = [
        [150, 51, 31],
        [254, 220, 128],
        [10, 124, 122],
        [159, 224, 61],
        [148, 199, 226],
        [61, 179, 224],
        [240, 219, 62],
        [231, 230, 222],
        [160, 28, 158],
        [151, 150, 120],
        [1, 177, 181],
        [130, 135, 137]
    ];



    function SZ(config) {
        var jsonInputs = {
                "sz_hc_l.json": loaded_hc_l,
                "szhc_p.json": loaded_szhc_p
            },
            loadedPs = [],
            configValue;

        // Build array of async fetch promises for all JSON
        for (var dataFile in jsonInputs) {
            if (jsonInputs.hasOwnProperty(dataFile)) {
                loadedPs.push(new Promise(function fetchJSON(resolve, reject) {
                    var df = dataFile;
                    d3.json(df, function handleJSON(err, data) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve([jsonInputs[df], data]); // resolves to [function, dataInputToFunction]
                    });
                }));
            }
        }

        // User initialization
        for (var prop in config) {
            if (config.hasOwnProperty(prop)) {
                configValue = config[prop];
                switch (prop) {
                    case 'cb':
                        cb = configValue;
                        break;
                    case 'target':
                        domTarget = configValue;
                        if (domTarget.indexOf('#') !== 0) {
                            throw new Error("# style selector required");
                        }
                        break;
                    default:
                        throw new Error("Invalid configuration parameter passed (" +
                            prop + ")");
                }
            }
        }

        initPaint();
        initGUI();
        Promise.all(loadedPs)
            .then(execJSONhandlers)
            .then(function userCallback() {
                if (cb) cb();
            });
    }

    /**
     * Animates the sz ...
     * TODO  DocBlock
     */
    function animate() {
        var dur = 5000;
        svg.selectAll("g")
            .select("circle")
            .transition()
            .duration(dur)
            .ease("bounce")
            .attrTween("transform", function(d, i) {
                var pth = window.document.getElementById(i - 1);
                return function(t) {
                    var p = pth.getPointAtLength(
                        pth.getTotalLength() * t);
                    return "translate(" + [p.x, p.y] + ")";
                };
            });
    }



    /**
     * Executes callbacks once all data has been fetched
     * @param  {Array} execReqs array containing arrays of [callback function, data for callback]
     */
    function execJSONhandlers(execReqs) {
        if (!execReqs) throw new Error("No functions/data provided to execute");
        if (!execReqs.length) return;
        execReqs.forEach(function execHandler(fd) {
            fd[0](fd[1]); // fd[0] is a the cb function, fd[1] is the fetched JSON
        });
    }



    /**
     * dat.gui defn obj
     */
    function DCmap() {
        this.example = 'constructing a data map';
        this.step = 0;
        this.cGroups = false;
        this.placeDots = animate;
        this.reset = reset;
    }



    /**
     * Returns the DOM object of the target
     * @return {Object} DOM node
     */
    function getTargetNode () {
        if (domTarget === 'body') return window.document.body;
        return window.document.getElementById(domTarget.substring(1));
    }



    /**
     * Paints the initial svg
     */
    function initPaint() {
        svg = d3.select(domTarget).append("svg");
        paths = svg[0][0].getElementsByTagName("path");
        line = d3.svg.line()
            .x(function(d) {
                return d[0];
            })
            .y(function(d) {
                return d[1];
            })
            .interpolate("linear");

        svg.attr("width", width)
            .attr("height", height)
            .style("position", "relative");

        group = svg.append("g")
            .attr({
                transform: "translate(" + [60, 50] + ")"
            });
    }



    /**
     * Generates the dat.gui control panel
     */
    function initGUI() {
        gui = new dat.GUI();
        controls = new DCmap();
        gui.add(controls, 'example');
        controller = gui.add(controls, 'step', 0, 1000);
        gui.add(controls, 'placeDots').name('run analysis');
        gui.add(controls, 'reset');
        controller.onChange(function contollerChanged (value) {
            takestep(value);
        });

        //controller.onFinishChange(function controllerChangeComplete(value) {});

        var c_color = gui.add(controls, 'cGroups', false).name('use color');
        c_color.onChange(function(value) {
            if (value) {
                console.log(value);
                svg.selectAll("circle")
                    .style("fill",
                        function(d, i) {
                            return d3.rgb(colors[labels[i]][0],
                                colors[labels[i]][1],
                                colors[labels[i]][2]);
                        });
            } else {
                svg.selectAll("g").select("circle")
                    .style("fill", function(d, i) {
                        return d3.rgb(0, 0, 0);
                    });
            }
        });
        getTargetNode().appendChild(gui.domElement);
    }



    /**
     * hcl data loaded
     * TODO DocBlock
     */
    function loaded_hc_l(data) {
        labels = data;
    }



    /**
     * szhc data loaded
     * TODO DocBlock
     */
    function loaded_szhc_p(data) {
        paths = data;
        paths.forEach(function(d, i) {
            var group = svg.append("g").attr({
                class: "apath",
                transform: "translate(" + [60, 5] + ")"
            });
            var path = group.append("path")
                .attr({
                    id: i,
                    d: line(d),
                    fill: "none",
                    stroke: "none"
                });
            path.attr({
                len: path.node().getTotalLength()
            });
            var offset = 0;
            group.append("circle")
                .style("fill", d3.rgb(0, 0, 0))
                .style("stroke", function(d) {
                    return d3.rgb(0, 0, 0);
                })
                .style("stroke-width", 0.5)
                .attr({
                    r: 2.5,
                    transform: function() {
                        var p = path.node().getPointAtLength(0);
                        return "translate(" + [p.x, p.y] + ")";
                    }
                })
                .on("mouseover", function() {
                    d3.select(this)
                        .attr("r", function(d) {
                            return 10;
                        })
                        .style("fill-opacity", 0.8);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("r", function(d) {
                            return 3;
                        })
                        .style("fill-opacity", 1.0);
                });
            path.attr({
                "stroke-dasharray": path.attr("len") + " " + path.attr("len"),
                "stroke-dashoffset": offset
            });
        });
    }



    /**
     * Resets the svg pane to the initial state
     */
    function reset() {
        svg.selectAll("g")
            .select("circle")
            .attr("transform", function(d, i) {
                var pth = window.document.getElementById(i - 1);
                var p = pth.getPointAtLength(0);
                return "translate(" + [p.x, p.y] + ")";
            });
    }



    /**
     * TODO DocBlock
     */
    function takestep(j) {
        svg.selectAll("g")
            .select("circle")
            .attr("transform", function(d, i) {
                var pth = window.document.getElementById(i - 1);
                var p = pth.getPointAtLength(j);
                return "translate(" + [p.x, p.y] + ")";
            });
    }


    if (typeof module !== "undefined" && typeof require !== "undefined") {
        module.exports = SZ;
    } else if (window.SZ) {
        throw new Error("SZ exists on the window.  Overwriting not permitted.");
    } else {
        window.SZ = SZ;
    }

})(window, window.d3, window.RSVP.Promise);