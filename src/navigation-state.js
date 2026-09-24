/**
 * 创建一个“最后一次导航生效”的令牌守卫。
 * 跨越异步卸载/挂载后，旧导航只能完成清理，不能再提交界面状态。
 */
export function createLatestNavigationGuard() {
  let sequence = 0;
  return {
    begin() {
      sequence += 1;
      return sequence;
    },
    isLatest(token) {
      return token === sequence;
    },
  };
}

/**
 * 串行执行导航副作用，同时让队列中较早的任务知道自己已经过期。
 * 这样卸载、挂载与最终 UI 提交不会在多次快速点击之间交叉。
 */
export function createLatestNavigationQueue() {
  const guard = createLatestNavigationGuard();
  let tail = Promise.resolve();

  return {
    run(task) {
      const token = guard.begin();
      const execute = () => task(() => guard.isLatest(token));
      const result = tail.then(execute, execute);
      tail = result.catch(() => {});
      return result;
    },
  };
}
