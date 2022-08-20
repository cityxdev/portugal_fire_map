/**
 * A localization translator
 */
class Translator {

    /**
     * The map for localization (string keys for string translated values)
     * @param localization {Object}
     */
    constructor(localization) {
        this.localization = localization;
    }

    /**
     * Translate a key
     * If there is no key in the localization map, the key will be returned
     * If the key starts with "#", the key is returned removing the first "#"
     * @param key {string} The key to translate
     * @param args {Array.<string>} Arguments to replace in the translated string (can be empty or undefined)
     * @return {string}
     */
    translate(key, args) {
        if(!key)
            return 'undefined';
        if (key.indexOf('#') === 0) {
            return key.substr(1);
        }
        const loc = this.localization;
        return loc[key]
            ? (args ? loc[key].format(args) : loc[key])
            : key;
    }
}

export {Translator};