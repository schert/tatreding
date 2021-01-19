$(document).ready(function() {
  var graphContainer = $("#chartContainer");
  var symbol = pathname[1] + pathname[2];

  var dim = {
    width: graphContainer.width(),
    height: 500,
    margin: {
      top: 20,
      right: 50,
      bottom: 30,
      left: 50
    },
    ohlc: {
      height: 305
    },
    indicator: {
      height: 65,
      padding: 5
    }
  };
  dim.plot = {
    width: dim.width - dim.margin.left - dim.margin.right,
    height: dim.height - dim.margin.top - dim.margin.bottom
  };
  dim.indicator.top = dim.ohlc.height + dim.indicator.padding;
  dim.indicator.bottom = dim.indicator.top + dim.indicator.height + dim.indicator.padding;

  var indicatorTop = d3.scaleLinear()
    .range([dim.indicator.top, dim.indicator.bottom]);

  var parseDate = d3.timeParse("%Y-%m-%dT%H:%M:%S.%LZ");

  var zoom = d3.zoom()
    .on("zoom", zoomed);

  var x = techan.scale.financetime()
    .range([0, dim.plot.width]);

  var y = d3.scaleLinear()
    .range([dim.ohlc.height, 0]);


  var yPercent = y.copy(); // Same as y at this stage, will get a different domain later

  var yInit, yPercentInit, zoomableInit;

  var yVolume = d3.scaleLinear()
    .range([y(0), y(0.2)]);

  var candlestick = techan.plot.candlestick()
    .xScale(x)
    .yScale(y);

  var tradearrow = techan.plot.tradearrow()
    .xScale(x)
    .yScale(y)
    .y(function(d) {
      // Display the buy and sell arrows a bit above and below the price, so the price is still visible
      if (d.type === 'buy') return y(d.low) + 5;
      if (d.type === 'sell') return y(d.high) - 5;
      else return y(d.price);
    });

  var sma0 = techan.plot.sma()
    .xScale(x)
    .yScale(y);

  var sma1 = techan.plot.sma()
    .xScale(x)
    .yScale(y);

  var ema2 = techan.plot.ema()
    .xScale(x)
    .yScale(y);

  var volume = techan.plot.volume()
    .accessor(candlestick.accessor()) // Set the accessor to a ohlc accessor so we get highlighted bars
    .xScale(x)
    .yScale(yVolume);

  var trendline = techan.plot.trendline()
    .xScale(x)
    .yScale(y);

  var xAxis = d3.axisBottom(x);

  var timeAnnotation = techan.plot.axisannotation()
    .axis(xAxis)
    .orient('bottom')
    .format(d3.timeFormat('%d/%m %H:%M'))
    .width(65)
    .translate([0, dim.plot.height]);

  var yAxis = d3.axisRight(y);

  var ohlcAnnotation = techan.plot.axisannotation()
    .axis(yAxis)
    .orient('right')
    .format(d3.format(',.5f'))
    .translate([x(1), 0]);

  var closeAnnotation = techan.plot.axisannotation()
    .axis(yAxis)
    .orient('right')
    .accessor(candlestick.accessor())
    .format(d3.format(',.5f'))
    .translate([x(1), 0]);

  var percentAxis = d3.axisLeft(yPercent)
    .tickFormat(d3.format('+.1%'));

  var percentAnnotation = techan.plot.axisannotation()
    .axis(percentAxis)
    .orient('left');

  var supstance = techan.plot.supstance()
    .xScale(x)
    .yScale(y)
    .annotation([ohlcAnnotation, percentAnnotation]);

  var stopPriceTreding = techan.plot.close()
    .xScale(x)
    .yScale(y);

  var stopPriceLongTerm = techan.plot.close()
    .xScale(x)
    .yScale(y);

  var volumeAxis = d3.axisRight(yVolume)
    .ticks(3)
    .tickFormat(d3.format(",.3s"));

  var volumeAnnotation = techan.plot.axisannotation()
    .axis(volumeAxis)
    .orient("right")
    .width(35);

  var macdScale = d3.scaleLinear()
    .range([indicatorTop(0) + dim.indicator.height, indicatorTop(0)]);

  var rsiScale = macdScale.copy()
    .range([indicatorTop(1) + dim.indicator.height, indicatorTop(1)]);

  var macd = techan.plot.macd()
    .xScale(x)
    .yScale(macdScale);

  var macdAxis = d3.axisRight(macdScale)
    .ticks(3);

  var macdAnnotation = techan.plot.axisannotation()
    .axis(macdAxis)
    .orient("right")
    .format(d3.format(',.2f'))
    .translate([x(1), 0]);

  var macdAxisLeft = d3.axisLeft(macdScale)
    .ticks(3);

  var macdAnnotationLeft = techan.plot.axisannotation()
    .axis(macdAxisLeft)
    .orient("left")
    .format(d3.format(',.2f'));

  var rsi = techan.plot.rsi()
    .xScale(x)
    .yScale(rsiScale);

  var rsiAxis = d3.axisRight(rsiScale)
    .ticks(3);

  var rsiAnnotation = techan.plot.axisannotation()
    .axis(rsiAxis)
    .orient("right")
    .format(d3.format(',.2f'))
    .translate([x(1), 0]);

  var rsiAxisLeft = d3.axisLeft(rsiScale)
    .ticks(3);

  var rsiAnnotationLeft = techan.plot.axisannotation()
    .axis(rsiAxisLeft)
    .orient("left")
    .format(d3.format(',.2f'));

  var ohlcCrosshair = techan.plot.crosshair()
    .xScale(timeAnnotation.axis().scale())
    .yScale(ohlcAnnotation.axis().scale())
    .xAnnotation(timeAnnotation)
    .yAnnotation([ohlcAnnotation, percentAnnotation, volumeAnnotation])
    .verticalWireRange([0, dim.plot.height]);

  var macdCrosshair = techan.plot.crosshair()
    .xScale(timeAnnotation.axis().scale())
    .yScale(macdAnnotation.axis().scale())
    .xAnnotation(timeAnnotation)
    .yAnnotation([macdAnnotation, macdAnnotationLeft])
    .verticalWireRange([0, dim.plot.height]);

  var rsiCrosshair = techan.plot.crosshair()
    .xScale(timeAnnotation.axis().scale())
    .yScale(rsiAnnotation.axis().scale())
    .xAnnotation(timeAnnotation)
    .yAnnotation([rsiAnnotation, rsiAnnotationLeft])
    .verticalWireRange([0, dim.plot.height]);

  var svg = d3.select("#chartContainer").append("svg")
    .attr("width", dim.width)
    .attr("height", dim.height);

  var defs = svg.append("defs");

  defs.append("clipPath")
    .attr("id", "ohlcClip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", dim.plot.width)
    .attr("height", dim.ohlc.height);

  defs.append("clipPath")
    .attr("id", "supstanceClip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", dim.plot.width)
    .attr("height", dim.ohlc.height);

  defs.selectAll("indicatorClip").data([0, 1])
    .enter()
    .append("clipPath")
    .attr("id", function(d, i) {
      return "indicatorClip-" + i;
    })
    .append("rect")
    .attr("x", 0)
    .attr("y", function(d, i) {
      return indicatorTop(i);
    })
    .attr("width", dim.plot.width)
    .attr("height", dim.indicator.height);

  svg = svg.append("g")
    .attr("transform", "translate(" + dim.margin.left + "," + dim.margin.top + ")");

  svg.append('text')
    .attr("class", "symbol")
    .attr("x", 20)
    .text("Tatreding Algorithm");

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + dim.plot.height + ")");

  var ohlcSelection = svg.append("g")
    .attr("class", "ohlc")
    .attr("transform", "translate(0,0)");

  ohlcSelection.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + x(1) + ",0)")
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -12)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Prezzo (€)");

  ohlcSelection.append("g")
    .attr("class", "closed annotation up");

  ohlcSelection.append("g")
    .attr("class", "volume")
    .attr("clip-path", "url(#ohlcClip)");

  ohlcSelection.append("g")
    .attr("class", "candlestick")
    .attr("clip-path", "url(#ohlcClip)");

  ohlcSelection.append("g")
    .attr("class", "indicator sma ma-0")
    .attr("clip-path", "url(#ohlcClip)");

  ohlcSelection.append("g")
    .attr("class", "indicator sma ma-1")
    .attr("clip-path", "url(#ohlcClip)");

  ohlcSelection.append("g")
    .attr("class", "indicator ema ma-2")
    .attr("clip-path", "url(#ohlcClip)");

  ohlcSelection.append("g")
    .attr("class", "percent axis");

  ohlcSelection.append("g")
    .attr("class", "volume axis");

  var indicatorSelection = svg.selectAll("svg > g.indicator").data(["macd", "rsi"]).enter()
    .append("g")
    .attr("class", function(d) {
      return d + " indicator";
    });

  indicatorSelection.append("g")
    .attr("class", "axis right")
    .attr("transform", "translate(" + x(1) + ",0)");

  indicatorSelection.append("g")
    .attr("class", "axis left")
    .attr("transform", "translate(" + x(0) + ",0)");

  indicatorSelection.append("g")
    .attr("class", "indicator-plot")
    .attr("clip-path", function(d, i) {
      return "url(#indicatorClip-" + i + ")";
    });

  // Add trendlines and other interactions last to be above zoom pane
  svg.append('g')
    .attr("class", "crosshair ohlc");

  svg.append("g")
    .attr("class", "tradearrow")
    .attr("clip-path", "url(#ohlcClip)");

  svg.append('g')
    .attr("class", "crosshair macd");

  svg.append('g')
    .attr("class", "crosshair rsi");

  svg.append("g")
    .attr("class", "trendlines analysis")
    .attr("clip-path", "url(#ohlcClip)");

  svg.append("g")
    .attr("class", "supstancesBuy analysis");

  svg.append("g")
    .attr("class", "supstancesSell analysis");

  svg.append("g")
    .attr("class", "lastSupstancesBuy analysis");

  svg.append("g")
    .attr("class", "lastSupstancesSell analysis");

  svg.append("g")
    .attr("class", "stopPriceTreding")
    .attr("clip-path", "url(#ohlcClip)");

  svg.append("g")
    .attr("class", "stopPriceLongTerm")
    .attr("clip-path", "url(#ohlcClip)");


  // d3.csv("data.csv", function(error, data) {
  var data = [];
  socket.on('chartData', function(dataObj) {

    if (data.length == 0 && dataObj.realtime) {
      return;
    }

    var accessor = candlestick.accessor(),
      indicatorPreRoll = 0; // Don't show where indicators don't have data

    dataIn = dataObj.data;
    dataIn = dataIn.map(function(d) {
      return {
        date: parseDate(d.date),
        open: +d.open,
        high: +d.high,
        low: +d.low,
        close: +d.close,
        volume: +d.volume,
        stopPrice: d.stopPrice
      };
    });

    dataIn.forEach((item, i) => {
      var obj = data.pop();

      if (obj) {
        if (item.date.getTime() === obj.date.getTime()) {
          data.push(item);
        } else if (item.date.getTime() > obj.date.getTime()) {
          data.push(obj);
          data.push(item);
        } else {
          data.push(obj);
        }
      } else {
        data.push(item);
      }
    });

    data.sort(function(a, b) {
      return d3.ascending(accessor.d(a), accessor.d(b));
    });

    var dataStopTreding = data.map(function(d) {
      return {
        date: d.date,
        close: +d.stopPrice.treding
      };
    });

    var dataStopLongTerm = data.map(function(d) {
      return {
        date: d.date,
        close: +d.stopPrice.longTerm
      };
    });

    realtimeUpdate(data[data.length - 1]);

    x.domain(techan.scale.plot.time(data).domain());
    y.domain(techan.scale.plot.ohlc(data.slice(indicatorPreRoll)).domain());
    yPercent.domain(techan.scale.plot.percent(y, accessor(data[indicatorPreRoll])).domain());
    yVolume.domain(techan.scale.plot.volume(data).domain());

    var trendlineData = [
      // {
      //   start: {
      //     date: new Date(2014, 2, 11),
      //     value: 72.50
      //   },
      //   end: {
      //     date: new Date(2014, 5, 9),
      //     value: 63.34
      //   }
      // },
      // {
      //   start: {
      //     date: new Date(2013, 10, 21),
      //     value: 43
      //   },
      //   end: {
      //     date: new Date(2014, 2, 17),
      //     value: 70.50
      //   }
      // }
    ];

    // var supstanceData = [
    //   {
    //     start: new Date(2014, 2, 11),
    //     end: new Date(2014, 5, 9),
    //     value: 63.64
    //   },
    //   {
    //     start: new Date(2013, 10, 21),
    //     end: new Date(2014, 2, 17),
    //     value: 55.50
    //   }
    // ];

    var sellData = [];
    var buyData = [];
    $.each(orders, function(k, v) {
      if (v.side == 'SELL' && v.symbolFrom + v.symbolTo == symbol) {
        sellData.push({
          start: parseDate(v.time),
          end: data[data.length - 1].date,
          value: v.price
        });
      } else if (v.side == 'BUY') {
        buyData.push({
          start: parseDate(v.time),
          end: data[data.length - 1].date,
          value: v.price
        })
      }
    });

    var macdData = techan.indicator.macd()(data);
    macdScale.domain(techan.scale.plot.macd(macdData).domain());
    var rsiData = techan.indicator.rsi()(data);
    rsiScale.domain(techan.scale.plot.rsi(rsiData).domain());

    svg.select("g.candlestick").datum(data).call(candlestick);
    svg.select("g.closed.annotation").datum([data[data.length - 1]]).call(closeAnnotation);
    svg.select("g.volume").datum(data).call(volume);
    svg.select("g.sma.ma-0").datum(techan.indicator.sma().period(10)(data)).call(sma0);
    svg.select("g.sma.ma-1").datum(techan.indicator.sma().period(20)(data)).call(sma1);
    svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(50)(data)).call(ema2);
    svg.select("g.macd .indicator-plot").datum(macdData).call(macd);
    svg.select("g.rsi .indicator-plot").datum(rsiData).call(rsi);

    svg.select("g.crosshair.ohlc").call(ohlcCrosshair).call(zoom);
    svg.select("g.crosshair.macd").call(macdCrosshair).call(zoom);
    svg.select("g.crosshair.rsi").call(rsiCrosshair).call(zoom);
    // svg.select("g.trendlines").datum(trendlineData).call(trendline).call(trendline.drag);
    // svg.select("g.supstances").datum(supstanceData).call(supstance).call(supstance.drag);
    svg.select("g.stopPriceTreding").datum(dataStopTreding).call(stopPriceTreding);
    svg.select("g.stopPriceLongTerm").datum(dataStopLongTerm).call(stopPriceLongTerm);

    svg.select("g.supstancesSell").datum(sellData.slice(0, sellData.length - 1)).call(supstance);
    svg.select("g.supstancesBuy").datum(buyData.slice(0, buyData.length - 1)).call(supstance);
    svg.select("g.lastSupstancesSell").datum(sellData.length > 1 ? [sellData[sellData.length - 1]] : sellData).call(supstance);
    svg.select("g.lastSupstancesBuy").datum(buyData.length > 1 ? [buyData[buyData.length - 1]] : buyData).call(supstance);


    // svg.select("g.tradearrow").datum(trades).call(tradearrow);

    // Stash for zooming
    zoomableInit = x.zoomable().domain([indicatorPreRoll, data.length]).copy(); // Zoom in a little to hide indicator preroll
    yInit = y.copy();
    yPercentInit = yPercent.copy();

    if (previousDomanin.x)
      resetZoom();

    draw();
  });

  function resetZoom() {
    x.zoomable().domain(previousDomanin.x);
    y.domain(previousDomanin.y);
    yPercent.domain(previousDomanin.yPercent);

    draw();
  }

  var previousDomanin = {};

  function zoomed() {
    x.zoomable().domain(previousDomanin.x = d3.event.transform.rescaleX(zoomableInit).domain());
    y.domain(previousDomanin.y = d3.event.transform.rescaleY(yInit).domain());
    yPercent.domain(previousDomanin.yPercent = d3.event.transform.rescaleY(yPercentInit).domain());

    draw();
  }

  function draw() {
    svg.select("g.x.axis").call(xAxis);
    svg.select("g.ohlc .axis").call(yAxis);
    svg.select("g.volume.axis").call(volumeAxis);
    svg.select("g.percent.axis").call(percentAxis);
    svg.select("g.macd .axis.right").call(macdAxis);
    svg.select("g.rsi .axis.right").call(rsiAxis);
    svg.select("g.macd .axis.left").call(macdAxisLeft);
    svg.select("g.rsi .axis.left").call(rsiAxisLeft);

    // We know the data does not change, a simple refresh that does not perform data joins will suffice.
    svg.select("g.candlestick").call(candlestick.refresh);
    svg.select("g.closed.annotation").call(closeAnnotation.refresh);
    svg.select("g.volume").call(volume.refresh);
    svg.select("g .sma.ma-0").call(sma0.refresh);
    svg.select("g .sma.ma-1").call(sma1.refresh);
    svg.select("g .ema.ma-2").call(ema2.refresh);
    svg.select("g.macd .indicator-plot").call(macd.refresh);
    svg.select("g.rsi .indicator-plot").call(rsi.refresh);
    svg.select("g.crosshair.ohlc").call(ohlcCrosshair.refresh);
    svg.select("g.crosshair.macd").call(macdCrosshair.refresh);
    svg.select("g.crosshair.rsi").call(rsiCrosshair.refresh);
    svg.select("g.trendlines").call(trendline.refresh);
    // svg.select("g.supstances").call(supstance.refresh);
    svg.select("g.tradearrow").call(tradearrow.refresh);
    svg.select("g.supstancesSell").call(supstance.refresh);
    svg.select("g.supstancesBuy").call(supstance.refresh);
    svg.select("g.lastSupstancesSell").call(supstance.refresh);
    svg.select("g.lastSupstancesBuy").call(supstance.refresh);
    svg.select("g.stopPriceTreding").call(stopPriceTreding.refresh);
    svg.select("g.stopPriceLongTerm").call(stopPriceLongTerm.refresh);
  }
});
