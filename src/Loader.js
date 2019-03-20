import _ from 'lodash';

import status from './constants';
import { delay } from './utils';

export default class Loader {
  queue = [];

  state = {};

  subscribers = {};

  unmounted = false;

  notify(value) {
    if (!this.unmounted) {
      (this.subscribers[value] || []).forEach(cb => cb());
    }
  }

  subscribe(value, cb) {
    this.subscribers[value] = this.subscribers[value] || [];
    this.subscribers[value].push(cb);
  }

  unsubscribe(value, cb) {
    const idx = (this.subscribers[value] || []).indexOf(cb);
    if (idx !== -1) {
      this.subscribers[value].splice(idx, 1);
    }
  }

  destroy() {
    this.unmounted = true;
  }

  setFetch(fetch) {
    this.propFetch = fetch;
  }

  setRetry(retry) {
    this.propRetry = retry;
  }

  setThrottle(throttle) {
    if (this.throttledFlushQueue) {
      this.throttledFlushQueue.cancel();
    }
    this.throttledFlushQueue = _.throttle(this.flushQueue, throttle, {
      leading: false,
    });
    this.throttledFlushQueue();
  }

  requestData(ids) {
    ids
      .filter(
        id =>
          !this.queue.includes(id) &&
          (!this.state[id] || this.state[id].errored),
      )
      .forEach(id => {
        this.queue.push(id);
        if ((this.state[id] || {}).errored) {
          this.notify(id);
        }
        this.state[id] = {
          complete: false,
          attempts: ((this.state[id] || {}).attempts || 0) + 1,
        };
      });

    if (this.throttledFlushQueue) {
      this.throttledFlushQueue();
    }
  }

  flushQueue = async () => {
    const { queue } = this;
    this.queue = [];
    if (!queue.length) return;

    try {
      const res = await this.propFetch(queue);
      queue.forEach((id, index) => {
        this.state[id].complete = true;
        this.state[id].data = res[index];
        this.notify(id);
      });
    } catch (e) {
      queue.forEach(id => {
        this.state[id].complete = false;
        this.state[id].errored = true;
        this.notify(id);
      });
      this.retry(queue);
    }
  };

  getData(ids) {
    return ids.map(id => (this.state[id] || {}).data);
  }

  getStatus(ids) {
    if (_.some(ids, id => (this.state[id] || {}).errored)) {
      return status.ERRORED;
    }
    if (_.some(ids, id => !(this.state[id] || {}).complete)) {
      return status.LOADING;
    }
    return status.COMPLETE;
  }

  async retry(ids) {
    // This method is bloody hard to test.
    if (this.unmounted) return;

    const attempts = _.reduce(
      ids,
      (acc, id) => Math.max(this.state[id].attempts, acc),
      0,
    );
    if (attempts < this.propRetry.max) {
      const waitTime =
        this.propRetry.delay === 'exponential'
          ? 250 * 2 ** (attempts - 1)
          : this.propRetry.delay;
      await delay(waitTime);
      this.requestData(ids);
    }
  }
}
