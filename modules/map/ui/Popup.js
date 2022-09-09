import {UIElement} from "../../common/ui/ui";
import '../../css/map/ui/popup.css';
import '../../css/map/ui/popup.responsive.css';
import {Overlay} from "ol";

class Popup extends UIElement {
    constructor(translator, target, id) {
        super(id, translator);
        this.target = target;
        this.id = id;
        this.hideCallbacks = [];
    }

    getUIElement() {
        if (!this.uiElement) {
            this.uiElement = $(
                '<div id="' + this.id + '" class="popup">' +
                '   <div class="popup-header">' +
                '       <div class="popup-title"></div>' +
                '       <div class="popup-buttons-container">' +
                '           <button class="popup-closer" type="button" title="' + this.translator.translate('popup.closer.name') + '"><i class="fa-solid fa-close"></i></button>' +
                '       </div>' +
                '   </div>' +
                '   <div class="popup-content"></div>' +
                '</div>');
            const self = this;
            $($('.popup-buttons-container button.popup-closer', this.uiElement)[0]).click(function () {
                self.hide();
            });

            this.target.append(this.uiElement);
            this.visible = false;
        }
        return this.uiElement;
    }

    getOverlay() {
        if (!this.overlay) {
            this.overlay = new Overlay({
                element: this.getUIElement()[0],
                autoPan: true,
                autoPanAnimation: {
                    duration: 250
                }
            });
        }
        return this.overlay;
    }

    onHide(callback) {
        this.hideCallbacks.push(callback);
    }

    show(coords) {
        this.coords = coords;
        this.getUIElement().addClass('visible').show();
        this.getOverlay().setPosition(coords);
        this.visible = true;
        UIElement.openUIElements.push(this);
    }

    hide() {
        if (this.visible) {
            this.coords = undefined;
            this.getOverlay().setPosition(undefined);
            this.getUIElement().removeClass('visible').hide();
            this.visible = false;
            for (let c in this.hideCallbacks)
                this.hideCallbacks[c]();
            UIElement.openUIElements.pop();
        }
    }

    isVisible() {
        return !!this.visible;
    }

    setTitle(titleText) {
        $($('.popup-title', this.getUIElement())[0]).html(titleText);
    }

    setContent(elements) {
        $($('.popup-content', this.getUIElement())[0]).empty().append(elements);
    }

    getContent() {
        return $($('.popup-content', this.getUIElement())[0]);
    }

    getCode() {
        return this.id;
    }

    close() {
        this.hide();
    }

}


export {Popup}