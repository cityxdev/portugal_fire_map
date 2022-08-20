import {FireMap, initNamespace} from "./modules/map/FireMap";
import * as $ from 'jquery'
import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';
import {Logger} from "./modules/map/log";

initNamespace();

/**
 * Inits the fire map, given the localization and configuration objects
 * @param localizationDictionary {object} The localization dictionary
 * @param mapConfiguration {object} The configuration object
 * @param targetElementId {string} The id of the element where to render the map into
 * @param debug {boolean} if true, the map will log debug messages
 */
function initFireMap(localizationDictionary, mapConfiguration, targetElementId, debug) {
    const map = new FireMap(localizationDictionary, mapConfiguration, targetElementId, new Logger(!!debug));
    map.loadConfig();
    map.run();
}

/**
 * Inits the fire map, given the localization and configuration services URLs
 * @param localizationDictionaryUrl {string} The localization service URL
 * @param mapConfigurationUrl {string} The configuration service URL
 * @param targetElementId {string} The id of the element where to render the map into
 * @param debug {boolean} if true, the map will log debug messages
 */
function initFireMapFromUrls(localizationDictionaryUrl, mapConfigurationUrl, targetElementId, debug) {
    $.ajax({
        url: mapConfigurationUrl
    }).done(function (mapConfiguration) {
        $.ajax({
            url: localizationDictionaryUrl
        }).done(function (localizationDictionary) {
            if (Object.prototype.toString.call(localizationDictionary) === '[object String]') {
                localizationDictionary = JSON.parse(localizationDictionary);
            }
            initFireMap(localizationDictionary, mapConfiguration, targetElementId, debug);
        });
    });
}


window.fire.initFireMap = initFireMap;
window.fire.initFireMapFromUrls = initFireMapFromUrls;
export {initFireMap, initFireMapFromUrls}