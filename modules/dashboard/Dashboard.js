import '/modules/css/dashboard/dashboard.css';
import {Translator} from "/modules/common/locale/Translator";
import {isString} from "/modules/common/util";
import {formatArea} from "/modules/common/areaUtil";
import Plotly from '/node_modules/plotly.js-dist-min';
import {mean as calcMean} from "/modules/common/stattUtil";
import {formatDuration} from "/modules/common/durationUtil";
import {NiceScale} from "./NiceScale";
import {ModalHalf} from "/modules/common/ui/Modal";
import isMobile from "/node_modules/is-mobile";


let LOGGER;

class Dashboard {

    colors = [
        '#809A6F',
        '#a25b5b',
        '#96ab88',
        '#b47877',
        '#acbca1',
        '#c49594',
        '#c3cdbb',
        '#d4b3b2',
        '#d9dfd6',
        '#e3d2d1',
    ];

    barChartLayout = {
        autosize: true,
        height: 250,
        margin: {
            l: 35,
            r: 5,
            b: 5,
            t: 5
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        showlegend: false,
        xaxis: {
            type: 'category',
            zerolinewidth: 0.5,
            zerolinecolor: 'rgb(200,200,200)',
            gridcolor: 'rgba(200,200,200,0.5)',
            linecolor: 'rgba(0,0,0,0)',
            linewidth: 0,
            automargin: true,
            tickfont: {
                size: 10
            },
            fixedrange: true
        },
        yaxis: {
            zerolinewidth: 0.5,
            zerolinecolor: 'rgb(200,200,200)',
            gridcolor: 'rgba(200,200,200,0.5)',
            linecolor: 'rgba(0,0,0,0)',
            linewidth: 0,
            tickfont: {
                size: 10
            },
            fixedrange: true
        }
    }

    lineChartLayout = {
        autosize: true,
        height: 250,
        margin: {
            l: 35,
            r: 5,
            b: 5,
            t: 5
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        showlegend: false,
        xaxis: {
            type: 'category',
            zerolinewidth: 0.5,
            zerolinecolor: 'rgb(200,200,200)',
            gridcolor: 'rgba(200,200,200,0.5)',
            linecolor: 'rgba(0,0,0,0)',
            linewidth: 0,
            automargin: true,
            tickfont: {
                size: 10
            },
            fixedrange: true
        },
        yaxis: {
            zerolinewidth: 0.5,
            zerolinecolor: 'rgb(200,200,200)',
            gridcolor: 'rgba(200,200,200,0.5)',
            linecolor: 'rgba(0,0,0,0)',
            linewidth: 0,
            tickfont: {
                size: 10
            },
            fixedrange: true
        }
    }

    pieChartLayout = {
        autosize: true,
        height: 250,
        margin: {
            l: 20,
            r: 20,
            b: 20,
            t: 25,
            pad: 2
        },
        textposition: 'outside',
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        showlegend: true
    }

    constructor(locale, translations, config, targetId, logger) {
        LOGGER = logger;
        this.translator = new Translator(locale, translations);
        this.config = config;
        this.targetId = targetId;
        if (targetId) {
            if (isString(targetId)) {
                this.target = $('#' + targetId);
                if (this.target.length === 0) {
                    throw 'No element found for targetId';
                }
            } else {
                throw 'Target must be the id of a DOM element';
            }
        } else {
            throw 'No target';
        }
        this.isMobileDevice = isMobile();

        this.onChangeCallbacks = [];
        this.elementTargets = [];

        this.minYear = 2001;
        const now = new Date();
        this.maxYear = now.getMonth() + 1 >= 3
            ? now.getFullYear()
            : now.getFullYear() - 1;
        this.maxYearHistory = now.getFullYear() - 1;

        this.chartConfig = {
            responsive: true,
            showSendToCloud: false,
            modeBarButtonsToRemove: ['select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'resetScale2d'],
            modebarStyle: {
                orientation: this.isMobileDevice ? 'v' : 'h',
                y: -1
            }
        }

        this.stackedBarChartLayout = {
            autosize: true,
            height: 280,
            margin: {
                l: 35,
                r: 5,
                b: 5,
                t: this.isMobileDevice ? 15 : 5
            },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            showlegend: true,
            legend: {
                orientation: "h",
                y: -.15,
            },
            barmode: "stack",
            xaxis: {
                type: 'category',
                zerolinewidth: 0.5,
                zerolinecolor: 'rgb(200,200,200)',
                gridcolor: 'rgba(200,200,200,0.5)',
                linecolor: 'rgba(0,0,0,0)',
                linewidth: 0,
                automargin: true,
                tickfont: {
                    size: 10
                },
                fixedrange: true
            },
            yaxis: {
                tickvals: [0, 20, 40, 60, 80, 100],
                zerolinewidth: 0.5,
                zerolinecolor: 'rgb(200,200,200)',
                gridcolor: 'rgba(200,200,200,0.5)',
                linecolor: 'rgba(0,0,0,0)',
                linewidth: 0,
                tickfont: {
                    size: 10
                },
                fixedrange: true
            }
        }

    }

    run() {
        this._initFilters();

        this._initTotalIgnition();
        this._initHourlyIgnition();
        this._initMonthlyIgnition();
        this._initHistoryIgnition();

        this._initTotalArea();
        this._initMonthlyArea();
        this._initHistoryArea();

        this._initTotalCause();
        this._initHourlyCause();
        this._initMonthlyCause();
        this._initHistoryCause();

        this._initTotalDuration();
        this._initTotalDurationHistory();
        this._initResponseTime();
        this._initResponseTimeHistory();
        this._initFightDuration();
        this._initFightDurationHistory();

        this._initShare();

        this._change();

        $(window).scroll(() => this._scroll());
    }

    _change() {
        this.elementTargets.forEach(e => e.empty().data("loaded", false))
        this.onChangeCallbacks.forEach(c => c());
    }

    _scroll() {
        this.onChangeCallbacks.forEach(c => c());
    }

    onChange(callback) {
        this.onChangeCallbacks.push(callback);
    }

    _initFilters() {

        const urlSearchParams = new URLSearchParams(window.location.search);
        this.year = urlSearchParams.get('year')
            ? Number(urlSearchParams.get('year'))
            : cache4js.loadCache('dashboard_year', this.maxYear);
        this.lau1 = urlSearchParams.get('lau1')
            ? urlSearchParams.get('lau1')
            : cache4js.loadCache('dashboard_lau1', undefined);

        const lau1Select = $('select.filter-lau1');
        cache4js.ajaxCache({
            url: this.config.lau1ListUrl
        }, 1 * 60 * 60).done(lau1List => {
            lau1List.features
                .sort((l1, l2) => l1.properties.code.localeCompare(l2.properties.code))
                .forEach(lau1 => {
                    lau1Select.append($('<option value="' + lau1.properties.code + '">' + lau1.properties.name + '</option>'))
                });
                    lau1Select.val(this.lau1?this.lau1:"all");
        });
        const self = this;
        lau1Select.change(function () {
            self.lau1 = $(this).val();
            if (self.lau1 === 'all')
                self.lau1 = undefined;
            else cache4js.storeCache('dashboard_lau1',self.lau1);
            self._change();
        });


        const yearSelect = $('select.filter-year');
        for (let y = this.minYear; y <= this.maxYear; y++) {
            const option = $('<option value="' + y + '">' + y + '</option>');
            yearSelect.append(option);
            if (y === this.year)
                option.attr('selected', 'selected');
        }
        yearSelect.change(function () {
            self.year = Number($(this).val());
            cache4js.storeCache('dashboard_year',self.year);
            self._change();
        });
    }

    _initElement(elementTarget, renderFunction) {
        this.elementTargets.push(elementTarget);
        this.onChange(() => {
            if (!elementTarget.data("loaded") && this._isScrolledIntoView(elementTarget)) {
                elementTarget.removeClass('no-data');
                try {
                    renderFunction(elementTarget);
                } catch (e) {
                    if (e === 'NO_DATA') {
                        this._addNoDataMessage(elementTarget);
                    }
                }
                elementTarget.data("loaded", true);
            }
        });
    }

    _addNoDataMessage(elementTarget) {
        elementTarget.append(
            $('<div class="no-data">' + this.translator.translate('dashboard.noData') + '</div>')
        ).addClass('no-data');
    }

    _dummyRender = function (elementTarget) {
        setTimeout(function () {
            elementTarget.data("loadCount", (elementTarget.data("loadCount") ? elementTarget.data("loadCount") : 0) + 1);
            elementTarget.empty().append('<div>LOADED ' + elementTarget.data("loadCount") + '</div>');
        }, Math.random() * 1000);
    }

    _isScrolledIntoView(elem) {
        const docViewTop = $(window).scrollTop();
        const docViewBottom = docViewTop + $(window).height();
        const elemTop = $(elem).offset().top;
        const elemBottom = elemTop + $(elem).height() / 2;
        return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }

    _verifyHistoryData(historyTargetObj) {
        let hasData = true;
        for (let i = this.minYear; i <= this.maxYearHistory; i++) {
            if (!historyTargetObj[i]) {
                hasData = false;
                break;
            }
        }
        return hasData;
    }

    _fillHistoryFromFeatures(data, historyTargetObj) {
        for (let i = this.minYear; i <= this.maxYearHistory; i++)
            historyTargetObj[i] = [];
        data.features
            .map(f => f.properties)
            .filter(f => f.year <= this.maxYearHistory)
            .forEach(f => historyTargetObj[f.year].push(f))
    }

    _renderBarChart(data, chartElement, min = undefined, max = undefined) {
        const layout = JSON.parse(JSON.stringify(this.barChartLayout));
        layout.xaxis.type = 'category';
        const config = JSON.parse(JSON.stringify(this.chartConfig));

        data.type = 'bar';
        data.marker = {
            color: this.colors[0]
        };
        const frame = {
            data: [data],
            traces: [0],
            layout: layout
        }

        const sortedY = data.y.slice().sort((y1, y2) => y1 - y2);
        if (min === undefined)
            min = sortedY[0];
        if (max === undefined)
            max = sortedY[sortedY.length - 1] * 1.1;
        layout.yaxis.range = [min, max];

        Plotly.newPlot(chartElement[0], [{
            x: data.x,
            y: data.y.map(() => null),
            type: data.type,
            marker: data.marker,
            hovertemplate: "%{y}<extra></extra>",
        }], layout, config).then(() => {
            Plotly.animate(chartElement[0], frame)
        });
        new ResizeObserver(function () {
            Plotly.relayout(chartElement[0], {height: 250, autosize: true});
        }).observe(chartElement[0]);
    }

    _renderStackedBarChart(dataSeries, chartElement, xlabels) {
        const layout = JSON.parse(JSON.stringify(this.stackedBarChartLayout));
        layout.xaxis.type = 'category';
        const config = JSON.parse(JSON.stringify(this.chartConfig));

        let colorIndex = dataSeries.length - 1;
        dataSeries.reverse().forEach(data => {
            data.x = xlabels ? xlabels : data.x.map(x => x + "")
            data.type = 'bar';
            data.barmode = 'stack';
            data.sort = false;
            data.marker = {
                color: this.colors[colorIndex--]
            };
            data.hovertemplate = "%{y:$2.f}%";
        });

        Plotly.newPlot(chartElement[0], dataSeries, layout, config);

        function relayout() {
            Plotly.relayout(chartElement[0], {height: 280, autosize: true});
        }

        setTimeout(relayout, 500);
        new ResizeObserver(relayout).observe(chartElement[0]);
    }

    _renderLineChart(data, chartElement, min = undefined, max = undefined) {
        const layout = JSON.parse(JSON.stringify(this.lineChartLayout));
        layout.xaxis.type = 'category';
        const config = JSON.parse(JSON.stringify(this.chartConfig));

        data.type = 'line';
        data.line = {shape: 'spline', smoothing: 0.75};
        data.marker = {
            color: this.colors[0]
        };
        data.hovertemplate = data.text?"%{text}":"%{y}<extra></extra>";


        const sortedY = data.y.slice().sort((y1, y2) => y1 - y2);
        if (min === undefined)
            min = sortedY[0];
        if (max === undefined)
            max = sortedY[sortedY.length - 1] * 1.1;
        layout.yaxis.range = [min, max];

        function frame(i) {
            return {
                data: [{
                    x: data.x,
                    y: data.y.slice(0, i + 1).concat(data.y.slice(i + 1, data.y.length).map(() => null)),
                    type: data.type,
                    line: data.line,
                    text: data.text,
                    name: data.name,
                    hovertemplate: data.hovertemplate,
                    marker: data.marker
                }],
                traces: [0],
                layout: layout
            };
        }

        const animate = (i) => {
            Plotly.animate(chartElement[0], frame(i), {
                transition: {
                    duration: 50,
                    easing: 'cubic-in-out',
                },
                frame: {
                    duration: 50,
                }
            });
        };
        let newPlotPromise = Plotly.newPlot(chartElement[0], [{
            x: data.x,
            y: data.y.map(() => null),
            type: data.type,
            text: data.text,
            name: data.name,
            hovertemplate: data.hovertemplate,
            marker: data.marker
        }], layout, config);

        for (let i = 0; i < data.x.length; i++)
            newPlotPromise = newPlotPromise.then(() => animate(i));

        new ResizeObserver(function () {
            Plotly.relayout(chartElement[0], {height: 250, autosize: true});
        }).observe(chartElement[0]);
    }

    _renderAdvancedLineChart(dataSeries, chartElement, min = undefined, max = undefined, yAxisTicks) {
        const layout = JSON.parse(JSON.stringify(this.lineChartLayout));
        layout.xaxis.type = 'category';
        layout.showlegend = dataSeries.length > 1;
        const config = JSON.parse(JSON.stringify(this.chartConfig));

        let c = 0;
        let chartMin = min !== undefined ? min : Number.MAX_VALUE,
            chartMax = max !== undefined ? max : Number.MIN_VALUE;
        dataSeries.forEach(d => {
            d.type = 'line';
            d.line = {shape: 'spline', smoothing: 0.75};
            d.marker = {
                color: this.colors[c++]
            };
            d.hovertemplate = "%{text}";

            if (!yAxisTicks) {
                if (min === undefined)
                    chartMin = Math.min(chartMin, Math.min.apply(Math, d.y));
                if (max === undefined)
                    chartMax = Math.max(chartMax, Math.max.apply(Math, d.y));
            }
        });
        if (!yAxisTicks)
            layout.yaxis.range = [chartMin, chartMax];
        else {
            layout.yaxis.tickmode = "array";
            layout.yaxis.tickvals = yAxisTicks.vals;
            layout.yaxis.ticktext = yAxisTicks.labels;
        }

        Plotly.newPlot(chartElement[0], dataSeries, layout, config);
        new ResizeObserver(function () {
            Plotly.relayout(chartElement[0], {height: 250, autosize: true});
        }).observe(chartElement[0]);
    }

    _renderPieChart(data, chartElement) {
        const layout = JSON.parse(JSON.stringify(this.pieChartLayout));
        const config = JSON.parse(JSON.stringify(this.chartConfig));

        data.type = 'pie';
        data.sort = false;
        data.hole = .4;

        data.marker = {
            colors: this.colors
        };

        Plotly.newPlot(chartElement[0], [{
            labels: data.labels,
            values: data.values.map(() => Math.random()),
            type: data.type,
            sort: data.sort,
            marker: data.marker,
            hole: data.hole
        }], layout, config).then(() => {
            const frames = [];
            const animationConfig = {
                frame: [],
                transition: [],
                mode: 'afterall'
            };
            for (let i = 0; i < 10; i++) {
                animationConfig.frame.push({duration: 2});
                animationConfig.transition.push({duration: 4});
                frames.push({
                    name: 'frame' + i,
                    data: [{
                        labels: data.labels,
                        values: data.values.map(() => Math.random()),
                        type: data.type,
                        sort: data.sort,
                        marker: data.marker,
                        hole: data.hole
                    }]
                });
            }

            //real data as one more frame
            frames.push(chartElement[0], {
                    data: [data],
                    traces: [0],
                    layout: layout,
                    name: 'realData'
                }
            );
            animationConfig.frame.push({duration: 2});
            animationConfig.transition.push({duration: 4});

            Plotly.addFrames(chartElement[0], frames);
            Plotly.animate(chartElement[0], frames.map(f => f.name), animationConfig);
        });
        new ResizeObserver(function () {
            Plotly.relayout(chartElement[0], {height: 250, autosize: true});
        }).observe(chartElement[0]);
    }


    _initTotalIgnition() {
        const chartTarget = $('.ignition.counter .body', this.target);
        if (!this.totalFireData)
            this.totalFireData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const count = features
                    .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                    .map(f => f.count)
                    .filter(count => count)
                    .reduce((c1, c2) => c1 + c2, 0);
                elementTarget.empty().append($('<div class="number"><div class="value_">' + count + '</div></div>')).addClass('number');
                setTimeout(() => $('.number .value_', elementTarget).addClass('value'), 100);
            };
            if (this.totalFireData[this.year]) {
                afterFetch(this.totalFireData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalFireYearlyUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.totalFireData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.totalFireData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initHourlyIgnition() {
        const chartTarget = $('.ignition.hourly .body', this.target);
        if (!this.hourlyFireData)
            this.hourlyFireData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const data = {
                    x: [],
                    y: [],
                    hours: []
                }
                for (let h = 0; h <= 23; h++) {
                    data.x.push(h.pad(2) + 'h');
                    data.hours.push(h);
                    data.y.push(0);
                }
                features
                    .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                    .forEach(f => {
                        data.y[data.hours.indexOf(f.hour)] += f.count
                    });
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderBarChart(data, chartElement, 0);
            };
            if (this.hourlyFireData[this.year]) {
                afterFetch(this.hourlyFireData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalFireHourlyUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.hourlyFireData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.hourlyFireData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initMonthlyIgnition() {
        const chartTarget = $('.ignition.monthly .body', this.target);
        if (!this.monthlyFireData)
            this.monthlyFireData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const data = {
                    x: [],
                    y: [],
                    months: []
                }
                for (let m = 1; m <= 12; m++) {
                    data.x.push(m + '');
                    data.months.push(m);
                    data.y.push(0);
                }
                features
                    .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                    .forEach(f => {
                        data.y[data.months.indexOf(f.month)] += f.count
                    });
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderBarChart(data, chartElement, 0);
            };
            if (this.monthlyFireData[this.year]) {
                afterFetch(this.monthlyFireData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalFireMonthlyUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.monthlyFireData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.monthlyFireData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initHistoryIgnition() {
        const chartTarget = $('.ignition.history .body', this.target);
        if (!this.totalFireData)
            this.totalFireData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = featuresByYear => {
                const data = {
                    x: [],
                    y: []
                }
                for (let y in featuresByYear) {
                    if (y >= this.minYear && y <= this.maxYearHistory) {
                        data.x.push(y);
                        data.y.push(0);
                        featuresByYear[y]
                            .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                            .forEach(f => {
                                data.y[data.x.indexOf(y)] += f.count
                            });
                    }
                }
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderLineChart(data, chartElement, 0);
            };

            if (this._verifyHistoryData(this.totalFireData)) {
                afterFetch(this.totalFireData);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalFireYearlyUrl.format(["0"])
                }, 1 * 60 * 60).done(data => {
                    this._fillHistoryFromFeatures(data, this.totalFireData);
                    try {
                        afterFetch(this.totalFireData);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }


    _initTotalArea() {
        const chartTarget = $('.area.counter .body', this.target);
        if (!this.totalAreaData)
            this.totalAreaData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const sum = features
                    .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                    .map(f => f.total_area)
                    .reduce((a1, a2) => a1 + a2, 0);
                elementTarget.empty().append($('<div class="number"><div class="value_">' + formatArea(sum) + '</div></div>')).addClass('number');
                setTimeout(() => $('.number .value_', elementTarget).addClass('value'), 100);
            };
            if (this.totalAreaData[this.year]) {
                afterFetch(this.totalAreaData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalAreaYearlyUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.totalAreaData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.totalAreaData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initMonthlyArea() {
        const chartTarget = $('.area.monthly .body', this.target);
        if (!this.monthlyAreaData)
            this.monthlyAreaData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const data = {
                    x: [],
                    y: [],
                    months: []
                }
                for (let m = 1; m <= 12; m++) {
                    data.x.push(m + '');
                    data.months.push(m);
                    data.y.push(0);
                }
                features
                    .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                    .forEach(f => {
                        data.y[data.months.indexOf(f.month)] += f.total_area / 10_000
                    });
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderBarChart(data, chartElement, 0);
            };
            if (this.monthlyAreaData[this.year]) {
                afterFetch(this.monthlyAreaData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalAreaMonthlyUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.monthlyAreaData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.monthlyAreaData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initHistoryArea() {
        const chartTarget = $('.area.history .body', this.target);
        if (!this.totalAreaData)
            this.totalAreaData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = featuresByYear => {
                const data = {
                    x: [],
                    y: [],
                    text:[],
                    name:this.translator.translate("dashboard.series.name.totaAreaHistory")
                }
                for (let year in featuresByYear) {
                    if (year >= this.minYear && year <= this.maxYearHistory) {
                        data.x.push(year);
                        data.y.push(0);
                        data.text.push(0);
                        featuresByYear[year]
                            .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                            .forEach(f => {
                                data.y[data.x.indexOf(year)] += f.total_area / 1e+6; //let's show in km2
                                data.text[data.x.indexOf(year)] += f.total_area;
                            });
                    }
                }
                data.text = data.text.map(t=>formatArea(t));
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderLineChart(data, chartElement, 0);
            };

            if (this._verifyHistoryData(this.totalAreaData)) {
                afterFetch(this.totalAreaData);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalAreaYearlyUrl.format(["0"])
                }, 1 * 60 * 60).done(data => {
                    this._fillHistoryFromFeatures(data, this.totalAreaData);
                    try {
                        afterFetch(this.totalAreaData);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }


    _getCountsByCauseType(features, periodName = undefined, periodGroups = undefined) {
        const counts = {};
        features = features.filter(f => this.lau1 ? f.lau1_code === this.lau1 : true);
        if (features.length === 0)
            throw 'NO_DATA';
        const order = [
            "NATURAL",
            "REKINDLE",
            "NEGLIGENT",
            "DELIBERATE",
            "UNKNOWN"
        ];
        if (periodGroups && periodName) {
            order.forEach(o => counts[o] = {});
            features.forEach(f => {
                const causeType = f.cause_type_code ? f.cause_type_code : 'UNKNOWN';
                counts[causeType][f[periodName]] = (counts[causeType][f[periodName]] ? counts[causeType][f[periodName]] : 0) + f.count;
            });
            const res = [];
            let sums = {};
            for (let ct in order) {
                const data = {x: [], y: [], name: this.translator.translate('fire.ref.cause_type.' + order[ct])};
                res.push(data);
                if (counts[order[ct]]) {
                    periodGroups.forEach(p => {
                        data.x.push(p);
                        const count = counts[order[ct]][p] ? counts[order[ct]][p] : 0;
                        if (!sums[p])
                            sums[p] = 0;
                        sums[p] += count;
                        data.y.push(count);
                    });
                }
            }
            for (let ct in order) {
                for (let i = 0; i < periodGroups.length; i++)
                    res[ct].y[i] = res[ct].y[i] === 0
                        ? 0
                        : (res[ct].y[i] / sums[periodGroups[i]] * 100).round(2)
            }
            return res;

        } else {
            features.forEach(f => {
                const causeType = f.cause_type_code ? f.cause_type_code : 'UNKNOWN';
                counts[causeType] = (counts[causeType] ? counts[causeType] : 0) + f.count;
            });
            const res = {labels: [], values: []};
            for (let o in order) {
                if (counts[order[o]]) {
                    res.labels.push(this.translator.translate('fire.ref.cause_type.' + order[o]));
                    res.values.push(counts[order[o]]);
                }
            }
            return res;
        }

    }

    _initTotalCause() {
        const chartTarget = $('.cause.year .body', this.target);
        if (!this.totalCauseData)
            this.totalCauseData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const data = this._getCountsByCauseType(features);
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderPieChart(data, chartElement);
            };
            if (this.totalCauseData[this.year]) {
                afterFetch(this.totalCauseData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardCauseTypeYearlyUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.totalCauseData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.totalCauseData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initHourlyCause() {
        const chartTarget = $('.cause.hourly .body', this.target);
        if (!this.hourlyCauseData)
            this.hourlyCauseData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
                const data = this._getCountsByCauseType(features, 'hour', hours);
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderStackedBarChart(data, chartElement, hours.map(h => h.pad(2) + 'h'));
            };
            if (this.hourlyCauseData[this.year]) {
                afterFetch(this.hourlyCauseData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardCauseTypeHourlyUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.hourlyCauseData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.hourlyCauseData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initMonthlyCause() {
        const chartTarget = $('.cause.monthly .body', this.target);
        if (!this.monthlyCauseData)
            this.monthlyCauseData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                const data = this._getCountsByCauseType(features, 'month', months);
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderStackedBarChart(data, chartElement);
            };
            if (this.monthlyCauseData[this.year]) {
                afterFetch(this.monthlyCauseData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardCauseTypeMonthlyUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.monthlyCauseData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.monthlyCauseData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initHistoryCause() {
        const chartTarget = $('.cause.history .body', this.target);
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = featuresByYear => {
                const features = Object.keys(featuresByYear)
                    .reduce((accumulated, y2) => accumulated.concat(featuresByYear[y2]), []);
                const years = [];
                for (let i = this.minYear; i <= this.maxYearHistory; i++)
                    years.push(i);
                const data = this._getCountsByCauseType(features, 'year', years);
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderStackedBarChart(data, chartElement);
            };
            if (this.totalCauseData[this.year]) {
                afterFetch(this.totalCauseData);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardCauseTypeYearlyUrl.format(["0"])
                }, 1 * 60 * 60).done(data => {
                    this._fillHistoryFromFeatures(data, this.totalCauseData);
                    try {
                        afterFetch(this.totalCauseData);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }


    _getDurationHistoryData(features) {
        const dataMean = {
            x: [],
            y: [],
            name: this.translator.translate("duration.mean")
        };
        let hasData = false;
        for (let i = this.minYear; i <= this.maxYearHistory; i++) {
            const values = features[i]
                .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                .filter(f => f.min > 1000 * 60 && f.max < 1000 * 60 * 60 * 24 * 60); //between 1 min and 60 days
            hasData = hasData || values.length > 0;
            dataMean.x.push(i);
            dataMean.y.push(values.length > 0 ? calcMean(values.map(v => v.median)) : null);
        }
        if (!hasData)
            throw 'NO_DATA';
        dataMean.text = dataMean.y.map(y => formatDuration(y));

        const niceScale = new NiceScale(Math.min.apply(Math, dataMean.y), Math.max.apply(Math, dataMean.y), 10);
        const yTicks = [];
        for (let i = niceScale.getNiceLowerBound(); i <= niceScale.getNiceUpperBound(); i += niceScale.getTickSpacing()) {
            yTicks.push(i);
        }
        return {dataMean, yTicks};
    }

    _initResponseTime() {
        const chartTarget = $('.response-time.year .body', this.target);
        if (!this.responseTimeData)
            this.responseTimeData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const values = features
                    .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                    .filter(f => f.min > 1000 * 60 && f.max < 1000 * 60 * 60 * 24 * 60); //between 1 min and 60 days
                if (values.length === 0)
                    throw 'NO_DATA';
                const min = Math.min.apply(Math, values.map(v => v.min));
                const max = Math.max.apply(Math, values.map(v => v.max));
                const mean = calcMean(values.map(v => v.median));
                const numbers = $(
                    '<div class="number three-values">' +
                    '   <div class="value_ main"><div class="header">' + this.translator.translate("duration.mean") + '</div>' + formatDuration(mean) + '</div>' +
                    '   <div class="value_"><div class="header">' + this.translator.translate("duration.min") + '</div>' + formatDuration(min) + '</div>' +
                    '   <div class="value_"><div class="header">' + this.translator.translate("duration.max") + '</div>' + formatDuration(max) + '</div>' +
                    '</div>');
                elementTarget.empty().append(numbers).addClass('number');
                setTimeout(() => $('.number .value_', elementTarget).addClass('value'), 100);
            };
            if (this.responseTimeData[this.year]) {
                afterFetch(this.responseTimeData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardResponseTimeUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.responseTimeData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.responseTimeData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initResponseTimeHistory() {
        const chartTarget = $('.response-time.history .body', this.target);
        if (!this.responseTimeData)
            this.responseTimeData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const {dataMean, yTicks} = this._getDurationHistoryData(features);
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderAdvancedLineChart([dataMean], chartElement, 0, undefined, {
                    vals: yTicks, labels: yTicks.map(y => formatDuration(y))
                });
            };
            if (this._verifyHistoryData(this.responseTimeData)) {
                afterFetch(this.responseTimeData);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardResponseTimeUrl.format(["0"])
                }, 1 * 60 * 60).done(data => {
                    this._fillHistoryFromFeatures(data, this.responseTimeData);
                    try {
                        afterFetch(this.responseTimeData);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initFightDuration() {
        const chartTarget = $('.firefighting-duration.year .body', this.target);
        if (!this.fightDurationData)
            this.fightDurationData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const values = features
                    .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                    .filter(f => f.min > 1000 * 60 && f.max < 1000 * 60 * 60 * 24 * 60); //between 1 min and 60 days
                if (values.length === 0)
                    throw 'NO_DATA';
                const min = Math.min.apply(Math, values.map(v => v.min));
                const max = Math.max.apply(Math, values.map(v => v.max));
                const mean = calcMean(values.map(v => v.median));
                const numbers = $(
                    '<div class="number three-values">' +
                    '   <div class="value_ main"><div class="header">' + this.translator.translate("duration.mean") + '</div>' + formatDuration(mean) + '</div>' +
                    '   <div class="value_"><div class="header">' + this.translator.translate("duration.min") + '</div>' + formatDuration(min) + '</div>' +
                    '   <div class="value_"><div class="header">' + this.translator.translate("duration.max") + '</div>' + formatDuration(max) + '</div>' +
                    '</div>');
                elementTarget.empty().append(numbers).addClass('number');
                setTimeout(() => $('.number .value_', elementTarget).addClass('value'), 100);
            };
            if (this.fightDurationData[this.year]) {
                afterFetch(this.fightDurationData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardFirefightingDurationUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.fightDurationData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.fightDurationData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initFightDurationHistory() {
        const chartTarget = $('.firefighting-duration.history .body', this.target);
        if (!this.fightDurationData)
            this.fightDurationData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const {dataMean, yTicks} = this._getDurationHistoryData(features);
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderAdvancedLineChart([dataMean], chartElement, 0, undefined, {
                    vals: yTicks, labels: yTicks.map(y => formatDuration(y))
                });
            };
            if (this._verifyHistoryData(this.fightDurationData)) {
                afterFetch(this.fightDurationData);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardFirefightingDurationUrl.format(["0"])
                }, 1 * 60 * 60).done(data => {
                    this._fillHistoryFromFeatures(data, this.fightDurationData);
                    try {
                        afterFetch(this.fightDurationData);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initTotalDuration() {
        const chartTarget = $('.duration.year .body', this.target);
        if (!this.totalDurationData)
            this.totalDurationData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const values = features
                    .filter(f => this.lau1 ? f.lau1_code === this.lau1 : true)
                    .filter(f => f.min > 1000 * 60 && f.max < 1000 * 60 * 60 * 24 * 60); //between 1 min and 60 days
                if (values.length === 0)
                    throw 'NO_DATA';
                const min = Math.min.apply(Math, values.map(v => v.min));
                const max = Math.max.apply(Math, values.map(v => v.max));
                const mean = calcMean(values.map(v => v.median));
                const numbers = $(
                    '<div class="number three-values">' +
                    '   <div class="value_ main"><div class="header">' + this.translator.translate("duration.mean") + '</div>' + formatDuration(mean) + '</div>' +
                    '   <div class="value_"><div class="header">' + this.translator.translate("duration.min") + '</div>' + formatDuration(min) + '</div>' +
                    '   <div class="value_"><div class="header">' + this.translator.translate("duration.max") + '</div>' + formatDuration(max) + '</div>' +
                    '</div>');
                elementTarget.empty().append(numbers).addClass('number');
                setTimeout(() => $('.number .value_', elementTarget).addClass('value'), 100);
            };
            if (this.totalDurationData[this.year]) {
                afterFetch(this.totalDurationData[this.year]);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalDurationUrl.format([this.year + ""])
                }, 1 * 60 * 60).done(data => {
                    this.totalDurationData[this.year] = data.features.map(f => f.properties);
                    try {
                        afterFetch(this.totalDurationData[this.year]);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }

    _initTotalDurationHistory() {
        const chartTarget = $('.duration.history .body', this.target);
        if (!this.totalDurationData)
            this.totalDurationData = {};
        this._initElement(chartTarget, elementTarget => {
            const afterFetch = features => {
                const {dataMean, yTicks} = this._getDurationHistoryData(features);
                const chartElement = $('<div class="chart"></div>');
                elementTarget.empty().append(chartElement);
                this._renderAdvancedLineChart([dataMean], chartElement, 0, undefined, {
                    vals: yTicks, labels: yTicks.map(y => formatDuration(y))
                });
            };
            if (this._verifyHistoryData(this.totalDurationData)) {
                afterFetch(this.totalDurationData);
            } else {
                cache4js.ajaxCache({
                    url: this.config.dashboardTotalDurationUrl.format(["0"])
                }, 1 * 60 * 60).done(data => {
                    this._fillHistoryFromFeatures(data, this.totalDurationData);
                    try {
                        afterFetch(this.totalDurationData);
                    } catch (e) {
                        if (e === 'NO_DATA')
                            this._addNoDataMessage(elementTarget)
                    }
                });
            }
        });
    }


    _initShare(){
        this.shareModal = new ModalHalf(this.translator, $('body'), 'share_modal');
        const self = this;
        $('.share-container button.share-button').click(function (){
            self.shareModal.setTitle(self.translator.translate('dashboard.share.title'));
            const dashboardUrl = self.config.dashboardUrl+'?year={0}{1}'.format([
                ""+self.year,
                self.lau1?("&lau1="+self.lau1):""
            ]);
            const twitterUrl = 'https://twitter.com/intent/tweet?text='+
                self.translator.translate('dashboard.share.twitter.text')+"&url=" +
                encodeURIComponent(dashboardUrl);

            const shareContent = $(
                '<div>'+
                '   <div class="context">'+self.translator.translate('dashboard.share.context')+'</div>' +
                '   <div class="share-url share-element"><label>'+self.translator.translate('dashboard.share.url')+'<br/><input type="text" readonly value="'+ dashboardUrl+'"></label></div>'+
                '   <div class="share-twitter share-element">' +
                '      <label>'+self.translator.translate('dashboard.share.twitter')+'</label><br/>' +
                '      <button class="tweet-button" type="button"><i class="fa-brands fa-square-twitter"></i></button>'+
                '   </div>'+
                '</div>'
            );
            $('.share-url input',shareContent).click(function (){
                $(this).select();
            });
            $('button.tweet-button',shareContent).click(function (){
                window.open(twitterUrl,'_blank');
            });
            self.shareModal.setContent(shareContent);
            self.shareModal.show();
        })
    }
}

export {Dashboard}