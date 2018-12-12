var slice = Array.prototype.slice;

// 在ES6模块化中通过import co from 'co'引用
// 也可以通过from {co} from 'co"引入
module.exports = co["default"] = co.co = co;

/**
 * 返回promise函数
 * 函数参数fn表示generator函数
 */
co.wrap = function(fn) {
  createPromise.__generatorFunction__ = fn;
  return createPromise;
  function createPromise() {
    return co.call(this, fn.apply(this, arguments));
  }
};

/**
 * 返回promise
 * @param {*} gen 迭代器函数或者迭代器对象。
 * 当然如果是普通的函数，co也会执行并返回promise
 */
function co(gen) {
  var ctx = this;

  //co函数第一个参数为迭代器对象/迭代器函数，而后的可选参数被迭代器函数执行
  var args = slice.call(arguments, 1);

  return new Promise(function(resolve, reject) {
    // 将迭代器函数执行后返回迭代器对象
    if (typeof gen === "function") {
      gen = gen.apply(ctx, args);
    }

    // 如果迭代器对象为空或者迭代器对象的next属性并非函数
    // 说明co的gen参数要么为普通函数，要么就是一个普通参数
    if (!gen || typeof gen.next !== "function") {
      return resolve(gen);
    }

    // 在开始进行迭代操作时，触发一次Fulfilled函数
    onFulfilled();

    /**
     *
     * @param
     */
    function onFulfilled(res) {
      var ret;
      try {
        // 触发一次next操作，返回{value:XXX,done:XXX}结构
        ret = gen.next(res);
      } catch (e) {
        return reject(e);
      }
      next(ret);
      return null;
    }

    /**
     * @param {Error} err
     * @return {Promise}
     * @api private
     */

    function onRejected(err) {
      var ret;
      try {
        ret = gen.throw(err); //迭代器对象可以throw错误
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    /**
     * 返回promise
     * @param {*} ret 即生成器在迭代时可以对next函数传递参数，则修改了next内部的返回值
     */
    function next(ret) {
      //迭代结束，触发resolve回调
      if (ret.done) {
        return resolve(ret.value);
      }

      // 注意下面几行代码的作用就是驱动迭代器自动执行
      var value = toPromise.call(ctx, ret.value);
      if (value && isPromise(value)) {
        return value.then(onFulfilled, onRejected);
      }

      return onRejected(
        new TypeError(
          "You may only yield a function, promise, generator, array, or object, " +
            'but the following object was passed: "' +
            String(ret.value) +
            '"'
        )
      );
    }
  });
}

/**
 * 返回promise函数
 * @param {*} obj 具有yieldable能力的对象，包括普通对象、数组、promise、generator对象/generator函数等
 */
function toPromise(obj) {
  if (!obj) {
    return obj;
  }

  // 参数本身为promise，则直接返回
  if (isPromise(obj)) {
    return obj;
  }

  // 针对生成器函数/生成器对象，则直接调用co从而形成递归过程。这也是自动迭代的一种机制
  if (isGeneratorFunction(obj) || isGenerator(obj)) {
    return co.call(this, obj);
  }

  // 对函数参数的thunkify处理
  if ("function" == typeof obj) {
    return thunkToPromise.call(this, obj);
  }

  //数组对象的promise处理
  if (Array.isArray(obj)) {
    return arrayToPromise.call(this, obj);
  }

  //普通对象的promise处理
  if (isObject(obj)) {
    return objectToPromise.call(this, obj);
  }
  return obj;
}

/**
 *
 * @param {*} fn Thunk函数，表示只接受单参数函数
 */
function thunkToPromise(fn) {
  var ctx = this;
  return new Promise(function(resolve, reject) {
    fn.call(ctx, function(err, res) {
      if (err) {
        return reject(err);
      }

      // 主要下面arguments表示fn调用时参数
      if (arguments.length > 2) {
        res = slice.call(arguments, 1);
      }
      resolve(res);
    });
  });
}

//将可以yieldable的数组转换为promise数组
function arrayToPromise(obj) {
  return Promise.all(obj.map(toPromise, this));
}

/**
 * 返回promise
 * @param {*} obj 具有yieldables能力的对象
 */
function objectToPromise(obj) {
  // 创建空对象
  var results = new obj.constructor();

  // 当前对象自身可枚举属性名
  var keys = Object.keys(obj);

  // 一组promise对象
  var promises = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var promise = toPromise.call(this, obj[key]);

    // 可以被转换为promise的对象，则添加到promises数组
    if (promise && isPromise(promise)) {
      defer(promise, key);
    } else {
      // 简单copy操作
      results[key] = obj[key];
    }
  }

  return Promise.all(promises).then(function() {
    return results;
  });

  //注意，由于闭包性质。下面promise对象都会被添加到promises数组中
  function defer(promise, key) {
    // predefine the key in the result
    results[key] = undefined;
    promises.push(
      promise.then(function(res) {
        results[key] = res;
      })
    );
  }
}

/**
 * 判定是否promise
 * @param {*} obj promise对象，一定具备then方法
 */
function isPromise(obj) {
  return "function" == typeof obj.then;
}

/**
 * 判定是否是迭代器
 * @param {*} obj 迭代器对象实现了iterator protocols，即具有next()方法。
 * 注意ES6的generator函数执行后返回的才是迭代器，其本身不是，只不过该函数可以辅助保存迭代状态而已
 */
function isGenerator(obj) {
  return "function" == typeof obj.next && "function" == typeof obj.throw;
}

/**
 *
 * @param {*} obj 迭代器函数,而迭代器函数即generator本身也是iterator的一种
 */
function isGeneratorFunction(obj) {
  var constructor = obj.constructor;
  if (!constructor) {
    return false;
  }
  if (
    "GeneratorFunction" === constructor.name ||
    "GeneratorFunction" === constructor.displayName
  )
    return true;

  return isGenerator(constructor.prototype);
}

//判断参数是否是普通对象
function isObject(val) {
  return Object == val.constructor;
}
