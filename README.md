# co-annotations

本项目是针对[co](https://github.com/tj/co)的代码注释。在 ES6 中 generator 函数在语言层面支持 coroute 机制，即开发者在用户态通过 yield 语法释放当前线程的执行，而后通过调用迭代器的 next()方法来触发线程恢复逻辑。

但是 generator 函数需要手动维护迭代过程，对于开发者来说并不友善。而 ES7 规范的 async/await 语法机制集成了 promise 和 generator 这两种语言特性，并且内置了 generator 迭代自动执行机制，这样开发者无需关注迭代的具体过程，而简单按照同步编程方法即可编写异步代码。

ES7 的 async/await 语言特性内置的 generator 自动迭代机制，其原理类似[co](https://github.com/tj/co) 库，因此通过对[co](https://github.com/tj/co)库的源码理解即可理解 ES7 的 async/await 特性。
