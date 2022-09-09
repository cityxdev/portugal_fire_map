import {Dashboard} from "/modules/dashboard/Dashboard";
import {Logger} from "/modules/common/log";

$(function () {
    const onscroll = function () {
        if ($(window).scrollTop() > 1)
            $('.page-header,.page-body').addClass('top');
        else $('.page-header,.page-body').removeClass('top');
    };
    window.onscroll = onscroll;
    onscroll();

    cache4js.ajaxCache({
        url: '/config/config.json'
    }, 1 * 60 * 60).done(function (dashboardConfiguration) {
        cache4js.ajaxCache({
            url: '/config/locale.json'
        }, 1 * 60 * 60).done(function (localizationDictionary) {
            if (Object.prototype.toString.call(localizationDictionary) === '[object String]') {
                localizationDictionary = JSON.parse(localizationDictionary);
            }
            const urlSearchParams = new URLSearchParams(window.location.search);
            const dashboard = new Dashboard('pt', localizationDictionary, dashboardConfiguration, 'dashboards', new Logger(!!urlSearchParams.get('debug')));
            dashboard.run();
        });
    });
});