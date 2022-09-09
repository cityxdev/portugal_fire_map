import {FireMap} from "/modules/map/FireMap";
import {Logger} from "/modules/common/log";

$(function() {
    cache4js.ajaxCache({
        url: '/config/config.json'
    }, 1*60*60).done(function (mapConfiguration) {
        cache4js.ajaxCache({
            url: '/config/locale.json'
        }, 1*60*60).done(function (localizationDictionary) {
            if (Object.prototype.toString.call(localizationDictionary) === '[object String]') {
                localizationDictionary = JSON.parse(localizationDictionary);
            }
            const urlSearchParams = new URLSearchParams(window.location.search);
            const map = new FireMap('pt', localizationDictionary, mapConfiguration, 'map', new Logger(!!urlSearchParams.get('debug')));
            map.run();
        });
    });
    $('.back-button').click(function (){
        window.location.href='/';
    });
});
