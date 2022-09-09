import {classifyData} from "./stattUtil";
import {dateFromStr, max, min} from "./dateUtil";
import {Logger} from "./log";

const DURATION_MAX_MINUTE_THRESHOLD = 90*60*1000;
const DURATION_MAX_HOUR_THRESHOLD = 24*60*60*1000;

const MIN_NR_OF_BUCKETS = 3;
const MAX_NR_OF_BUCKETS = 10;
const MERGE_MIN_THRESHOLD = 0.015;

export const MIN_VALID_DURATION = 60*1000;//1 minute

export function formatDuration(duration) { //millis
    if (duration === undefined || duration === null)
        return '--';
    const minute = 60*1000;
    const hour = 60*minute;
    const day = 24*hour;
    if(duration <= DURATION_MAX_MINUTE_THRESHOLD){
        return Math.floor(duration / minute)+"min";
    } if(duration<=DURATION_MAX_HOUR_THRESHOLD){
        const hours = Math.floor(duration / hour);
        const minutes = Math.floor((duration % hour)/minute);
        return hours+'h'+ minutes.pad(2);
    }
    const days = Math.floor(duration/day);
    const hours = (Math.floor(duration%days)/hour).round(0);
    const minutes = (Math.floor(duration%hour)/minute).round(0);
    return days+'d '
        +(hours>0?(hours+'h'):'')
        +(minutes>0?(minutes.pad(2)+(hours===0?'min':'')):'');
}

export function getDuration(ts1,ts2){
    return max(ts1,ts2).getTime()-min(ts1,ts2).getTime();
}

export function classifyDurationsFromFeatures(features, removeTopOutliers = true, removeBottomOutliers = true, LOGGER = new Logger(false)) {
    LOGGER.logDebug("============================");
    LOGGER.logInfo("Will process durations for " + features.length + ' features');

    const durations = features
        .map(f => ({alarm: f.getProperties().alarm_ts, extinguishing: f.getProperties().extinguishing_ts}))
        .filter(strDates => strDates.alarm && strDates.extinguishing)
        .map(strDates => ({alarm: dateFromStr(strDates.alarm), extinguishing: dateFromStr(strDates.extinguishing)}))
        .map(dates => getDuration(dates.alarm,dates.extinguishing))
        .filter(d => d > MIN_VALID_DURATION); //we assume that any fire with a duration <1min is an error
    const durationData = classifyData(durations, removeBottomOutliers, removeTopOutliers, MAX_NR_OF_BUCKETS, MIN_NR_OF_BUCKETS, MERGE_MIN_THRESHOLD, formatDuration, LOGGER);
    durationData.initialCount=features.length;

    LOGGER.logDebug("initialCount: " + durationData.initialCount);
    LOGGER.logDebug("countFiltered: " + durationData.countFiltered);
    LOGGER.logDebug("Processed durations for " + features.length + ' features');
    LOGGER.logDebug("============================\n\n");

    return durationData;
}

export function classifyFirefightingDurationsFromFeatures(features, removeTopOutliers = true, removeBottomOutliers = true, LOGGER = new Logger(false)) {
    LOGGER.logDebug("============================");
    LOGGER.logInfo("Will process firefighting durations for " + features.length + ' features');

    const durations = features
        .map(f => ({firstResponse: f.getProperties().first_response_ts, extinguishing: f.getProperties().extinguishing_ts}))
        .filter(strDates => strDates.firstResponse && strDates.extinguishing)
        .map(strDates => ({firstResponse: dateFromStr(strDates.firstResponse), extinguishing: dateFromStr(strDates.extinguishing)}))
        .map(dates => getDuration(dates.firstResponse,dates.extinguishing))
        .filter(d => d > MIN_VALID_DURATION); //we assume that any firefighting with a duration <1min is an error
    const durationData = classifyData(durations, removeBottomOutliers, removeTopOutliers, MAX_NR_OF_BUCKETS, MIN_NR_OF_BUCKETS, MERGE_MIN_THRESHOLD, formatDuration);
    durationData.initialCount=features.length;

    LOGGER.logDebug("initialCount: " + durationData.initialCount);
    LOGGER.logDebug("countFiltered: " + durationData.countFiltered);
    LOGGER.logDebug("Processed firefighting durations for " + features.length + ' features');
    LOGGER.logDebug("============================\n\n");

    return durationData;
}

export function classifyResponseTimesFromFeatures(features, removeTopOutliers = true, removeBottomOutliers = true, LOGGER = new Logger(false)) {
    LOGGER.logDebug("============================");
    LOGGER.logInfo("Will process response times for " + features.length + ' features');

    const responseTimes = features
        .map(f => ({alarm: f.getProperties().alarm_ts, firstResponse: f.getProperties().first_response_ts}))
        .filter(strDates => strDates.alarm && strDates.firstResponse)
        .map(strDates => ({alarm: dateFromStr(strDates.alarm), firstResponse: dateFromStr(strDates.firstResponse)}))
        .map(dates => getDuration(dates.alarm,dates.firstResponse))
        .filter(d => d > MIN_VALID_DURATION); //we assume that any response time under 1min is an error
    const responseTimeData = classifyData(responseTimes, removeBottomOutliers, removeTopOutliers, MAX_NR_OF_BUCKETS, MIN_NR_OF_BUCKETS, MERGE_MIN_THRESHOLD, formatDuration);
    responseTimeData.initialCount=features.length;

    LOGGER.logDebug("initialCount: " + responseTimeData.initialCount);
    LOGGER.logDebug("countFiltered: " + responseTimeData.countFiltered);
    LOGGER.logDebug("Processed response times for " + features.length + ' features');
    LOGGER.logDebug("============================\n\n");

    return responseTimeData;
}
