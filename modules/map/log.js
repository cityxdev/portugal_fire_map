/**
 * A logger. Can be used as a singleton
 */
class Logger {

    /**
     *
     * @param debug {boolean} If false, this logger will not log debug messages
     */
    constructor(debug) {
        this.setDebug(debug);
    }

    /**
     *
     * @param debug {boolean} If false, this logger will not log debug messages
     */
    setDebug(debug) {
        this.debug = debug;
    }

    /**
     * Log a debug message
     * @param msg {string} The message to log
     * @param obj {*} An object to log. Will not be converted to string, so the browser will pretty print it
     */
    logDebug(msg, obj) {
        if (this.debug) {
            this._log("DEBUG", msg, obj);
        }
    }

    /**
     * Log an info message
     * @param msg {string} The message to log
     * @param obj {*} An object to log. Will not be converted to string, so the browser will pretty print it
     */
    logInfo(msg, obj) {
        this._log("INFO", msg, obj);
    }

    /**
     * Log an error message
     * @param msg {string} The message to log
     * @param obj {*} An object to log. Will not be converted to string, so the browser will pretty print it
     */
    logError(msg, obj) {
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