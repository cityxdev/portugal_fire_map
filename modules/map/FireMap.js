import 'ol/ol.css';
import '/modules/css/map.css';
import * as $ from 'jquery';
import {isString} from "./util";
import {Translator} from "./locale/Translator";

let LOGGER;

function initNamespace () {
    if(!window.fire)
        window.fire = {}
}

class FireMap {

    /**
     *
     * @param translations {object} The localization dictionary
     * @param config {object} The configuration object
     * @param targetId {string} The id of the element where to render the map into
     * @param logger {Logger} a logger
     */
    constructor(translations, config, targetId, logger) {
        LOGGER = logger;
        this.translator = new Translator(translations);

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

    loadConfig() {
    }


    run() {
    }
}

export {FireMap, LOGGER, initNamespace}