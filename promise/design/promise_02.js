(function(global) {
    var Promise = function() {
        this.status = 'pending';
        this.queue = [];
        //{fulfilled:"xx",rejected:"xxxx"}
        this.result = null;
    };

    Promise.prototype.isPending = function() {
        return this.status === 'pending';
    }
    Promise.prototype.setStatus = function(status, result) {
        switch (status) {
            case "fulfilled":
                ;
            case "rejected":
                this.status = status;
                this.queue = [];
                this.result = result;
                //freeze
                Object.freeze(this);
                //保证promise对象不能修改，但是this.queue还是能push进新的元素
                ;
                break;
            default:
                throw new Error("不支持的promise状态" + status);

        }
    }
    Promise.prototype.then = function(fulfilled, rejected) {
        var handler = {
            fulfilled: fulfilled,
            rejected: rejected
        };
        var callbackDeferred;

        handler.deferred = new Deferred();
        callbackDeferred = handler.deferred;


        if (this.isPending()) {
            this.queue.push(handler);
        } else {
            //当前状态 this.status
            //执行相应回调 handler[this.status]
            var callback = handler[this.status];
            var currentResult = this.result;
            var currentStatus = this.status;

            if (callback) {
                try {
                    var newResult = callback(currentResult);

                    if (newResult && newResult.then && newResult.setStatus) {
                        //callbackDeferred 的状态由newResult决定
                        newResult.then(function(res) {
                            callbackDeferred.resolve(res);
                        }, function(err) {
                            callbackDeferred.reject(err);
                        });
                    } else {
                        //正常执行callbackDeferred变成fulfilled
                        callbackDeferred.reject(e);
                    }
                } catch (e) {
                    callbackDeferred.reject(e);
                }
            } else {
                //直接传转态给
                if (currentStatus === 'fulfilled') {
                    callbackDeferred.resolve(currentResult);
                } else if (currentStatus === 'rejected') {
                    callbackDeferred.reject(currentResult);
                } else {
                    throw new Error("未知的promise状态");
                }
            }
        }

        return handler.deferred.promise;
    }

    var Deferred = function() {
        this.promise = new Promise();
    };

    Deferred.prototype.resolve = function(result) {
        var queue;

        if (!this.promise.isPending()) {
            return;
        }
        queue = this.promise.queue;

        //先触发callback
        for (var i = 0, len = queue.length; i < len; i++) {
            //要执行的函数
            // queue[i]['fulfilled']
            //对应的handler queue[i].deferred
            var callback = queue[i]['fulfilled'];
            var callbackDeferred = queue[i].deferred;
            //then 可以是空的，但是状态必须传递下去
            if (callback) {
                try {
                    var newResult = callback(result);
                    //判断回调里面是否有新的promise返回
                    if (newResult && newResult.then && newResult.setStatus) {
                        //这个时候,callbackDeferred的转态收到新返回的影响
                        newResult.then(function(res) {
                            callbackDeferred.resolve(res);
                        }, function(err) {
                            callbackDeferred.reject(err)
                        });
                    } else {
                        //没有的话，说明成功执行，到callback的promise到fulfilled状态
                        callbackDeferred.resolve(newResult);
                    }
                } catch (e) {
                    //callback的promise到rejected状态
                    callbackDeferred.reject(e);
                }
            } else {
                //没有callback的话直接resolve掉传给下面的
                callbackDeferred.resolve(result);
            }
        }
        //改变状态,清空队列，改变result
        this.promise.setStatus('fulfilled', result);
    }
    Deferred.prototype.reject = function(err) {
        var queue;
        if (!this.promise.isPending()) {
            return;
        }
        queue = this.promise.queue;

        //先触发callback
        for (var i = 0, len = queue.length; i < len; i++) {
            //要执行的函数
            // queue[i]['fulfilled']
            //对应的handler queue[i].deferred
            var callback = queue[i]['rejected'];
            var callbackDeferred = queue[i].deferred;
            //then 可以是空的，但是状态必须传递下去
            if (callback) {
                try {
                    var newResult = callback(err);
                    //判断回调里面是否有新的promise返回
                    if (newResult && newResult.then && newResult.setStatus) {
                        //这个时候,callbackDeferred的转态收到新返回的影响
                        newResult.then(function(res) {
                            callbackDeferred.resolve(res);
                        }, function(err) {
                            callbackDeferred.reject(err)
                        });
                    } else {
                        //没有的话，说明成功执行，到callback的promise到fulfilled状态
                        callbackDeferred.resolve(newResult);
                    }
                } catch (e) {
                    //callback的promise到rejected状态
                    callbackDeferred.reject(e);
                }
            } else {
                //没有callback的话直接reject掉传给下面的
                callbackDeferred.reject(err);
            }

        }
        this.promise.setStatus('rejected', err);
    }

    var MyPromise = function(factory) {
        var resolve;
        var defer = new Deferred();

        this.then = defer.promise.then.bind(defer.promise);
        factory(defer.resolve.bind(defer), defer.reject.bind(defer));
    };
    global.MyPromise = MyPromise;
})(window);

//调用方式
/*
new MyPromise(function(resolve, reject) {
    setTimeout(function() {
        reject(true);
    },200)
}).then().then(function() {
    console.log("mypromise resolve 1");
}, function() {
    console.log("mypromise reject 1");
}).then(function() {
    console.log("mypromise resolve 2");
}, function() {
    console.log("mypromise reject 2");
})
*/
