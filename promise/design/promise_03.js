(function(global) {
    //promise状态的传递
    function passInfoToNextPromise(currentStatus,currentResult,nextDeferred){
        switch (currentStatus){
            case "fulfilled":
                nextDeferred.resolve(currentResult);
            ;break;
            case "rejected":
                nextDeferred.reject(currentResult);
            ;break;
            default:
                throw new Error("错误的promise状态"+currentStatus);
            ;
        }
    }

    //执行回调并传递信息
    function execCallbackAndPassInfo(currentResult,nextDeferred,callback){
        try {
            var newResult = callback(currentResult);

            if (newResult && newResult.then) {
                //callbackDeferred 的状态由newResult决定
                newResult.then(function(res) {
                    nextDeferred.resolve(res);
                }, function(err) {
                    nextDeferred.reject(err);
                });
            } else {
                //正常执行callbackDeferred变成fulfilled
                nextDeferred.resolve(newResult);
            }
        } catch (e) {
            nextDeferred.reject(e);
        }
    }

    function pipeToNextPromise(currentStatus,currentResult,nextDeferred,callback){
        if (callback) {
            execCallbackAndPassInfo(currentResult,nextDeferred,callback);
        } else {
            //没有callback的话直接reject掉传给下面的
            passInfoToNextPromise(currentStatus,currentResult,nextDeferred);
        }
    }

    var Promise = function() {
        this.status = 'pending';
        //{fulfilled:"xx",rejected:"xxxx"}
        this.queue = [];
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
                //保证promise对象不能修改，但是this.queue还是能push进新的元素
                Object.freeze(this);
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

            pipeToNextPromise(currentStatus,currentResult,callbackDeferred,callback);
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
            pipeToNextPromise('fulfilled',result,callbackDeferred,callback);
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
            pipeToNextPromise('rejected',err,callbackDeferred,callback)

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
});

*/