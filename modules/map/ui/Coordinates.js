import {UIElement} from "../../common/ui/ui";
import {MERCATOR_CODE, WGS84_CODE} from "../FireMap";
import {MousePosition, ScaleLine} from "ol/control";
import {createStringXY} from "ol/coordinate";
import '../../css/map/ui/coordinates.css';
import '../../css/map/ui/coordinates.responsive.css';
import {transform} from "ol/proj";


class MapPosition extends MousePosition {

    constructor(opt_options, isMobile, target) {
        super(opt_options);
        this.isMobile = isMobile;
        this.crosshair = $(
            '<div class="crosshair-container">' +
            '  <div>' +
            '    <div class="vertical-line"></div>' +
            '    <div class="horizontal-line"></div>' +
            '  </div>' +
            '</div>'
        );
        target.append(this.crosshair);
        if (this.isMobile) {
            this.showCrosshair();
        } else {
            this.hideCrosshair();
        }
    }

    showCrosshair() {
        this.isCrosshairVisible = true;
        this.crosshair.show();
    }

    hideCrosshair() {
        this.isCrosshairVisible = false;
        this.crosshair.hide();
    }

    isCrosshair() {
        return this.isCrosshairVisible;
    }

    handleMouseMove(event) {
        if (!this.isCrosshair()) {
            super.handleMouseMove(event);
        }
    }

    handleMouseOut(event) {
        if (!this.isCrosshair()) {
            super.handleMouseOut(event);
        }
    }

    updateCoordinatesFromCenter() {
        const coordinateFormat = this.getCoordinateFormat();
        const transformed = this.center!==undefined ? transform(this.center,MERCATOR_CODE,WGS84_CODE) : undefined;
        const html = transformed === undefined
            ? ''
            : (coordinateFormat ? coordinateFormat(transformed) : transformed.toString());
        if (!this.renderedHTML_ || html !== this.renderedHTML_) {
            this.element.innerHTML = html;
            this.renderedHTML_ = html;
        }
    }

    onNavigation(center) {
        this.center = center;
        if (this.isMobile) {
            this.updateCoordinatesFromCenter();
        }
    }
}

class Coordinates extends UIElement {

    constructor(translator, isMobileDevice, target) {
        super('coordinates_tool', translator);
        this.target = target;

        this.mapPosition = new MapPosition({
            coordinateFormat: this.formatFunction(),
            projection: WGS84_CODE,
            target: $('.position-container', this.getUIElement())[0]
        }, isMobileDevice, this.target);
    }

    formatFunction() {
        const stringify = createStringXY(5);
        return function (coords) {
            return stringify(coords);
        }
    }

    getUIElement() {
        if (!this.uiElement) {
            this.uiElement = $(
                '<div class="coordinates ol-unselectable ol-control">' +
                '   <div class="inner-coordinates"></div>' +
                '</div>'
            );

            const positionContainer = $('<div class="position-container"></div>');
            $('.inner-coordinates',this.uiElement).append(positionContainer);
        }
        return this.uiElement;
    }

    getOLControls() {
        let uiElement = this.getUIElement();
        if (!this.olControls) {
            this.olControls = [
                new ScaleLine({
                    units: 'metric',
                    target: $('.inner-coordinates',uiElement)[0]
                }),
                this.mapPosition
            ];
        }
        return this.olControls;
    }

    onNavigation(centerWgs84) {
        if (this.mapPosition) {
            this.mapPosition.onNavigation(centerWgs84);
        }
    }

    showCrosshair() {
        this.mapPosition.showCrosshair();
        this.mapPosition.updateCoordinatesFromCenter();
    }

    hideCrosshair() {
        this.mapPosition.hideCrosshair();
    }

    isCrosshair() {
        this.mapPosition.isCrosshair();
    }
}

export {Coordinates}
