Number.prototype.pad = function (size) {
    let s = String(this);
    while (s.length < (size || 2)) {
        s = "0" + s;
    }
    return s;
}

function isString(obj) {
    return (Object.prototype.toString.call(obj) === '[object String]');
}

String.prototype.crop = function (size) {
    return this.length <= size
        ? this
        : this.substr(0, size - 3) + '...';
}

String.prototype.format = function () {
    const args = arguments;
    return this.replace(/\{(\d+)\}/g, function (a) {
        return args[0][parseInt(a.match(/(\d+)/g))];
    });
};

Number.prototype.round =  function (decimals= 0){
    decimals = Math.round(decimals);
    const upDown = Math.pow(10, decimals);
    return Math.round((this + Number.EPSILON) * upDown) / upDown;
};

function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
}

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInteger(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function getRandomStr(strings){
    return strings[getRandomInteger(0,strings.length-1)];
}

export {isString, isNumber, getRandomNumber, getRandomInteger, getRandomStr}