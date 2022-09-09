class Translator {

    constructor(locale, localization) {
        this.locale = locale;
        this.localization = localization;
    }

    translate(key, args=undefined) {
        if(!key)
            return 'undefined';
        if (key.indexOf('#') === 0) {
            return key.substr(1);
        }
        const loc = this.localization[this.locale];
        return loc[key]
            ? (args ? loc[key].format(args) : loc[key])
            : key;
    }
}

export {Translator};