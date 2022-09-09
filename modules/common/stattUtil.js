import {Logger} from "./log";

export function quantile(sortedArray, q) {
    const pos = (sortedArray.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedArray[base + 1] !== undefined) {
        return sortedArray[base] + rest * (sortedArray[base + 1] - sortedArray[base]);
    } else {
        return sortedArray[base];
    }
}

export function mean(array) {
    return (array.reduce((sum, current) => sum + current)) / array.length;
}

export function variance(values) {
    const average = mean(values);
    const squareDiffs = values
        .map((value) => Math.pow(value - average, 2));
    return mean(squareDiffs);
}

export function stddev(values) {
    return Math.sqrt(variance(values));
}

export function classifyData(series, removeBottomOutliers, removeTopOutliers, maxNrOfBuckets, minNrOfBuckets, mergeMinThreshold, formatFunction, LOGGER = new Logger(false)) {
    const data = {buckets: [], labels: [], values: []};
    series = series.sort((v1, v2) => v1 - v2);

    const p5 = quantile(series, 0.05);
    const p95 = quantile(series, 0.95);
    const max = series[series.length - 1];
    const min = series[0];

    const filteredAreas = series.filter(a => (!removeBottomOutliers || a >= p5) && (!removeTopOutliers || a <= p95));
    const maxFiltered = filteredAreas[filteredAreas.length - 1];
    const minFiltered = filteredAreas[0];
    const amplitudeFiltered = maxFiltered - minFiltered;
    const stdDevFiltered = stddev(filteredAreas);
    const nrOfBuckets = Math.min(maxNrOfBuckets, Math.max(minNrOfBuckets, Math.ceil(amplitudeFiltered / stdDevFiltered)));
    const bucketSize = amplitudeFiltered / nrOfBuckets;

    data.filteredCount = filteredAreas.length;
    data.min = min;
    data.minFiltered = minFiltered;
    data.p5 = p5;
    data.p95 = p95;
    data.maxFiltered = maxFiltered;
    data.max = max;
    data.amplitudeFiltered = amplitudeFiltered;
    data.amplitude = max - min;
    data.countFiltered = filteredAreas.length;
    data.nrOfBuckets = nrOfBuckets;
    data.bucketSize = bucketSize;
    data.stdDevFiltered = stdDevFiltered;
    data.mean = mean(series);
    data.median = quantile(series, .5);

    for (let i = 0; i < nrOfBuckets; i++) {
        const bucketMin = i === 0 ? min : i * bucketSize;
        const bucketMax = i === nrOfBuckets - 1 ? max : (i + 1) * bucketSize;
        data.buckets.push({min: bucketMin, max: bucketMax});
        data.values[i] = 0;
    }
    series.forEach(a => {
        for (let i = 0; i < data.buckets.length; i++)
            if (a >= data.buckets[i].min
                && (i === data.buckets.length - 1 || a < data.buckets[i].max)) {
                data.values[i]++;
                break;
            }
    });

    function mergeWithNext(index) {
        data.values[index + 1] += data.values[index];
        data.buckets[index + 1].min = data.buckets[index].min;
        return index;
    }

    let merge = data.buckets.length > minNrOfBuckets;
    while (merge) {
        merge = false;
        let bucket2Remove = -1;
        for (let b = 0; b < data.buckets.length - 1; b++) {
            if (data.values[b] / series.length < mergeMinThreshold) {
                bucket2Remove = mergeWithNext(b);
                merge = data.buckets.length - 1 > minNrOfBuckets;
                break;
            }
        }
        if (bucket2Remove >= 0) {
            data.values.splice(bucket2Remove, 1);
            data.buckets.splice(bucket2Remove, 1);
        }
    }
    if (data.buckets.length > minNrOfBuckets
        && data.values[data.values.length - 1] / series.length < mergeMinThreshold) {
        const bucket2Remove = mergeWithNext(data.buckets.length - 2);
        data.values.splice(bucket2Remove, 1);
        data.labels.splice(bucket2Remove, 1);
        data.buckets.splice(bucket2Remove, 1);
    }

    generateAreaLabels(data, formatFunction);

    LOGGER.logDebug("min: " + data.min);
    LOGGER.logDebug("minFiltered: " + data.minFiltered);
    LOGGER.logDebug("p5: " + data.p5);
    LOGGER.logDebug("p95: " + data.p95);
    LOGGER.logDebug("maxFiltered: " + data.maxFiltered);
    LOGGER.logDebug("max: " + data.max);
    LOGGER.logDebug("amplitudeFiltered: " + data.amplitudeFiltered);
    LOGGER.logDebug("amplitude: " + data.amplitude);
    LOGGER.logDebug("nrOfBuckets: " + data.nrOfBuckets);
    LOGGER.logDebug("nrOfBuckets (afterMerge): " + data.buckets.length);
    LOGGER.logDebug("bucketSize: " + data.bucketSize);

    return data;
}

function generateAreaLabels(data, formatFunction) {
    data.labels = data.buckets.map(bucket => {
        const bucketMin = bucket.min;
        const bucketMax = bucket.max;
        const bucketMinFormatted = formatFunction(bucketMin);
        const bucketMaxFormatted = formatFunction(bucketMax);
        return '[' + bucketMinFormatted + ' - ' + bucketMaxFormatted + '[';
    });
    data.labels[data.labels.length - 1] = '[' + data.labels[data.labels.length - 1].substring(1).replace("[", "]");
}