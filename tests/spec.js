import PropTypes from 'prop-types';
import _ from 'lodash';
import React from 'react';
import {
  render,
  cleanup,
  wait,
  fireEvent,
  waitForElement,
} from 'react-testing-library';

import createLoader from 'src';
import BnCStatus from 'src/constants';
import * as utils from 'src/utils';

const { delay } = utils;

const toObj = ids => _.fromPairs(ids.map(id => [id, true]));

beforeEach(() => {
  console.error = jest.fn();
});

afterEach((...args) => {
  utils.delay = delay;
  return cleanup(...args);
});

/**
 * Utility component for testing subsequent mounts.
 */
class Toggle extends React.Component {
  static propTypes = { children: PropTypes.func.isRequired };

  state = { on: false };

  render() {
    return (
      <>
        {this.props.children(this.state.on)}
        <button type="button" onClick={() => this.setState({ on: true })}>
          Show
        </button>
      </>
    );
  }
}

it('fetches and re-renders', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1, 2, 3]}>{({ data }) => Object.keys(data)}</BnC>
    </BnCProvider>,
  );
  await waitForElement(() => [getByText(/1/), getByText(/2/), getByText(/3/)], {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith([1, 2, 3]);
});

it('batches fetches', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1, 2]}>{({ data }) => Object.keys(data)}</BnC>
      <BnC values={[3, 4]}>{({ data }) => Object.keys(data)}</BnC>
    </BnCProvider>,
  );
  await waitForElement(() => [getByText(/1/), getByText(/4/)], {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith([1, 2, 3, 4]);
});

it('only requests each key once', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1, 2]}>{({ data }) => Object.keys(data)}</BnC>
      <BnC values={[2, 3]}>{({ data }) => Object.keys(data)}</BnC>
    </BnCProvider>,
  );
  await waitForElement(() => [getByText(/1/), getByText(/2/), getByText(/3/)], {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith([1, 2, 3]);
});

it('sets loading to true if data not fetched', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => delay(100).then(() => toObj(ids)));
  const { container } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1, 2, 3]}>{({ status }) => <span>{status}</span>}</BnC>
    </BnCProvider>,
  );
  expect(container).toHaveTextContent(BnCStatus.LOADING);
});

it('sets loading to false after data is fetched', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { container } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1, 2, 3]}>{({ status }) => <span>{status}</span>}</BnC>
    </BnCProvider>,
  );
  await wait(
    () => {
      expect(container).not.toHaveTextContent(BnCStatus.LOADING);
    },
    { timeout: 100 },
  );
});

it('sets loading to true on the first render', () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => delay(100).then(() => toObj(ids)));
  const renderProp = jest.fn(() => null);
  render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1, 2, 3]}>{renderProp}</BnC>
    </BnCProvider>,
  );
  expect(renderProp.mock.calls[0][0].status).toBe(BnCStatus.LOADING);
});

it('sets loading to false and error to true on failure', async () => {
  const { BnC, BnCProvider } = createLoader();
  const renderProp = jest.fn(({ status }) => status);
  const e = new Error('nope');
  const { getByText } = render(
    <BnCProvider fetch={() => Promise.reject(e)}>
      <BnC values={[1, 2, 3]}>{renderProp}</BnC>
    </BnCProvider>,
  );
  await waitForElement(() => getByText(BnCStatus.ERROR), {
    timeout: 500,
  });
  expect(console.error).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith(e);
});

it('catches synchronous errors', async () => {
  const { BnC, BnCProvider } = createLoader();
  const renderProp = jest.fn(({ status }) => status);
  const e = new Error('nope');
  const { getByText } = render(
    <BnCProvider
      fetch={() => {
        throw e;
      }}
    >
      <BnC values={[1, 2, 3]}>{renderProp}</BnC>
    </BnCProvider>,
  );
  await waitForElement(() => getByText(BnCStatus.ERROR), {
    timeout: 500,
  });
  expect(console.error).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith(e);
});

it('retains loading state for previously-mounted cpts', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText, container } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1]}>
        {({ data, status }) =>
          status === BnCStatus.COMPLETE && Object.keys(data)
        }
      </BnC>
      <Toggle>
        {on =>
          on && (
            <BnC values={[2]}>
              {({ data, status }) =>
                status === BnCStatus.COMPLETE && Object.keys(data)
              }
            </BnC>
          )
        }
      </Toggle>
    </BnCProvider>,
  );
  await waitForElement(() => getByText(/1/), {
    timeout: 500,
  });
  fireEvent.click(getByText('Show'));

  await waitForElement(() => getByText(/2/), {
    timeout: 500,
  });
  expect(container).toHaveTextContent('1');
  expect(container).toHaveTextContent('2');
});

it('does not re-render consumers with distinct values', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const renderProp1 = jest.fn(() => null);
  const renderProp2 = jest.fn(() => null);
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1]}>{renderProp1}</BnC>
      <Toggle>{on => on && <BnC values={[2]}>{renderProp2}</BnC>}</Toggle>
    </BnCProvider>,
  );
  await delay(10);
  expect(renderProp1).toHaveBeenCalledTimes(2);

  fireEvent.click(getByText('Show'));
  await delay(10);
  expect(fetch).toHaveBeenCalledTimes(2);

  await delay(10);
  expect(renderProp1).toHaveBeenCalledTimes(2);
  expect(renderProp2).toHaveBeenCalledTimes(2);
});

it('fetches on changing values', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const renderProp = jest.fn(() => null);
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <Toggle>{on => <BnC values={on ? [2] : [1]}>{renderProp}</BnC>}</Toggle>
    </BnCProvider>,
  );
  await delay(10);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith([1]);

  fireEvent.click(getByText('Show'));
  await delay(10);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledWith([2]);
});

it('re-renders on changing the render prop', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => delay(100).then(() => toObj(ids)));
  const renderProp1 = jest.fn(() => null);
  const renderProp2 = jest.fn(() => null);
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <Toggle>
        {on => <BnC values={[1]}>{on ? renderProp2 : renderProp1}</BnC>}
      </Toggle>
    </BnCProvider>,
  );
  await delay(10);
  expect(renderProp1).toHaveBeenCalledTimes(1);

  fireEvent.click(getByText('Show'));
  await delay(10);
  expect(renderProp2).toHaveBeenCalledTimes(1);
});

it('updates the throttle debounce time', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const renderProp = jest.fn(() => null);
  const { getByText } = render(
    <Toggle>
      {on => (
        <BnCProvider fetch={fetch} throttle={on ? 1000 : 0}>
          <BnC values={on ? [2] : [1]}>{renderProp}</BnC>
        </BnCProvider>
      )}
    </Toggle>,
  );
  await delay(10);
  expect(fetch).toHaveBeenCalledTimes(1);

  fireEvent.click(getByText('Show'));
  await delay(100);
  expect(fetch).toHaveBeenCalledTimes(1);

  await delay(1000);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('caches values', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1]}>
        {({ status }) => status === BnCStatus.COMPLETE && '#1'}
      </BnC>
      <Toggle>
        {on =>
          on && (
            <BnC values={[1]}>
              {({ status }) => status === BnCStatus.COMPLETE && '#2'}
            </BnC>
          )
        }
      </Toggle>
    </BnCProvider>,
  );
  await waitForElement(() => getByText(/#1/), {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);

  fireEvent.click(getByText('Show'));
  await waitForElement(() => getByText(/#2/), {
    timeout: 500,
  });

  // Wait for throttled function to flush
  await delay(10);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('does not cache errors', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn();
  fetch.mockReturnValue(Promise.reject(new Error(':(')));

  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1]}>
        {({ status }) => status === BnCStatus.ERROR && '#1'}
      </BnC>
      <Toggle>
        {on =>
          on && (
            <BnC values={[1, 2]}>
              {({ status }) => status === BnCStatus.ERROR && '#2'}
            </BnC>
          )
        }
      </Toggle>
    </BnCProvider>,
  );
  await waitForElement(() => getByText(/#1/), {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith([1]);

  fireEvent.click(getByText('Show'));
  await waitForElement(() => getByText(/#2/), {
    timeout: 500,
  });
  // Wait for throttled function to flush
  await delay(10);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledWith([1, 2]);
});

it('allows retries on error', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn();
  fetch
    .mockReturnValueOnce(Promise.reject(new Error(':(')))
    .mockReturnValueOnce(Promise.resolve({ 1: 'ok' }));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1]}>
        {({ status, data, retry }) => {
          if (status === BnCStatus.ERROR) {
            return (
              <button type="button" onClick={() => retry()}>
                retry
              </button>
            );
          }
          if (status === BnCStatus.LOADING) {
            return 'loading';
          }
          return data[1];
        }}
      </BnC>
    </BnCProvider>,
  );
  await waitForElement(() => getByText(/retry/), {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(getByText('retry'));

  await delay(10);
  expect(fetch).toHaveBeenCalledTimes(2);
  await waitForElement(() => getByText(/ok/), {
    timeout: 500,
  });
});

it('automatically retries on error after an interval', async () => {
  const { BnC, BnCProvider } = createLoader();
  utils.delay = jest.fn(() => () => Promise.resolve());

  const fetch = jest.fn();
  fetch.mockReturnValue(Promise.reject(new Error(':(')));

  render(
    <BnCProvider fetch={fetch} retry={{ delay: 'exponential', max: 3 }}>
      <BnC values={[1]}>{({ status }) => status}</BnC>
    </BnCProvider>,
  );
  await delay(100);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(utils.delay).toHaveBeenCalledTimes(2);
  expect(utils.delay).toHaveBeenCalledWith(250);
  expect(utils.delay).toHaveBeenCalledWith(500);
});

it('retries on error after a set interval', async () => {
  const { BnC, BnCProvider } = createLoader();
  utils.delay = jest.fn(() => () => Promise.resolve());

  const fetch = jest.fn();
  fetch.mockReturnValue(Promise.reject(new Error(':(')));

  render(
    <BnCProvider fetch={fetch} retry={{ delay: 300, max: 3 }}>
      <BnC values={[1]}>{({ status }) => status}</BnC>
    </BnCProvider>,
  );
  await delay(100);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(utils.delay).toHaveBeenCalledTimes(2);
  expect(utils.delay).toHaveBeenCalledWith(300);
  expect(utils.delay).toHaveBeenCalledWith(300);
});

it('retries on error after an interval by default', async () => {
  const { BnC, BnCProvider } = createLoader();

  jest.spyOn(utils, 'delay');
  const fetch = jest.fn();
  fetch
    .mockImplementationOnce(() => Promise.reject(new Error(':(')))
    .mockImplementationOnce(() => Promise.reject(new Error(':(')))
    .mockImplementationOnce(() => Promise.reject(new Error(':(')))
    .mockImplementationOnce(() => Promise.reject(new Error(':(')))
    .mockImplementationOnce(() => Promise.resolve({ 1: 'ok' }));

  render(
    <BnCProvider fetch={fetch} retry={{ delay: 10 }}>
      <BnC values={[1]}>{({ status }) => status}</BnC>
    </BnCProvider>,
  );
  await delay(300);
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(utils.delay).toHaveBeenCalledTimes(4);
  expect(utils.delay.mock.calls).toEqual([[10], [10], [10], [10]]);
});
