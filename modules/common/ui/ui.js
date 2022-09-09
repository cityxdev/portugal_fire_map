export class UIElement {

    static openUIElements = [];
    static escKeyInitialized = false;

    constructor(id, translator) {
        this.translator = translator;
        this.id = id;
        this.properties = {};

        if (!UIElement.escKeyInitialized) {
            $('body').keyup(function (e) {
                if (e.key === "Escape" && UIElement.openUIElements.length > 0) {
                    UIElement.openUIElements[UIElement.openUIElements.length - 1].close();
                }
            });
            UIElement.escKeyInitialized = true;
        }

    }

    set(code, value) {
        this.properties[code] = value;
        return this;
    }

    get(code) {
        return this.properties[code];
    }

    getCode() {
        return this.id?this.id:'NOCODE';
    }

    getUIElement() {
    }

    getClass() {
        return this.__proto__.constructor.name;
    }

    getLogId() {
        return this.getClass() + " [" + this.getCode() + "]";
    }

    close() {
    }
}