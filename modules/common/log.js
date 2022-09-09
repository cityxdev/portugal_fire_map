class Logger {

    constructor(debug) {
        this.setDebug(debug);
    }

    setDebug(debug) {
        this.debug = debug;
    }

    logDebug(msg, obj=undefined) {
        if (this.debug) {
            this._log("DEBUG", msg, obj);
        }
    }

    logInfo(msg, obj=undefined) {
        this._log("INFO", msg, obj);
    }

    logError(msg, obj=undefined) {
        this._log("ERROR", msg, obj);
    }

    _log(level, msg, obj) {
        const d = new Date();
        const dateString = d.getDate() + "-" + (d.getMonth() + 1).pad(2) + "-" + d.getFullYear() + " " +
            d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2);
        const logStr = '[' + dateString + ']\t[' + level + ']\t';
        if (obj) {
            console.log(logStr + '------------------------------------');
        }
        if (msg) {
            console.log(logStr + msg);
        } else {
            console.log(logStr + msg);
        }
        if (obj) {
            console.log(obj);
            console.log(logStr + '------------------------------------');
        }
    }
}

export {Logger}