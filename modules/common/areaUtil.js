import {classifyData} from "./stattUtil";
import {Logger} from "./log";

const AREA_MAX_M2_THRESHOLD = 5000;
const AREA_MAX_HA_THRESHOLD = 100_000_000;

const MIN_NR_OF_BUCKETS = 3;
const MAX_NR_OF_BUCKETS = 10;
const MERGE_MIN_THRESHOLD = 0.015;

export const MIN_VALID_AREA = 10;

export function formatArea(area) {
    if (area === undefined || area === null || area < MIN_VALID_AREA)
        return '--';
    return area > AREA_MAX_HA_THRESHOLD
        ? (Number(((area / 1e+6).toFixed(2))).toLocaleString() + 'km<sup>2</sup>')
        : (area > AREA_MAX_M2_THRESHOLD
            ? (Number(((area / 10_000).toFixed(2))).toLocaleString() + 'ha')
            : (Number(area.toFixed(0)).toLocaleString() + 'm<sup>2</sup>'));
}

export function classifyAreasFromFeatures(features, removeTopOutliers = true, removeBottomOutliers = true, LOGGER = new Logger(false)) {
    LOGGER.logDebug("============================");
    LOGGER.logInfo("Will process areas for " + features.length + ' features');

    const areas = features
        .map(f => f.getProperties().total_area)
        .filter(a => a > MIN_VALID_AREA); //we assume that any fire with an area <10m2 is an error
    const areaData = classifyData(
        areas,
        removeBottomOutliers,
        removeTopOutliers,
        MAX_NR_OF_BUCKETS,
        MIN_NR_OF_BUCKETS,
        MERGE_MIN_THRESHOLD,
        formatArea,
        LOGGER
    );
    areaData.initialCount = features.length;

    LOGGER.logDebug("initialCount: " + areaData.initialCount);
    LOGGER.logDebug("countFiltered: " + areaData.countFiltered);
    LOGGER.logDebug("Processed areas for " + features.length + ' features');
    LOGGER.logDebug("============================\n\n");

    return areaData;
}
