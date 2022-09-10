import 'ol/ol.css';
import '../css/map/ui.css';
import '../css/map/map.css';
import '../css/map/map.responsive.css';
import '../css/map/sliders.css';
import '../css/map/sliders.responsive.css';
import {isString} from "../common/util";
import {Translator} from "../common/locale/Translator";
import {ModalFull, ModalHalf} from "../common/ui/Modal";
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import {get as getProjection, getTransform, transform} from "ol/proj";
import {Cluster, TileWMS, XYZ} from "ol/source";
import TileGrid from "ol/tilegrid/TileGrid";
import {applyTransform, boundingExtent, getWidth} from "ol/extent";
import {Vector as VectorLayer} from "ol/layer";
import VectorSource from "ol/source/Vector";
import {GeoJSON} from "ol/format";
import {bbox} from "ol/loadingstrategy";
import {Fill, Icon, Stroke, Style, Text} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {Popup} from "./ui/Popup";
import isMobile from "is-mobile";
import {Coordinates} from "./ui/Coordinates";
import Plotly from 'plotly.js-dist-min';
import {classifyAreasFromFeatures, formatArea, MIN_VALID_AREA} from "../common/areaUtil";
import {dateFromStr, formatTs} from "../common/dateUtil";
import {
    classifyDurationsFromFeatures,
    classifyFirefightingDurationsFromFeatures,
    classifyResponseTimesFromFeatures,
    formatDuration,
    getDuration,
    MIN_VALID_DURATION
} from "../common/durationUtil";

const MERCATOR_CODE = "EPSG:3857";
const WGS84_CODE = "EPSG:4326";
const TILE_IMAGE_SIZE = 256;

const MAX_SMALL_HEIGHT_THRESHOLD = 680;
const MAX_SMALL_WIDTH_THRESHOLD = 950;

let LOGGER;

function transformExtent(extent, sourceProjCode, targetProjCode) {
    const transformFunction = getTransform(sourceProjCode, targetProjCode);
    return applyTransform(extent, transformFunction);
}

class FireMap {

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
    }

    run() {
        this.isMobileDevice = isMobile();
        if (this.isMobileDevice) {
            this.target.addClass('mobile-device');
            $(this.target.parents('body')[0]).addClass('mobile-device');
        } else {
            this.target.removeClass('mobile-device');
            $(this.target.parents('body')[0]).removeClass('mobile-device');
        }

        this.target.addClass('fire-map');
        this._initSizeMonitoring();
        this._initMap();
        this._initSliders();
        this._initCount();
        this._initFilters();
        this._fireSummaryLayer();
        this._firePointsLayer();
        this._initCharts();
        this._initShare();
        this._initAbout();
    }

    _initSizeMonitoring() {
        const self = this;

        function checkSmallMap() {
            const mapWidth = self.target.width();
            const mapHeight = self.target.height();
            const mapAbsolutePosition = self.target.offset();
            self.isSmallMapWidth = mapWidth < MAX_SMALL_WIDTH_THRESHOLD
            self.isSmallMapHeight = mapHeight < MAX_SMALL_HEIGHT_THRESHOLD;
            if (self.isSmallMapWidth) {
                self.target.addClass('small-map-width').addClass('small-map');
                $('body').addClass('small-map-width').addClass('small-map');
            } else {
                self.target.removeClass('small-map-width');
                $('body').removeClass('small-map-width');
            }
            if (self.isSmallMapHeight) {
                self.target.addClass('small-map-height').addClass('small-map');
                $('body').addClass('small-map-height').addClass('small-map');
            } else {
                self.target.removeClass('small-map-height');
                $('body').removeClass('small-map-height');
            }
            if (!self.isSmallMapHeight && !self.isSmallMapWidth) {
                self.target.removeClass('small-map');
                $('body').removeClass('small-map');
            }
        }

        new ResizeObserver(checkSmallMap).observe(this.target[0]);
        checkSmallMap();
    }

    _initMap() {
        const layers = [new TileLayer({
            source: new XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                maxZoom: 19,
                attributions: ['<div>Sources: Esri, DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community</div>']
            }), opacity: .85
        })];
        this._initTileGrid();
        this._initContextLayer();
        layers.push(this.contextLayer);

        const mapResolutions = this.config.mercatorResolutions.slice(this.config.minZoomLevel, this.config.maxZoomLevel + 1);

        const urlSearchParams = new URLSearchParams(window.location.search);
        const center = urlSearchParams.get('center')
            ? JSON.parse(urlSearchParams.get('center'))
            : cache4js.loadCache('center', transform(this.config.center, WGS84_CODE, MERCATOR_CODE));
        const zoomLevel = urlSearchParams.get('zoom')
            ? Number(urlSearchParams.get('zoom'))
            : cache4js.loadCache('zoomLevel', mapResolutions.indexOf(this.config.mercatorResolutions[this.config.defaultZoomLevel]));


        this.map = new Map({
            layers: layers,
            target: this.targetId,
            view: new View({
                center: center,
                projection: MERCATOR_CODE,
                resolutions: mapResolutions,
                resolution: mapResolutions[zoomLevel],
                constrainResolution: true,
                enableRotation: false,
                multiWorld: false
            })
        });
        window.map = this.map;//TODO remove

        this.uiTarget = $('.ol-overlaycontainer-stopevent', this.target);
        const self = this;
        const zoomWorldButton = $(
            '<button type="button" class="ol-zoom-extent" title="' + self.translator.translate("button.zoomWorld") + '">' +
            '   <i class="fa-solid fa-expand"></i>' +
            '</button>');
        zoomWorldButton.insertAfter('.fire-map .ol-zoom .ol-zoom-in');
        zoomWorldButton.click(function () {
            self.map.getView().fit(transformExtent(self.config.dataExtent, WGS84_CODE, MERCATOR_CODE));
        });

        this.coordinates = new Coordinates(this.translator, this.isMobileDevice, this.uiTarget);
        const onNavigationCoords = () => {
            const center = self.map.getView().getCenter();
            self.coordinates.onNavigation(center);
            cache4js.storeCache("center", center);
            cache4js.storeCache("zoom", self.map.getView().getZoom());
        };
        this.map.getView().on('change:center', onNavigationCoords);
        this.map.getView().on('change:resolution', onNavigationCoords);
        this.coordinates.getOLControls().forEach(c => this.map.addControl(c));
        this.uiTarget.append(this.coordinates.getUIElement());
        onNavigationCoords();
    }

    _initContextLayer() {
        this.contextLayer = new TileLayer({
            extent: transformExtent(this.config.dataExtent, WGS84_CODE, MERCATOR_CODE), source: new TileWMS({
                url: this.config.contextLayerUrl,
                params: {
                    HEIGHT: TILE_IMAGE_SIZE,
                    WIDTH: TILE_IMAGE_SIZE,
                    TILED: true,
                    FORMAT: 'image/png',
                    SRS: MERCATOR_CODE,
                    CRS: MERCATOR_CODE
                },
                serverType: 'geoserver',
                transition: 0,
                interpolate: false,
                tileGrid: this.tileGrid,
                attributions: ['<div>Distritos, Concelhos e Freguesias: Carta Administrativa Oficial de Portugal - Direção Geral do Território ; Toponímia: OpenStreetMaps</div>']
            }),
            minZoom: 2
        });
    }

    _initTileGrid() {
        const projection = getProjection(MERCATOR_CODE);
        const projectionExtent = projection.getExtent();
        const size = getWidth(projectionExtent) / TILE_IMAGE_SIZE;
        this.resolutions = new Array(this.config.maxZoomLevel);
        for (let z = 0; z < this.config.maxZoomLevel; ++z) {
            this.resolutions[z] = size / Math.pow(2, z);
        }

        this.tileGrid = new TileGrid({
            extent: projectionExtent, resolutions: this.resolutions, tileSize: [TILE_IMAGE_SIZE, TILE_IMAGE_SIZE]
        });
    }

    _initSliders() {
        const minYear = 2001;
        const now = new Date();
        if (now.getMonth() === 0) { //if this is january
            this.maxYear = now.getFullYear() - 1;
            this.maxMonthOfMaxYear = 12; //for the current year we stop at last month
        } else {
            this.maxYear = now.getFullYear();
            this.maxMonthOfMaxYear = now.getMonth(); //for the current year we stop at last month
        }

        const defaultMonth = this.maxMonthOfMaxYear;
        const defaultYear = this.maxYear;
        const urlSearchParams = new URLSearchParams(window.location.search);
        this.year = urlSearchParams.get('year')
            ? Number(urlSearchParams.get('year'))
            : cache4js.loadCache('year', defaultYear);
        this.month = urlSearchParams.get('month')
            ? Number(urlSearchParams.get('month'))
            : cache4js.loadCache('month', defaultMonth);

        const self = this;

        this.uiTarget.append('<div class="sliders-container"></div>');

        function createSliders(justMonth = false) {
            self.maxMonth = self.year === self.maxYear ? self.maxMonthOfMaxYear : 12;
            const yearContainer =
                '<div class="slider-year slider-container">' +
                '   <div class="input-container">' +
                '       <input type="range" step="1" min="' + minYear + '" max="' + self.maxYear + '" value="' + self.year + '"/>' +
                '   </div>' +
                '   <div class="slider-ticks"></div>' +
                '</div>';
            const monthContainer =
                '<div class="slider-month slider-container" style="width:' + (100 / 13 * (self.maxMonth + 1)) + '%">' +
                '   <div class="input-container">' +
                '       <input type="range" step="1" min="0" max="' + self.maxMonth + '" value="' + self.month + '"/>' +
                '   </div>' + '   <div class="slider-ticks"></div>' +
                '</div>';
            let uiElement;
            if (justMonth) {
                uiElement = $('.sliders', $('.sliders-container'));
                $('.slider-month', uiElement).remove();
                uiElement.append($(monthContainer));
            } else {
                uiElement = $('<div class="sliders">' + yearContainer + monthContainer + '</div>');
                $('.sliders-container').empty().append(uiElement);
            }

            if (!justMonth) {
                let count = 0;
                for (let i = minYear; i <= self.maxYear; i++) {
                    $('.slider-year .slider-ticks', uiElement).append($('<div class="label" title="' + i + '">' + (count % 3 === 0 || i === minYear || i === self.maxYear ? i : '') + '</div>').click(function () {
                        $('.slider-year input', uiElement).val(i).change();
                    }));
                    count++;
                }
            }

            if (self.maxMonth > 1) {
                $('.slider-month .slider-ticks', uiElement).append($('<div class="label" title="' + self.translator.translate('slider.all.months') + '">' + self.translator.translate('slider.all.months') + '</div>').click(function () {
                    $('.slider-month input', uiElement).val(0).change();
                }))
            }
            for (let i = 1; i <= self.maxMonth; i++) {
                $('.slider-month .slider-ticks', uiElement).append($('<div class="label" title="' + i + '">' + self.translator.translate('slider.month.name.' + i) + '</div>').click(function () {
                    $('.slider-month input', uiElement).val(i).change();
                }))
            }

            if (!justMonth) {
                $('.slider-year input', uiElement).change(function () {
                    self.year = Number($('.slider-year input').val());
                    createSliders(true);
                    self._unselect();
                    self._onChangeYear();
                }).on('input', function () {
                    $(this).trigger('change');
                });
            }
            $('.slider-month input', uiElement).change(function () {
                self.month = Number($('.slider-month input').val());
                self._unselect();
                self._onChangeMonth();
            }).on('input', function () {
                $(this).trigger('change');
            });
        }

        createSliders();
    }

    _initFilters() {
        const self = this;
        const urlSearchParams = new URLSearchParams(window.location.search);
        const cause = urlSearchParams.get('cause')
            ? urlSearchParams.get('cause')
            : cache4js.loadCache('causeFilterValue', undefined);
        const minArea = urlSearchParams.get('minArea')
            ? Number(urlSearchParams.get('minArea'))
            : cache4js.loadCache('areaFilterValue', 0.01);

        this.filtersElement = $(
            '<div class="filters-container collapsed">' +
            '   <div class="action">' + this.translator.translate('filter.action') + '</div>' +
            '   <div class="filter cause-type">' +
            '       <label for="filter_cause_type">' + this.translator.translate('fire.label.cause_type') + '</label>' +
            '       <select name="cause_type" id="filter_cause_type">' +
            '           <option value="">--</option>' +
            '           <option '+(cause&&cause==='NATURAL'?'selected="selected"':'')+'value="NATURAL">' + this.translator.translate('fire.ref.cause_type.NATURAL') + '</option>' +
            '           <option '+(cause&&cause==='DELIBERATE'?'selected="selected"':'')+'value="DELIBERATE">' + this.translator.translate('fire.ref.cause_type.DELIBERATE') + '</option>' +
            '           <option '+(cause&&cause==='REKINDLE'?'selected="selected"':'')+'value="REKINDLE">' + this.translator.translate('fire.ref.cause_type.REKINDLE') + '</option>' +
            '           <option '+(cause&&cause==='NEGLIGENT'?'selected="selected"':'')+'value="NEGLIGENT">' + this.translator.translate('fire.ref.cause_type.NEGLIGENT') + '</option>' +
            '       </select>' +
            '   </div>' +
            '   <div class="filter total-area">' +
            '       <label for="filter_total_area">' + this.translator.translate('filter.total_area') + '</label>' +
            '       <input name="total_area" type="number" id="filter_total_area" min="0" value="'+minArea+'"/>' +
            '   </div>' +
            '</div>'
        ).click(function (event) {
            event.stopPropagation();
            self.filtersElement.removeClass('collapsed')
        });
        $(window).click(function () {
            self.filtersElement.addClass('collapsed')
        });

        this.filterValues = {};

        function updateFilterValues() {
            if (self.updateFeaturesTimeout) {
                clearTimeout(self.updateFeaturesTimeout);
            }
            self.causeFilterValue = $('#filter_cause_type').val();
            self.areaFilterValue = $('#filter_total_area').val();
            cache4js.storeCache('causeFilterValue',self.causeFilterValue);
            cache4js.storeCache('areaFilterValue',self.areaFilterValue);
            self.updateFeaturesTimeout = setTimeout(function () {
                $('.filter select, .filter input', self.filtersElement).each(function () {
                    self.filterValues[$(this).attr('name')] = $(this).val();
                });
                self._onChangeMonth();
            }, 250);
        }

        this.uiTarget.append(this.filtersElement);
        $('#filter_cause_type').change(updateFilterValues);
        $('#filter_total_area').change(updateFilterValues);
        updateFilterValues();

        this.map.getView().on('change:resolution', () => self._updateFilters());
        this.map.getView().on('change:center', () => self._updateFilters());
        this._updateFilters();
    }

    _updateFilters() {
        if (this.map.getView().getZoom() <= 2) {
            this.filtersElement.hide();
            $('.count-container', this.uiTarget).hide();
            $('.charts-button-container', this.uiTarget).hide();
        } else {
            this.filtersElement.show();
            $('.count-container', this.uiTarget).show();
            $('.charts-button-container', this.uiTarget).show();
        }

        if (this.updateFiltersTimeout) {
            clearTimeout(this.updateFiltersTimeout);
        }
        const self = this;
        this.updateFiltersTimeout = setTimeout(function () {
            const visibleFeatures = self._getVisibleFeatures();
            const count = visibleFeatures.length;
            $('.count', $('.count-container', self.uiTarget)).html(self.translator.translate("map.count", ["" + count]))
            if (count < 10)
                $('.charts-button-container button', self.uiTarget).addClass('disabled').attr('disabled', 'disabled');
            else $('.charts-button-container button', self.uiTarget).removeClass('disabled').removeAttr('disabled');

        }, 250);
    }

    _getVisibleFeatures() {
        const extent = this.map.getView().calculateExtent(this.map.getSize());
        return this.vectorSourceFirePoints.getFeaturesInExtent(extent);
    }

    _unselect() {
        this.fireMultipolygonsLayer.setVisible(false);
        if (this.fireMultipolygonsLayer.getSource())
            this.fireMultipolygonsLayer.getSource().clear(true);
        this.selectedFireLayer.setVisible(false);
        if (this.selectedFireLayer.getSource())
            this.selectedFireLayer.getSource().clear(true);
        if (this.firePopup)
            this.firePopup.hide();
        if (this.selectedFeaturesInCluster) {
            this.selectedFeaturesInCluster.setStyle(null);
            this.selectedFeaturesInCluster = undefined;
        }
        this.selectedFireCoords = undefined;
        this.selectedFireId = undefined;
    }

    _fireSummaryLayer() {
        this.fireSummaryLayer = new TileLayer({
            extent: transformExtent(this.config.dataExtent, WGS84_CODE, MERCATOR_CODE),
            source: this._getFireSummaryLayerSource(),
            maxZoom: 2
        });
        this.map.addLayer(this.fireSummaryLayer);
    }

    _getFireSummaryLayerSource() {
        return new TileWMS({
            url: this.config.fireSummaryLayerUrl,
            params: {
                HEIGHT: TILE_IMAGE_SIZE,
                WIDTH: TILE_IMAGE_SIZE,
                TILED: true,
                FORMAT: 'image/png',
                SRS: MERCATOR_CODE,
                CRS: MERCATOR_CODE,
                viewparams: "year:{0};month:{1}".format([this.year, this.month])
            },
            serverType: 'geoserver',
            transition: 0,
            interpolate: false,
            // tileGrid: this.tileGrid,
            attributions: ['<div>Incêndios: Instituto da Conservação da Natureza e das Florestas</div>']
        })
    }

    _firePointsLayer() {
        const self = this;
        if (!this.firePointsLayer) {
            this.fireMultipolygonsLayer = new VectorLayer({
                visible: false, style: new Style({
                    stroke: new Stroke({
                        color: '#AAAAAA', width: 3,
                    }), fill: new Fill({
                        color: 'rgba(68, 68, 68, 0.45)',
                    }),
                })
            });
            this.map.addLayer(this.fireMultipolygonsLayer);

            const icons = [new Icon({
                anchor: [0.46387078, 0.7155],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: '/img/fire_icon.svg',
                scale: .25,
                displacement: [0, 0],
                opacity: 1,
                size: [93, 120]
            }), new Icon({
                anchor: [0.375, 0.6],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: '/img/fire_icon.svg',
                scale: .3,
                displacement: [0, 0],
                opacity: 1,
                size: [113, 146]
            }), new Icon({
                anchor: [0.275, 0.46],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: '/img/fire_icon.svg',
                scale: .45,
                displacement: [0, 0],
                opacity: 1,
                size: [146, 188]
            })];
            const selectedIcons = [new Icon({
                anchor: [0.46387078, 0.7155],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: '/img/fire_icon_selected.svg',
                scale: .25,
                displacement: [0, 0],
                opacity: 1,
                size: [93, 120]
            }), new Icon({
                anchor: [0.375, 0.6],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: '/img/fire_icon_selected.svg',
                scale: .3,
                displacement: [0, 0],
                opacity: 1,
                size: [113, 146]
            }), new Icon({
                anchor: [0.275, 0.46],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: '/img/fire_icon_selected.svg',
                scale: .45,
                displacement: [0, 0],
                opacity: 1,
                size: [146, 188]
            })];
            const smallCircles = [new CircleStyle({
                radius: 4, fill: new Fill({color: '#b92d25'})
            }), new CircleStyle({
                radius: 6, fill: new Fill({color: '#b92d25'})
            }), new CircleStyle({
                radius: 8, fill: new Fill({color: '#b92d25'})
            })]
            const styleFunction = function (feature, resolution, isSelected = false) {
                const features = feature.get('features') ? feature.get('features') : [feature];
                const count = features.length;
                if (count > 1) {
                    const maxArea = Math.max.apply(Math, features.map(f => f.getProperties().total_area));
                    let size = 1;
                    if (maxArea >= 50000 || count >= (self._isYearly() ? 90 : 60)) size++;
                    if (maxArea >= 1000000 || count >= (self._isYearly() ? 120 : 90)) size++;
                    return [new Style({
                        image: isSelected ? selectedIcons[size - 1] : icons[size - 1],
                        text: new Text({
                            text: count.toString(),
                            font: 'bold 11px Lucida Grande, Lucida Sans Unicode, arial, sans-serif',
                            fill: new Fill({
                                color: '#fff',
                            })
                        }),
                    }), new Style({
                        image: smallCircles[size - 1]
                    }),];
                } else {
                    let size = 1;
                    const area = features[0].getProperties().total_area;
                    if (area >= 50000) size++;
                    if (area >= 1000000) size++;
                    return [new Style({
                        image: isSelected ? selectedIcons[size - 1] : icons[size - 1]
                    })];
                }
            };
            this.firePointsLayer = new VectorLayer({
                style: styleFunction,
                minZoom: 2
            });
            this.map.addLayer(this.firePointsLayer);
            this._onChangeYear();

            this.firePopup = new Popup(this.translator, this.uiTarget, 'fire_popup');
            this.selectedFireLayer = new VectorLayer({
                visible: false, style: function (feature, resolution) {
                    return styleFunction(feature, resolution, true);
                },
            });
            this.map.addLayer(this.selectedFireLayer);
            this.map.addOverlay(this.firePopup.getOverlay());

            this._unselect();

            this.map.on('click', (e) => {
                let clickedPoint = false;
                let clickedMultipolygon = false;

                function fetchFireData(id, target) {
                    cache4js.ajaxCache({
                        method: 'GET',
                        url: self.config.firePointsDataUrl + '&outputformat=application/json&cql_filter=id=' + id
                    }, 5*60).done(function (data) {
                        const feature = new GeoJSON().readFeatures(data)[0];
                        const properties = feature.getProperties();
                        LOGGER.logDebug("Loaded data for fire id " + id);

                        ['locality'].forEach(prop => {
                            if (properties[prop]) {
                                target.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.' + prop) + '</label>' + '   <div class="fire-info-value">' + properties[prop] + '</div>' + '</div>'));
                            }
                        });
                        const lauGroup = $('<div class="four group"></div>');
                        target.append(lauGroup);
                        ['lau3', 'lau2', 'lau1'].forEach(prop => {
                            if (properties[prop]) {
                                lauGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.' + prop) + '</label>' + '   <div class="fire-info-value">' + properties[prop] + '</div>' + '</div>'));
                            }
                        });

                        const areaGroup = $('<div class="four group"></div>');
                        target.append(areaGroup);
                        ['total_area', 'inhabited_area', 'brushwood_area', 'agricultural_area'].forEach(prop => {
                            const area = properties[prop];
                            if (area) {
                                const formattedArea = formatArea(area);
                                areaGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.' + prop) + '</label>' + '   <div class="fire-info-value">' + formattedArea + '</div>' + '</div>'));
                            }
                        });


                        const causeGroup = $('<div class="two group"></div>');
                        target.append(causeGroup);
                        ['cause', 'cause_type'].forEach(prop => {
                            if (properties[prop]) {
                                if (prop === 'cause' && properties[prop] === 'UNDETERMINED') return;
                                if (prop === 'cause_type' && properties[prop] === 'UNKNOWN') return;
                                causeGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.' + prop) + '</label>' + '   <div class="fire-info-value">' + self.translator.translate('fire.ref.' + prop + '.' + properties[prop]) + '</div>' + '</div>'));
                            }
                        });

                        const alarmGroup = $('<div class="two group"></div>');
                        target.append(alarmGroup);
                        if (properties['alarm_source'])
                            alarmGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.alarm_source') + '</label>' + '   <div class="fire-info-value">' + self.translator.translate('fire.ref.alarm_source.' + properties['alarm_source']) + '</div>' + '</div>'));
                        if (properties['alarm_ts'])
                            alarmGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.alarm_ts') + '</label>' + '   <div class="fire-info-value">' + formatTs(dateFromStr(properties.alarm_ts)) + '</div>' + '</div>'));

                        const responseGroup = $('<div class="two group"></div>');
                        target.append(responseGroup);
                        if (properties['first_response_ts'])
                            responseGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.first_response_ts') + '</label>' + '   <div class="fire-info-value">' + formatTs(dateFromStr(properties.first_response_ts)) + '</div>' + '</div>'));
                        if (properties['alarm_ts'] && properties['first_response_ts'])
                            responseGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.response_time') + '</label>' + '   <div class="fire-info-value">' + formatDuration(getDuration(dateFromStr(properties.alarm_ts), dateFromStr(properties.first_response_ts))) + '</div>' + '</div>'));

                        const extinctionGroup = $('<div class="four group"></div>');
                        target.append(extinctionGroup);
                        if (properties['extinguishing_ts'])
                            extinctionGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.extinguishing_ts') + '</label>' + '   <div class="fire-info-value">' + formatTs(dateFromStr(properties.extinguishing_ts)) + '</div>' + '</div>'));
                        if (properties['first_response_ts'] && properties['extinguishing_ts'])
                            extinctionGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.duration_firefighting') + '</label>' + '   <div class="fire-info-value">' + formatDuration(getDuration(dateFromStr(properties.first_response_ts), dateFromStr(properties.extinguishing_ts))) + '</div>' + '</div>'));
                        if (properties['alarm_ts'] && properties['extinguishing_ts'])
                            extinctionGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.duration_total') + '</label>' + '   <div class="fire-info-value">' + formatDuration(getDuration(dateFromStr(properties.alarm_ts), dateFromStr(properties.extinguishing_ts))) + '</div>' + '</div>'));

                        const windTempGroup = $('<div class="four group"></div>');
                        target.append(windTempGroup);
                        ['temperature', 'wind_speed', 'wind_direction'].forEach(prop => {
                            if (properties[prop]) {
                                windTempGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.' + prop) + '</label>' + '   <div class="fire-info-value">' + properties[prop].toFixed(0) + '</div>' + '</div>'));
                            }
                        });
                        const humidityGroup = $('<div class="two group"></div>');
                        target.append(humidityGroup);
                        ['relative_humidity'].forEach(prop => {
                            if (properties[prop]) {
                                humidityGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.' + prop) + '</label>' + '   <div class="fire-info-value">' + properties[prop].toFixed(3) + '</div>' + '</div>'));
                            }
                        });
                        ['precipitation'].forEach(prop => {
                            if (properties[prop]) {
                                humidityGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.' + prop) + '</label>' + '   <div class="fire-info-value">' + properties[prop].toFixed(3) + '</div>' + '</div>'));
                            }
                        });

                        const orographyGroup = $('<div class="two group"></div>');
                        target.append(orographyGroup);
                        ['mean_height', 'mean_slope'].forEach(prop => {
                            if (properties[prop]) {
                                orographyGroup.append($('<div class="fire-info-element">' + '   <label>' + self.translator.translate('fire.label.' + prop) + '</label>' + '   <div class="fire-info-value">' + properties[prop].toFixed(0) + '</div>' + '</div>'));
                            }
                        });
                    });
                }

                function fetchFireMultipolygon(id) {
                    cache4js.ajaxCache({
                        method: 'GET',
                        url: self.config.fireMultipolygonsLayerUrl + '&outputformat=application/json&srsname=' + MERCATOR_CODE + '&cql_filter=id=' + id
                    }, 5*60).done(function (data) {
                        const polygonalFeatures = new GeoJSON().readFeatures(data);
                        if (polygonalFeatures.length === 1) {
                            LOGGER.logDebug("Loaded a multipolygon for fire id " + id);
                            self.fireMultipolygonsLayer.setSource(new VectorSource({
                                projection: MERCATOR_CODE, features: polygonalFeatures
                            }));
                            self.fireMultipolygonsLayer.setVisible(true);
                        }
                    });
                }

                function onClickFire(feature) {
                    const id = feature.getProperties().id;
                    self.selectedFireLayer.setSource(new VectorSource({
                        projection: MERCATOR_CODE, features: [feature]
                    }));
                    self.selectedFireLayer.setVisible(true);

                    const ts = dateFromStr(feature.getProperties().ts);
                    self.firePopup.setTitle(self.translator.translate('fire.popup.title', [self.translator.translate('fire.ref.fire_type.' + feature.getProperties().fire_type), formatTs(ts)]));

                    fetchFireMultipolygon(id);

                    const content = $('<div class="fire-info"></div>');
                    self.firePopup.setContent(content);
                    fetchFireData(id, content);
                    self.firePopup.show(self.selectedFireCoords);
                }

                function onClickSameLocationFires(clusterFeature) {
                    const features = clusterFeature.get('features');
                    const popupContent = $(
                        '<div class="outer-content">' +
                        '   <div class="navigation">' +
                        '       <button class="previous" type="button"><i class="fa-solid fa-angle-left"></i></button>' +
                        '       <button class="next" type="button"><i class="fa-solid fa-angle-right"></i></button>' +
                        '   </div>' +
                        '</div>'
                    );
                    popupContent.data('visible-element', 0);
                    const navigate = function (value) {
                        self._unselect();
                        $('.content-inner', popupContent).hide();
                        let currentlyVisible = Number(popupContent.data('visible-element'));
                        currentlyVisible += value;
                        popupContent.data('visible-element', currentlyVisible);
                        const visibleFire = $($('.content-inner', popupContent)[currentlyVisible - 1]);
                        visibleFire.show();
                        self.selectedFireId = features[currentlyVisible - 1].getProperties().id;
                        self.selectedFireCoords = features[currentlyVisible - 1].getGeometry().getCoordinates();
                        clickedPoint = true;
                        self.selectedFireLayer.setSource(new VectorSource({
                            projection: MERCATOR_CODE, features: [clusterFeature]
                        }));
                        self.selectedFireLayer.setVisible(true);
                        self.firePopup.show(self.selectedFireCoords);
                        if (currentlyVisible === 1)
                            $('button.previous', popupContent).attr('disabled', 'disabled').addClass('disabled');
                        else $('button.previous', popupContent).removeAttr('disabled').removeClass('disabled');
                        if (currentlyVisible === features.length)
                            $('button.next', popupContent).attr('disabled', 'disabled').addClass('disabled');
                        else $('button.next', popupContent).removeAttr('disabled').removeClass('disabled');

                    };
                    $('button.next', popupContent).click(function () {
                        navigate(1)
                    });
                    $('button.previous', popupContent).click(function () {
                        navigate(-1)
                    });

                    features.forEach(feature => {
                        const id = feature.getProperties().id;
                        const ts = dateFromStr(feature.getProperties().ts);
                        const content = $(
                            '<div class="content-inner">' +
                            '   <div class="fire-info">' +
                            '      <div class="fire-info-element">' +
                            '          <label>' + self.translator.translate('fire.label.ts') + '</label>' +
                            '          <div class="fire-info-value">' + formatTs(ts) + '</div>' +
                            '      </div>' +
                            '   </div>' +
                            '</div>'
                        );
                        popupContent.append(content);
                        fetchFireData(id, $('.fire-info', content));
                    });
                    navigate(1);
                    fetchFireMultipolygon(features[0].getProperties().id);
                    self.firePopup.setContent(popupContent);
                    self.firePopup.setTitle(self.translator.translate('fire.popup.multiple.title', [features.length + ""]));
                }

                const promises = [self.firePointsLayer.getFeatures(e.pixel).then((clickedFeatures) => {
                    if (clickedFeatures.length) {
                        const features = clickedFeatures[0].get('features');
                        if (features.length > 1) {
                            if (self.map.getView().getZoom() === self.config.maxZoomLevel - self.config.minZoomLevel) { //if we are already in the max zoom level, then there are many fires for the same location
                                onClickSameLocationFires(clickedFeatures[0]);
                            } else {
                                self._unselect();
                                const extent = boundingExtent(features.map((r) => r.getGeometry().getCoordinates()));
                                self.map.getView().fit(extent, {duration: 1000, padding: [150, 150, 150, 150]});
                            }
                        } else {
                            const id = features[0].getProperties().id;
                            if (id === self.selectedFireId) {
                                self.firePopup.show(self.selectedFireCoords);
                                clickedPoint = true;
                            } else {
                                self._unselect();
                                self.selectedFireCoords = features[0].getGeometry().getCoordinates();
                                onClickFire(features[0]);
                                clickedPoint = true;
                                self.selectedFireId = id;
                            }
                        }
                    }
                }), self.fireMultipolygonsLayer.getFeatures(e.pixel).then((features) => {
                    if (features.length && self.fireMultipolygonsLayer.getSource().getFeatures().length) {
                        const id = features[0].getProperties().id;
                        if (id === self.selectedFireId) {
                            self.firePopup.show(self.selectedFireCoords);
                            clickedMultipolygon = true;
                        } else if (!clickedPoint) {
                            self._unselect();
                            onClickFire(features[0]);
                            clickedMultipolygon = true;
                            self.selectedFireId = id;
                        }
                    }
                })];
                Promise.all(promises).then(function () {
                    if (!clickedPoint && !clickedMultipolygon) self._unselect();
                });
            });
            this.map.on('pointermove', (e) => {
                this.firePointsLayer.getFeatures(e.pixel).then((hooveredFeatures) => {
                    const features = hooveredFeatures.length > 0 ? hooveredFeatures[0].get('features') : [];
                    this.map.getTargetElement().style.cursor = features.length > 0 ? 'pointer' : '';
                });
            });
        }
    }

    _isYearly() {
        return this.month === 0;
    }

    _onChangeYear() {
        const self = this;
        const geoJSONFormat = new GeoJSON();
        this.vectorSourceFirePoints = new VectorSource({
            format: geoJSONFormat,
            projection: MERCATOR_CODE,
            loader: function (extent, resolution, projection, success, failure) {
                const url = (self.config.firePointsLayerUrl + '&outputFormat=application/json&srsname={0}')
                    .format([MERCATOR_CODE]);
                const extentWgs84 = transformExtent(extent, MERCATOR_CODE, WGS84_CODE);
                const filter = ('<Filter>' + '   <And>' + '     <PropertyIsEqualTo>' + '       <PropertyName>year</PropertyName>' + '       <Literal>{4}</Literal>' + '     </PropertyIsEqualTo>' + '     <BBOX>' + '       <PropertyName>point</PropertyName>' + '       <Envelope srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">' + '          <lowerCorner>{0} {1}</lowerCorner>' + '          <upperCorner>{2} {3}</upperCorner>' + '       </Envelope>' + '     </BBOX>' + '   </And>' + '</Filter>').format([extentWgs84[0].toFixed(4), extentWgs84[1].toFixed(4), extentWgs84[2].toFixed(4), extentWgs84[3].toFixed(4), "" + self.year]).replaceAll("  ", "");
                $.ajax({
                    url: url + '&filter=' + encodeURIComponent(filter), method: 'GET', success: function (data) {
                        try {
                            if (data.features) {
                                self.yearlyFeatures = geoJSONFormat.readFeatures(data);
                                self._onChangeMonth();
                                success(self.monthlyFeatures);
                            }
                        } catch (e) {
                            LOGGER.logError('vector source parsing error', e);
                            failure();
                        }
                    }
                });
            },
            strategy: bbox,
        });
        cache4js.storeCache("year", this.year);
        this.firePointsLayer.setSource(new Cluster({
            source: this.vectorSourceFirePoints,
            minDistance: 0,
            distance: 30,
            attributions: ['<div>Incêndios: Instituto da Conservação da Natureza e das Florestas</div>']
        }));
        this.fireSummaryLayer.setSource(this._getFireSummaryLayerSource());
    }

    _onChangeMonth() {
        const self = this;
        if (this.yearlyFeatures) {
            this.monthlyFeatures = self.yearlyFeatures.filter(f => {
                const properties = f.getProperties();
                const matchesMonth = self._isYearly() || (properties.ts && new Date(properties.ts.replace("Z", "")).getMonth() + 1 === self.month);
                if (matchesMonth) {
                    if (self.filterValues) {
                        for (let filterName in self.filterValues) {
                            const filterValue = self.filterValues[filterName];
                            if (filterValue) {
                                if (filterName === 'total_area') {
                                    if (!properties[filterName] || properties[filterName] < Number(filterValue) * 10000)
                                        return false;
                                } else {
                                    if (!properties[filterName] || properties[filterName] !== filterValue)
                                        return false;
                                }
                            }
                        }
                    }
                    return true;
                }
                return false;
            });
            this.vectorSourceFirePoints.clear(false);
            this.vectorSourceFirePoints.addFeatures(this.monthlyFeatures);
            this.fireSummaryLayer.getSource().refresh();
            this._updateFilters();
        }
        cache4js.storeCache("month", this.month);
        this.fireSummaryLayer.setSource(this._getFireSummaryLayerSource());
    }

    _initCount() {
        const countContainer = $(
            '<div class="count-container">' +
            '   <div class="count"></div>' +
            '</div>'
        );
        this.uiTarget.append(countContainer);
    }

    _initShare() {
        const container = $(
            '<div class="ol-control share-button-container">' +
            '   <button title="' + this.translator.translate('share.title') + '" class="share-button" type="button"><i class="fa-solid fa-share-nodes"></i></button>' +
            '</div>'
        );
        this.uiTarget.append(container);
        this.shareModal = new ModalHalf(this.translator, $('body'), 'share_modal');
        const self = this;
        $('button.share-button',container).click(function (){
            self.shareModal.setTitle(self.translator.translate('share.title'));
            const mapUrl = self.config.mapUrl+'?center={0}&zoom={1}&year={2}&month={3}&cause={4}&minArea={5}'.format([
                encodeURIComponent(JSON.stringify(self.map.getView().getCenter())),
                ""+self.map.getView().getZoom(),
                ""+self.year,
                ""+self.month,
                self.causeFilterValue,
                ""+self.areaFilterValue
            ]);
            const twitterUrl = 'https://twitter.com/intent/tweet?text='+
                self.translator.translate('share.twitter.text')+"&url=" +
                encodeURIComponent(mapUrl);
            const shareContent = $(
                '<div>'+
                '   <div class="context">'+self.translator.translate('share.context')+'</div>' +
                '   <div class="share-url share-element"><label>'+self.translator.translate('share.url')+'<br/><input type="text" readonly value="'+ mapUrl+'"></label></div>'+
                '   <div class="share-twitter share-element">' +
                '      <label>'+self.translator.translate('share.twitter')+'</label><br/>' +
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
        });
    }

    _initCharts() {
        const buttonsContainer = $(
            '<div class="charts-button-container bar">' +
            '   <button title="' + this.translator.translate('charts.bar.name') + '" class="charts-button bar" type="button"><i class="fa-solid fa-chart-column"></i></i></button>' +
            '</div>' +
            '<div class="charts-button-container pie">' +
            '   <button title="' + this.translator.translate('charts.pie.name') + '" class="charts-button pie" type="button"><i class="fa-solid fa-chart-pie"></i></i></button>' +
            '</div>'
        );
        this.uiTarget.append(buttonsContainer);
        this.chartsModal = new ModalFull(this.translator, $('body'), 'charts_modal');
        const self = this;
        const config = {
            responsive: true,
            showSendToCloud: false,
            modeBarButtonsToRemove: ['select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'resetScale2d'],
            modebarStyle: {
                orientation: self.isMobileDevice ? 'v' : 'h'
            }
        }
        $('button.charts-button.bar', buttonsContainer).click(function () {
            if (self.chartsModal.isVisible()) {
                self.chartsModal.hide();
            } else {
                self.chartsModal.show();
                const visibleFeatures = self._getVisibleFeatures();
                self.chartsModal.setTitle(self.translator.translate('charts.bar.title', [visibleFeatures.length + ""]))
                const content = $('<div class="charts-list"></div>');
                const monthlyChartData = {x: [], y: []};
                const dailyChartData = {x: [], y: []};
                const hourlyChartData = {x: [], y: []};
                let monthlyChartContainer, dailyChartContainer;
                if (self._isYearly()) {
                    monthlyChartContainer = $(
                        '<div class="chart-container">' +
                        '   <div class="header">' + self.translator.translate("charts.monthly.title") + '</div>' +
                        '   <div class="body"></div>' +
                        '</div>'
                    );
                    content.append(monthlyChartContainer);
                    for (let m = 1; m <= 12; m++) {
                        monthlyChartData.x.push(m.pad(2) + '-' + self.year);
                        monthlyChartData.y.push(0);
                    }
                } else {
                    dailyChartContainer = $(
                        '<div class="chart-container bar">' +
                        '   <div class="header">' + self.translator.translate("charts.daily.title") + '</div>' +
                        '   <div class="body"></div>' +
                        '</div>'
                    );
                    content.append(dailyChartContainer);
                    for (let d = 1; d <= 31; d++) {
                        dailyChartData.x.push(d.pad(2) + '-' + self.month + '-' + self.year);
                        dailyChartData.y.push(0);
                    }
                }

                const hourlyChartContainer = $(
                    '<div class="chart-container bar">' +
                    '   <div class="header">' + self.translator.translate("charts.hourly.title") + '</div>' +
                    '   <div class="body"></div>' +
                    '</div>');
                content.append(hourlyChartContainer);
                for (let h = 0; h <= 23; h++) {
                    hourlyChartData.x.push(h.pad(2) + 'h');
                    hourlyChartData.y.push(0);
                }
                visibleFeatures.forEach(f => {
                    const ts = dateFromStr(f.getProperties().ts);
                    if (self._isYearly()) {
                        monthlyChartData.y[ts.getMonth()]++;
                    } else {
                        dailyChartData.y[ts.getDate() - 1]++;
                    }
                    hourlyChartData.y[ts.getHours()]++;
                });

                const layout = {
                    autosize: true,
                    height: 185,
                    margin: {
                        l: 35,
                        r: 35,
                        b: 35,
                        t: 5,
                        pad: 2
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
                        automargin: true
                    },
                    yaxis: {
                        zerolinewidth: 0.5,
                        zerolinecolor: 'rgb(200,200,200)',
                        gridcolor: 'rgba(200,200,200,0.5)',
                        linecolor: 'rgba(0,0,0,0)',
                        linewidth: 0
                    }
                }

                function renderChart(container, data, layout, config) {
                    layout = JSON.parse(JSON.stringify(layout));
                    layout.xaxis.range = [data.x[0], data.x[data.x.length - 1]];
                    config = JSON.parse(JSON.stringify(config));

                    data.type = 'bar';
                    data.marker = {
                        color: '#809A6F'
                    };

                    const chartTarget = $('.body', container)[0];
                    Plotly.newPlot(chartTarget, [data], layout, config);
                    new ResizeObserver(function () {
                        Plotly.relayout(chartTarget, {height: 185, autosize: true});
                    }).observe(chartTarget);
                }

                self.chartsModal.setContent($('<div><div class="context">' + self.translator.translate('charts.context.info') + '</div></div>').append(content));

                if (self._isYearly()) {
                    renderChart(monthlyChartContainer, monthlyChartData, layout, config);
                } else {
                    renderChart(dailyChartContainer, dailyChartData, layout, config);
                }
                renderChart(hourlyChartContainer, hourlyChartData, layout, config);
            }
        });

        $('button.charts-button.pie', buttonsContainer).click(function () {
            if (self.chartsModal.isVisible()) {
                self.chartsModal.hide();
            } else {
                self.chartsModal.show();
                const visibleFeatures = self._getVisibleFeatures();
                self.chartsModal.setTitle(self.translator.translate('charts.pie.title', [visibleFeatures.length + ""]))
                const content = $('<div class="charts-list"></div>');
                const areaChartData = classifyAreasFromFeatures(visibleFeatures, true, true, LOGGER);
                const durationChartData = classifyDurationsFromFeatures(visibleFeatures, true, true, LOGGER);
                const firefightingDurationChartData = classifyFirefightingDurationsFromFeatures(visibleFeatures, true, true, LOGGER);
                const responseTimeChartData = classifyResponseTimesFromFeatures(visibleFeatures, true, true, LOGGER);

                const causeChartData = {
                    labels: [
                        self.translator.translate("fire.ref.cause_type.NATURAL"),
                        self.translator.translate("fire.ref.cause_type.REKINDLE"),
                        self.translator.translate("fire.ref.cause_type.NEGLIGENT"),
                        self.translator.translate("fire.ref.cause_type.DELIBERATE"),
                        self.translator.translate("fire.ref.cause_type.UNKNOWN"),
                    ], values: [0, 0, 0, 0, 0]
                };
                visibleFeatures.forEach(f => {
                    const causeType = f.getProperties().cause_type ? f.getProperties().cause_type : "UNKNOWN";
                    causeChartData.values[causeChartData.labels.indexOf(self.translator.translate('fire.ref.cause_type.' + causeType))]++;
                });
                for (let i = causeChartData.values.length - 1; i >= 0; i--)
                    if (causeChartData.values[i] === 0) {
                        causeChartData.values.splice(i, 1);
                        causeChartData.labels.splice(i, 1);
                    }

                const areaChartContainer = $(
                    '<div class="chart-container pie">' +
                    '   <div class="header">' + self.translator.translate("charts.area.title") + '</div>' +
                    '   <div class="context">' + self.translator.translate("charts.area.discarded.info", [visibleFeatures.length - areaChartData.countFiltered + "", visibleFeatures.length + "", MIN_VALID_AREA + ""]) + '</div>' +
                    '   <div class="body"></div>' +
                    '</div>');
                const responseTimeChartContainer = $(
                    '<div class="chart-container pie">' +
                    '   <div class="header">' + self.translator.translate("charts.response.time.title") + '</div>' +
                    '   <div class="context">' + self.translator.translate("charts.response.time.discarded.info", [visibleFeatures.length - responseTimeChartData.countFiltered + "", visibleFeatures.length + "", formatDuration(MIN_VALID_DURATION)]) + '</div>' +
                    '   <div class="body"></div>' +
                    '</div>');
                const firefightingDurationChartContainer = $(
                    '<div class="chart-container pie">' +
                    '   <div class="header">' + self.translator.translate("charts.firefighting.duration.title") + '</div>' +
                    '   <div class="context">' + self.translator.translate("charts.firefighting.duration.discarded.info", [visibleFeatures.length - firefightingDurationChartData.countFiltered + "", visibleFeatures.length + "", formatDuration(MIN_VALID_DURATION)]) + '</div>' +
                    '   <div class="body"></div>' +
                    '</div>');
                const durationChartContainer = $(
                    '<div class="chart-container pie">' +
                    '   <div class="header">' + self.translator.translate("charts.duration.title") + '</div>' +
                    '   <div class="context">' + self.translator.translate("charts.duration.discarded.info", [visibleFeatures.length - durationChartData.countFiltered + "", visibleFeatures.length + "", formatDuration(MIN_VALID_DURATION)]) + '</div>' +
                    '   <div class="body"></div>' +
                    '</div>');
                const causeChartContainer = $(
                    '<div class="chart-container pie">' +
                    '   <div class="header">' + self.translator.translate("charts.cause.title") + '</div>' +
                    '   <div class="body"></div>' +
                    '</div>');
                content.append(areaChartContainer);
                content.append(responseTimeChartContainer);
                content.append(firefightingDurationChartContainer);
                content.append(durationChartContainer);
                content.append(causeChartContainer);

                const layout = {
                    autosize: true,
                    height: 300,
                    margin: {
                        l: 35,
                        r: 35,
                        b: 35,
                        t: 35,
                        pad: 2
                    },
                    textposition: 'outside',
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    showlegend: true
                }

                function renderChart(container, data, layout, config) {
                    data.type = 'pie';
                    data.sort = false;
                    data.hole = .4;

                    const chartTarget = $('.body', container)[0];


                    Plotly.newPlot(chartTarget, [data], layout, config);

                    function relayout() {
                        Plotly.relayout(chartTarget, {height: 300, autosize: true});
                    }

                    setTimeout(function () {
                        relayout();
                    }, Math.random() * 100);
                    new ResizeObserver(function () {
                        relayout();
                    }).observe(chartTarget);
                }

                self.chartsModal.setContent($('<div><div class="context">' + self.translator.translate('charts.context.info') + '</div></div>').append(content));

                renderChart(areaChartContainer, areaChartData, layout, config);
                renderChart(responseTimeChartContainer, responseTimeChartData, layout, config);
                renderChart(firefightingDurationChartContainer, firefightingDurationChartData, layout, config);
                renderChart(durationChartContainer, durationChartData, layout, config);
                renderChart(causeChartContainer, causeChartData, layout, config);
            }
        });
    }

    _initAbout() {
        const self = this;
        this.aboutModal = this.isSmallMapWidth
            ? new ModalFull(this.translator, $('body'), 'about_modal')
            : new ModalHalf(this.translator, $('body'), 'about_modal');
        this.aboutModal.setTitle(this.translator.translate("about.map.title"))
        this.aboutModal.setContent(this.translator.translate("about.map.text"))

        const $button = $('button.about-button');
        $button.click(function () {
            if (!$button.hasClass('active')) {
                self.aboutModal.show();
                $button.addClass('active');
            } else {
                self.aboutModal.hide();
                $button.removeClass('active');
            }
        });
        this.aboutModal.onHide(function () {
            $button.removeClass('active');
        });
    }
}

export {FireMap, WGS84_CODE, MERCATOR_CODE}