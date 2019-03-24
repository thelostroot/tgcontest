(function(window, undefined) {
  "use strict";

  var CHECK_IMG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABOgAAAToBzZiNlQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACbSURBVDiN7c4xDsFwGIbxslmMEm6hDBKzS7iDxSAScRBxE4NbmFyiJF1En8dS8dc0oe1g8Yxf3vzyRdE/tau2mwBjJAGOaqcOMAKuvlo2ApCz2q8CTDJIA+Ck9sqGM3Wrtgr3OCMrfjAoA6bALd/tnpA6BC4fgXw89729GiPJV0AAbUIFuVcCAmhd+KgaEECrRkAALdRDbeBnPQB/OxvzyNVVwQAAAABJRU5ErkJggg==";
  var monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  /* UI Sizes */
  var TIMELINE_HEIGHT = 70;
  var X_RULE_HEIGHT = 30;
  var BASE_HEIGHT = 400;
  var PORTAL_BASE_WIDTH = 100;
  var PORTAL_BORDER_BASE_WIDTH = 10;
  var GRID_SECTION_COUNT = 5;
  var DATE_LABEL_WIDTH = 100;
  var DATE_LABEL_RIGHT_MARGIN = 50;
  var _width = null; // by screen width

  /* DOM links */
  var _svg = null;
  var _timelinePaths = [];
  var _chartPaths = [];
  var _gridPath = null;
  var _gridYRule = [];
  var _gridXRule = [];

  var _portalLeftOverlay = null;
  var _portalLeftBorder = null;
  var _portal = null;
  var _portalRightBorder = null;
  var _portalRightOverlay = null;

  /* Dataset */
  var _dataset = null;

  /* UI calc */
  var _portalWidth = 100;
  var _portalLeftOverlayWidth = _width - (PORTAL_BORDER_BASE_WIDTH + _portalWidth + PORTAL_BORDER_BASE_WIDTH);
  var _portalRightOverlayWidth = 0;

  /* Flags*/
  var _lastX = null;
  var _portalKeyDown = false;
  var _leftBorderDown = false;
  var _rightBorderDown = false;

  /* Cache */
  var _currentMaxValue = null;

  function initEventListener(id, values) {
    _portal.addEventListener("mousedown", function(e) {
      _portalKeyDown = true;
    });
    _portalLeftBorder.addEventListener("mousedown", function(e) {
      _leftBorderDown = true;
    });
    _portalRightBorder.addEventListener("mousedown", function(e) {
      _rightBorderDown = true;
    });

    document.addEventListener("mouseup", function(e) {
      _portalKeyDown = false;
      _leftBorderDown = false;
      _rightBorderDown = false;
      _lastX = null;
    });

    _svg.addEventListener("mouseleave", function(e) {
      _leftBorderDown = false;
      _rightBorderDown = false;
      _lastX = null;
    });

    document.addEventListener("mousemove", function(e) {
      if (!_portalKeyDown && !_leftBorderDown && !_rightBorderDown) return;
      if (!_lastX) {
        _lastX = e.clientX;
        return;
      }

      var diff = e.clientX - _lastX;

      if (_portalKeyDown) {
        const tempPortalLeftOverlayWidth = _portalLeftOverlayWidth + diff;
        const tempPortalRightOverlayWidth = _portalRightOverlayWidth - diff;
        if (tempPortalLeftOverlayWidth >= 0 && tempPortalRightOverlayWidth >= 0) {
          _portalLeftOverlayWidth = tempPortalLeftOverlayWidth;
          _portalRightOverlayWidth = tempPortalRightOverlayWidth;
          renderTimelinePortal();
          renderChartCurves();
          renderGrid();
        }
      }

      if (_leftBorderDown) {
        const tempPortalLeftOverlayWidth = _portalLeftOverlayWidth + diff;
        const tempPortalWidth = _portalWidth - diff;
        if (tempPortalLeftOverlayWidth >= 0 && tempPortalWidth > 15) {
          _portalLeftOverlayWidth = tempPortalLeftOverlayWidth;
          _portalWidth = tempPortalWidth;
          renderTimelinePortal();
          renderChartCurves();
          renderGrid();
        }
      }

      if (_rightBorderDown) {
        const teampPortalRightOverlayWidth = _portalRightOverlayWidth - diff;
        const tempPortalWidth = _portalWidth + diff;

        if (teampPortalRightOverlayWidth >= 0 && tempPortalWidth > 15) {
          _portalRightOverlayWidth = teampPortalRightOverlayWidth;
          _portalWidth = tempPortalWidth;
          renderTimelinePortal();
          renderChartCurves();
          renderGrid();
        }
      }
      _lastX = e.clientX;
    });
  }

  /* ------ Init UI -------- */
  function createElemets(containerId) {
    var container = document.getElementById(containerId);

    var width = container.clientWidth;
    _width = width;

    createStyles(container);
    createPlayground(container);
    createGrid();
    createDateRule();

    /* Curve buttons */
    var divButtons = createElement("div", {
      style: "margin-top: 10px;"
    });

    /* Curves */
    Object.keys(_dataset.colors).forEach(function(key) {
      createTimelineCurve(key);

      var chartButton = createChartButton(key);
      _chartPaths.push({
        curveName: key,
        domLink: createChartCurve(key),
        show: true,
        icon: chartButton.buttonIcon,
        checkImg: chartButton.buttonCheckImg
      });

      chartButton.button.addEventListener("click", function(e) {
        chartButtonListener(key);
      });

      divButtons.appendChild(chartButton.button);
    });
    container.appendChild(divButtons);
    createPortal();
  }

  function createStyles(container) {
    var styles =
      ".button{display:inline-block;border:1px solid rgba(128,128,128,0.56);padding:5px 17px 5px 7px;border-radius:20px;margin-right:15px;font-family:Arial;user-select:none}.button:hover{cursor:default}.dsc-button-icon{display:inline-block;width:25px;height:25px;border-radius:50%;margin-right:5px;vertical-align:middle;position:relative}.dsc-button-icon > img{position:absolute;top:3px;left:4px}.dsc-button-text{display:inline-block;vertical-align:middle}";
    var styleTag = createElement("style", {});
    styleTag.innerHTML = styles;
    container.appendChild(styleTag);
  }

  function createPlayground(container) {
    _svg = createElementNS("svg", { width: _width, height: BASE_HEIGHT });
    container.appendChild(_svg);
  }

  function createGrid(container) {
    _gridPath = createElementNS("path", { fill: "none", stroke: "#eee", strokeWidth: 1 });
    _svg.appendChild(_gridPath);

    var gridPathD = "";
    var gridStart = BASE_HEIGHT - TIMELINE_HEIGHT - X_RULE_HEIGHT;
    var partHeight = gridStart / GRID_SECTION_COUNT;
    var y = gridStart + 0.5;
    for (var i = 0; i < GRID_SECTION_COUNT; i++) {
      var text = createElementNS("text", {
        x: 0,
        y: y - 5,
        style: "font: normal 14px Arial; fill:#7d7d7d; pointer-events: none;user-select: none;"
      });
      text.textContent = gridStart;
      _svg.appendChild(text);
      _gridYRule.push(text);

      gridPathD += "M0 " + y.toString() + " " + _width.toString() + " " + y.toString();

      y -= partHeight;
    }
    _gridPath.setAttribute("d", gridPathD);
  }

  function createTimelineCurve(key) {
    var timelineCurve = createElementNS("path", { fill: "none", stroke: _dataset.colors[key], strokeWidth: 1, d: "" });

    _svg.appendChild(timelineCurve);

    _timelinePaths.push({
      curveName: key,
      domLink: timelineCurve,
      show: true
    });
  }

  function createChartCurve(key) {
    var chartCurve = createElementNS("path", { fill: "none", stroke: _dataset.colors[key], strokeWidth: 2, d: "" });
    _svg.appendChild(chartCurve);
    return chartCurve;
  }

  function createChartButton(key) {
    var button = createElement("div", {
      class: "button"
    });

    var buttonIcon = createElement("div", {
      class: "dsc-button-icon",
      style: "border: 1px solid " + _dataset.colors[key] + "; background: " + _dataset.colors[key] + ";"
    });
    var buttonCheckImg = createElement("img", { src: CHECK_IMG });
    buttonIcon.appendChild(buttonCheckImg);

    var buttonText = createElement("div", { class: "dsc-button-text" });
    buttonText.innerText = _dataset.names[key];
    button.appendChild(buttonIcon);
    button.appendChild(buttonText);

    return {
      button,
      buttonIcon,
      buttonCheckImg
    };
  }

  function chartButtonListener(curveName) {
    _chartPaths.forEach(function(curve) {
      if (curve.curveName === curveName) {
        curve.show = !curve.show;
        if (curve.show) {
          curve.checkImg.setAttribute("style", "display: block;");
          curve.icon.setAttribute(
            "style",
            "background: " + _dataset.colors[curve.curveName] + ";border: 1px solid " + _dataset.colors[curve.curveName]
          );
        } else {
          curve.checkImg.setAttribute("style", "display: none;");
          curve.icon.setAttribute("style", "background: none;" + ";border: 1px solid " + _dataset.colors[curve.curveName]);
        }
      }
    });
    _timelinePaths.forEach(function(curve) {
      if (curve.curveName === curveName) curve.show = !curve.show;
    });
    renderChartCurves();
    renderTimelineCurves();
  }

  function createPortal() {
    var yTimeline = BASE_HEIGHT - TIMELINE_HEIGHT;
    _portalLeftOverlayWidth = _width - (PORTAL_BORDER_BASE_WIDTH + _portalWidth + PORTAL_BORDER_BASE_WIDTH);

    _portalLeftOverlay = createElementNS("rect", {
      x: 0,
      y: yTimeline,
      height: TIMELINE_HEIGHT,
      style: "fill-opacity: 0.7; fill: #efefef;"
    });

    _portalLeftBorder = createElementNS("rect", {
      x: 0,
      y: yTimeline,
      width: PORTAL_BORDER_BASE_WIDTH,
      height: TIMELINE_HEIGHT,
      style: "fill-opacity: 0.55; fill: #c1c1c1;"
    });

    _portal = createElementNS("path", { style: "fill: transparent; stroke-width:1; stroke: rgba(193, 193, 193, 0.55);" });

    _portalRightBorder = createElementNS("rect", {
      x: 0,
      y: yTimeline,
      width: PORTAL_BORDER_BASE_WIDTH,
      height: TIMELINE_HEIGHT,
      style: "fill-opacity: 0.55; fill: #c1c1c1; "
    });

    _portalRightOverlay = createElementNS("path", { style: "fill-opacity: 0.7; fill: #efefef;" });

    _svg.appendChild(_portalLeftOverlay);
    _svg.appendChild(_portalLeftBorder);
    _svg.appendChild(_portal);
    _svg.appendChild(_portalRightBorder);
    _svg.appendChild(_portalRightOverlay);
  }

  function createDateRule() {
    var partCount = (_width - DATE_LABEL_WIDTH - 10) / (DATE_LABEL_WIDTH + DATE_LABEL_RIGHT_MARGIN);
    var count = Math.floor(partCount);
    var partResidue = ((DATE_LABEL_WIDTH + DATE_LABEL_RIGHT_MARGIN) * (partCount % 1)) / count;

    var xPos = 10;
    var yPos = BASE_HEIGHT - TIMELINE_HEIGHT - X_RULE_HEIGHT / 2 + 2;
    for (var i = -1; i < count; i++) {
      var text = createElementNS("text", {
        x: xPos,
        y: yPos,
        style: "font: normal 14px Arial; fill:#7d7d7d; pointer-events: none;user-select: none;"
      });
      text.textContent = "May " + i;
      _svg.appendChild(text);
      xPos += DATE_LABEL_WIDTH + DATE_LABEL_RIGHT_MARGIN + partResidue;
      _gridXRule.push({
        textLink: text,
        x: xPos + DATE_LABEL_WIDTH / 2
      });
    }
  }

  /* ----------- Render -------------- */
  function renderTimelinePortal() {
    _portalLeftOverlay.setAttribute("width", _portalLeftOverlayWidth);

    _portalLeftBorder.setAttribute("x", _portalLeftOverlayWidth);

    _portal.setAttribute("x", _portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH);
    _portal.setAttribute(
      "d",
      "M" +
        (_portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH) +
        " " +
        (BASE_HEIGHT - TIMELINE_HEIGHT + 0.5) +
        " " +
        (_portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH + _portalWidth - 0.5) +
        " " +
        (BASE_HEIGHT - TIMELINE_HEIGHT + 0.5) +
        " " +
        (_portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH + _portalWidth - 0.5) +
        " " +
        (BASE_HEIGHT - 0.5) +
        " " +
        (_portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH) +
        " " +
        (BASE_HEIGHT - 0.5)
    );
    _portal.setAttribute("width", _portalWidth);

    _portalRightBorder.setAttribute("x", _portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH + _portalWidth);

    _portalRightOverlay.setAttribute(
      "d",
      "M" +
        (_portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH + _portalWidth + PORTAL_BORDER_BASE_WIDTH) +
        " " +
        (BASE_HEIGHT - TIMELINE_HEIGHT) +
        " " +
        _width +
        " " +
        (BASE_HEIGHT - TIMELINE_HEIGHT) +
        " " +
        _width +
        " " +
        BASE_HEIGHT +
        " " +
        (_portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH + _portalWidth + PORTAL_BORDER_BASE_WIDTH) +
        " " +
        BASE_HEIGHT
    );
  }

  function renderCurve(paths, yStart, maxHeight, portalStart, portalEnd) {
    var step = _width / (_dataset.columns[0].length - 2);
    var valuesStart = 1;
    var valuesEnd = _dataset.columns[0].length;
    if (portalStart && portalEnd) {
      valuesStart = Math.round(portalStart / step);
      valuesEnd = Math.round(portalEnd / step);
      step = _width / (valuesEnd - valuesStart - 1);
    }

    var maxY = -1;
    paths.forEach(function(path) {
      if (path.show) {
        var maxInVector = getMax(findCurveValues(path.curveName), valuesStart, valuesEnd);
        if (maxInVector > maxY) maxY = maxInVector;
      }
    });

    maxY += maxY * 0.1;
    _currentMaxValue = maxY;

    paths.forEach(function(path) {
      if (!path.show) {
        path.domLink.setAttribute("d", "");
        return;
      }
      var values = findCurveValues(path.curveName);

      var pathD = "M";
      var x = 0;
      for (var valuesIndex = valuesStart; valuesIndex < valuesEnd; valuesIndex++) {
        var y = yStart - (maxHeight * values[valuesIndex]) / maxY;
        pathD += x.toString() + " " + y.toString() + " ";
        x += step;
      }

      path.domLink.setAttribute("d", pathD);
    });
  }

  function renderTimelineCurves() {
    renderCurve(_timelinePaths, BASE_HEIGHT, TIMELINE_HEIGHT);
  }

  function renderChartCurves() {
    var cachedHeight = BASE_HEIGHT - TIMELINE_HEIGHT - X_RULE_HEIGHT;
    var cachedWidth = _portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH;
    renderCurve(_chartPaths, cachedHeight, cachedHeight, cachedWidth, cachedWidth + _portalWidth);
  }

  function renderGrid() {
    var portalStart = _portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH;
    var portalEnd = _portalLeftOverlayWidth + PORTAL_BORDER_BASE_WIDTH + _portalWidth;
    var step = _width / (_dataset.columns[0].length - 1);
    var max = _gridXRule[_gridXRule.length - 1].x;
    var start = Math.round(portalStart / step);
    var end = Math.round(portalEnd / step);
    var intervalCount = end - start;

    var yPos = 0;
    var partSize = Math.round(_currentMaxValue / GRID_SECTION_COUNT);
    _gridYRule.forEach(function(item) {
      item.textContent = yPos;
      yPos += partSize;
    });

    _gridXRule.forEach(function(item) {
      var xProcent = 100 / (max / item.x);
      var relativeIndex = Math.round((intervalCount / 100) * xProcent);
      var valueIndex = start + relativeIndex;
      var date = new Date(_dataset.columns[0][valueIndex]);
      item.textLink.textContent = monthNames[date.getMonth()] + " " + date.getDate();
    });
  }

  /* ------------- Utils --------------  */
  function findCurveValues(curveName) {
    for (var i = 0; i < _dataset.columns.length; i++) {
      if (_dataset.columns[i][0] == curveName) return _dataset.columns[i];
    }
  }

  function getMax(array, start, end) {
    if (!array || !array.length) return null;
    var max = array[1];
    for (var i = start; i < end; i++) {
      if (array[i] > max) {
        max = array[i];
      }
    }
    return max;
  }

  function svgCursorPoint(evt) {
    var pt = _svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;

    if (_svg === null) return pt.matrixTransform(svg.getScreenCTM().inverse());
    else return pt.matrixTransform(_svg.getScreenCTM().inverse());
  }

  function createElementNS(tag, attributes) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attributes).forEach(function(key) {
      el.setAttributeNS(null, transformAttrName(key), attributes[key]);
    });
    return el;
  }

  function createElement(tag, attributes) {
    var el = document.createElement(tag);
    Object.keys(attributes).forEach(function(key) {
      el.setAttribute(transformAttrName(key), attributes[key]);
    });
    return el;
  }

  function transformAttrName(value) {
    var result = "";
    for (var i = 0; i < value.length; i++) {
      if (value[i] == value[i].toUpperCase()) {
        result += "-" + value[i].toLowerCase();
      } else {
        result += value[i];
      }
    }
    return result;
  }

  /*                  Public section
   ***************************************************/

  var DsChart = {};

  DsChart.render = function(id, column) {
    _dataset = column;
    createElemets(id);
    initEventListener();

    renderTimelineCurves();
    renderChartCurves();
    renderTimelinePortal();
    renderGrid();
  };

  window.DsChart = DsChart;
})(window);

function run() {
  DsChart.render("chart_1", chart_data[4]);
}
