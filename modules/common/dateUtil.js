export function formatTs(date) {
    if (!date) return undefined;
    let res = formatDate(date) + ' ';
    res += date.getHours().pad(2);
    if (date.getMinutes() > 0) {
        res += ':' + date.getMinutes().pad(2);
        if (date.getSeconds() > 0) res += ':' + date.getSeconds().pad(2);
    } else res += 'h';
    return res
}

export function formatDate(date) {
    if (!date) return undefined;
    return [date.getFullYear(), (date.getMonth() + 1).pad(2), date.getDate().pad(2)].join('-');
}

export function dateFromStr(dateStr){
    if(!dateStr)
        return undefined;
    return new Date(dateStr.replace("Z", ""));
}

export function max(first,second){
    if(!first)
        return second;
    if(!second)
        return first;
    if(first.getTime()<second.getTime())
        return second;
    return first;
}

export function min(first,second){
    if(!first)
        return second;
    if(!second)
        return first;
    if(first.getTime()>second.getTime())
        return second;
    return first;
}