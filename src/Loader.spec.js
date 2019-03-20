import Loader from './Loader';
import { delay } from './utils';
import status from './constants';

describe('Loader subscriptions', () => {
  it('triggers subscription callbacks', () => {
    const loader = new Loader({});
    const spy = jest.fn();
    loader.subscribe('1', spy);
    expect(spy).not.toHaveBeenCalled();
    loader.notify('1');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('only triggers the relevant callbacks', () => {
    const loader = new Loader({});
    const spy1 = jest.fn();
    const spy2 = jest.fn();
    loader.subscribe('1', spy1);
    loader.subscribe('2', spy2);
    loader.notify('2');
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('triggers all the relevant callbacks', () => {
    const loader = new Loader({});
    const spy1 = jest.fn();
    const spy2 = jest.fn();
    loader.subscribe('1', spy1);
    loader.subscribe('1', spy2);
    loader.notify('1');
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes callbacks', () => {
    const loader = new Loader({});
    const spy1 = jest.fn();
    const spy2 = jest.fn();
    loader.subscribe('1', spy1);
    loader.subscribe('1', spy2);
    loader.unsubscribe('1', spy1);
    loader.notify('1');
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('does not fail if unsubscribed callback missing', () => {
    const loader = new Loader({});
    const spy1 = jest.fn();
    const spy2 = jest.fn();
    loader.subscribe('1', spy1);
    loader.subscribe('1', spy2);
    loader.unsubscribe('1', spy1);
    loader.unsubscribe('1', spy1);
    loader.notify('1');
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledTimes(1);
  });
});

describe('Loader statuses', () => {
  let loader;

  beforeEach(() => {
    loader = new Loader();
    loader.setThrottle(10);
    loader.setFetch(ids => Promise.resolve(ids));
    loader.setRetry({ delay: 1000 });
  });

  it('sets status to complete when done', async () => {
    loader.requestData(['1', '2', '3']);
    expect(loader.getStatus(['1', '2', '3'])).toBe(status.LOADING);
    await delay(20);
    expect(loader.getStatus(['1', '2', '3'])).toBe(status.COMPLETE);
  });

  it('sets status to errored when failed', async () => {
    loader.setFetch(() => Promise.reject(new Error(':(')));
    loader.requestData(['1', '2', '3']);
    expect(loader.getStatus(['1', '2', '3'])).toBe(status.LOADING);
    await delay(20);
    expect(loader.getStatus(['1', '2'])).toBe(status.ERRORED);
  });

  it('sets errored over loading', async () => {
    loader.setFetch(ids =>
      ids.includes('1')
        ? delay(100).then(ids)
        : Promise.reject(new Error(':(')),
    );
    loader.requestData(['1', '2', '3']);
    await delay(20);
    loader.requestData(['3', '4']);
    expect(loader.getStatus(['1', '2', '3', '4'])).toBe(status.LOADING);

    await delay(20);
    expect(loader.getStatus(['3', '4'])).toBe(status.ERRORED);
    expect(loader.getStatus(['3'])).toBe(status.LOADING);
  });
});

describe('Loader data', () => {
  let loader;

  beforeEach(() => {
    loader = new Loader();
    loader.setThrottle(10);
    loader.setFetch(ids => Promise.resolve(ids));
    loader.setRetry({ delay: 1000 });
  });

  it('sets data', async () => {
    loader.setFetch(ids =>
      ids.includes('1')
        ? Promise.resolve(ids)
        : Promise.reject(new Error(':(')),
    );
    loader.requestData(['1', '2', '3']);
    expect(loader.getData(['1', '2', '3'])).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    await delay(20);
    expect(loader.getData(['1', '2', '3'])).toEqual(['1', '2', '3']);

    loader.requestData(['3', '4']);
    await delay(20);
    expect(loader.getData(['3', '4'])).toEqual(['3', undefined]);
  });

  it('notifies on update data', async () => {
    const spy = jest.fn();
    loader.subscribe('1', spy);
    loader.requestData(['1', '2', '3']);
    expect(spy).toHaveBeenCalledTimes(0);

    await delay(20);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('notifies on error', async () => {
    const spy = jest.fn();
    loader.subscribe('1', spy);
    loader.setFetch(() => Promise.reject(new Error(':(')));
    loader.requestData(['1', '2', '3']);
    expect(spy).toHaveBeenCalledTimes(0);

    await delay(20);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('notifies on refetching an errored request', async () => {
    const spy = jest.fn();
    loader.subscribe('1', spy);
    loader.setFetch(() =>
      delay(10).then(() => Promise.reject(new Error(':('))),
    );
    loader.requestData(['1', '2', '3']);
    expect(spy).toHaveBeenCalledTimes(0);

    await delay(40);
    expect(spy).toHaveBeenCalledTimes(1);

    loader.requestData(['1', '2', '3']);
    expect(spy).toHaveBeenCalledTimes(2);

    await delay(40);
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
