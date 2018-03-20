var utils = require('./utils/utils');
var isBrowser = typeof document !== "undefined";

class Fly {
    constructor(engine) {
        this.engine = engine || XMLHttpRequest;
        this.interceptors = {
            response: {
                use(handler, onerror) {
                    this.handler = handler;
                    this.onerror = onerror;
                }
            },
            request: {
                use(handler) {
                    this.handler = handler;
                }
            }
        }
        this.config = {
            method: "GET",
            baseURL: "",
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            timeout: 0,
            withCredentials: false
        }
    }

    request(url, data, options) {
        var engine = new this.engine;
        var promise = new Promise((resolve, reject) => {
            options = options || {};
            options.headers = options.headers || {};
            utils.merge(options, this.config)
            var rqi = this.interceptors.request;
            var rpi = this.interceptors.response;
            options.body = data || options.body;
            url = utils.trim(url || "");
            options.method = options.method.toUpperCase();
            options.url = url;
            if (rqi.handler) {
                options = rqi.handler(options, Promise) || options;
            }
            function isPromise(p) {
                return p instanceof Promise;
            }

            if (isPromise(options)) {
                options.then((d) => {
                    resolve(d)
                }, (err) => {
                    reject(err)
                })
                return
            }
            // Normalize the request url
            url = utils.trim(options.url);
            var baseUrl = utils.trim(options.baseURL || "");
            if (!url && isBrowser && !baseUrl) url = location.href;
            if (url.indexOf("http") !== 0) {
                var isAbsolute = url[0] === "/";
                if (!baseUrl && isBrowser) {
                    var arr = location.pathname.split("/");
                    arr.pop();
                    baseUrl = location.protocol + "//" + location.host + (isAbsolute ? "" : arr.join("/"))
                }
                if (baseUrl[baseUrl.length - 1] !== "/") {
                    baseUrl += "/"
                }
                url = baseUrl + (isAbsolute ? url.substr(1) : url)
                if (isBrowser) {

                    // Normalize the url which contains the ".." or ".", such as
                    // "http://xx.com/aa/bb/../../xx" to "http://xx.com/xx" .
                    var t = document.createElement("a");
                    t.href = url;
                    url = t.href;
                }
            }

            var responseType = utils.trim(options.responseType || "")
            engine.withCredentials = !!options.withCredentials;
            var isGet = options.method === "GET";
            
            // allow query even is not get
            var params = options.params;
            if (isGet && options.body) {
                params = options.body;
            }
            if (params) {
                if (utils.type(params) !== "string") {
                    data = utils.formatParams(params);
                }
                url += (url.indexOf("?") === -1 ? "?" : "&") + data;
            }
            
            engine.open(options.method, url);

            // try catch for ie >=9
            try {
                engine.timeout = options.timeout || 0;
                if (responseType !== "stream") {
                    engine.responseType = responseType
                }
            } catch (e) {
            }

            // If the request data is json object, transforming it  to json string,
            // and set request content-type to "json". In browser,  the data will
            // be sent as RequestBody instead of FormData
            if (!utils.isFormData(options.body) && ["object", "array"].indexOf(utils.type(options.body)) !== -1) {
                options.headers["Content-Type"] = 'application/json;charset=utf-8'
                data = JSON.stringify(options.body);
            }

            for (var k in options.headers) {
                if (k.toLowerCase() === "content-type" &&
                    (utils.isFormData(options.body) || !options.body || isGet)) {
                    // Delete the content-type, Let the browser set it
                    delete options.headers[k];
                } else {
                    try {
                        // In browser environment, some header fields are readonly,
                        // write will cause the exception .
                        engine.setRequestHeader(k, options.headers[k])
                    } catch (e) {
                    }
                }
            }

            function onresult(handler, data, type) {
                if (handler) {
                    //如果失败，添加请求信息
                    if (type) {
                        data.request = options;
                    }
                    // Call response interceptor
                    data = handler.call(rpi, data, Promise) || data
                }
                if (!isPromise(data)) {
                    data = Promise[type === 0 ? "resolve" : "reject"](data)
                }
                data.then(d => {
                    resolve(d)
                }).catch((e) => {
                    reject(e)
                })
            }


            function onerror(e) {
                onresult(rpi.onerror, e, -1)
            }

            engine.onload = () => {
                if ((engine.status >= 200 && engine.status < 300) || engine.status === 304) {

                    // The xhr of IE9 has not response filed
                    var response = engine.response || engine.responseText;
                    if ((engine.getResponseHeader("Content-Type") || "").indexOf("json") !== -1
                        // Some third engine implement may transform the response text to json object automatically,
                        // so we should test the type of response before transforming it
                        && !utils.isObject(response)) {
                        response = JSON.parse(response);
                    }

                    var headers = {};
                    var items = engine.getAllResponseHeaders().split("\r\n");
                    items.pop();
                    items.forEach((e) => {
                        var key = e.split(":")[0]
                        headers[key] = engine.getResponseHeader(key)
                    })
                    var data = {data: response, headers, engine, request: options};
                    // The _response filed of engine is set in  adapter which be called in engine-wrapper.js
                    utils.merge(data, engine._response)
                    onresult(rpi.handler, data, 0)
                } else {
                    var err = new Error(engine.statusText)
                    err.status = engine.status;
                    onerror(err)
                }
            }

            engine.onerror = (e) => {
                var err = new Error(e.msg || "Network Error")
                err.status = 0;
                onerror(err)
            }

            engine.ontimeout = () => {
                // Handle timeout error
                var err = new Error(`timeout [ ${engine.timeout}ms ]`)
                err.status = 1;
                onerror(err)
            }
            engine._options = options;
            setTimeout(() => {
                engine.send(isGet ? null : data)
            }, 0)

        })
        promise.engine = engine;
        return promise;
    }

    all(promises) {
        return Promise.all(promises)
    }

    spread(callback) {
        return function (arr) {
            return callback.apply(null, arr);
        }
    }
}

["get", "post", "put", "patch", "head", "delete"].forEach(e => {
    Fly.prototype[e] = function (url, data, option) {
        return this.request(url, data, utils.merge({method: e}, option))
    }
})
// Learn more about keep-loader: https://github.com/wendux/keep-loader
KEEP("cdn||cdn-min", () => {
    // This code block will be removed besides the  "CDN" and "cdn-min" build environment
    window.fly = new Fly;
    window.Fly = Fly;
})
module.exports = Fly;


