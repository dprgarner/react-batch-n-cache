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

const toObj = ids => _.fromPairs(ids.map(id => [id, true]));
const delay = ms => new Promise(res => setTimeout(res, ms));

afterEach(cleanup);

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
      <BnC values={[1, 2, 3]}>
        {({ loading }) => <span>{loading && 'loading'}</span>}
      </BnC>
    </BnCProvider>,
  );
  expect(container).toHaveTextContent('loading');
});

it('sets loading to false after data is fetched', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { container } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1, 2, 3]}>
        {({ loading }) => <span>{loading && 'loading'}</span>}
      </BnC>
    </BnCProvider>,
  );
  await wait(
    () => {
      expect(container).not.toHaveTextContent('loading');
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
  expect(renderProp.mock.calls[0][0].loading).toBe(true);
});

it('sets loading to false and error to true on failure', async () => {
  const { BnC, BnCProvider } = createLoader();
  const renderProp = jest.fn(
    ({ loading, error }) => !loading && error && 'errored',
  );
  const e = new Error('nope');
  const { getByText } = render(
    <BnCProvider fetch={() => Promise.reject(e)}>
      <BnC values={[1, 2, 3]}>{renderProp}</BnC>
    </BnCProvider>,
  );
  await waitForElement(() => getByText(/errored/), {
    timeout: 500,
  });
  expect(renderProp.mock.calls[1][0].loading).toBe(false);
  expect(renderProp.mock.calls[1][0].error).toBe(e);
});

it('catches synchronous errors', async () => {
  const { BnC, BnCProvider } = createLoader();
  const renderProp = jest.fn(
    ({ loading, error }) => !loading && error && 'errored',
  );
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
  await waitForElement(() => getByText(/errored/), {
    timeout: 500,
  });
  expect(renderProp.mock.calls[1][0].loading).toBe(false);
  expect(renderProp.mock.calls[1][0].error).toBe(e);
});

it('retains loading state for previously-mounted cpts', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText, container } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1]}>
        {({ data, loading }) => !loading && Object.keys(data)}
      </BnC>
      <Toggle>
        {on =>
          on && (
            <BnC values={[2]}>
              {({ data, loading }) => !loading && Object.keys(data)}
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
});

it('caches values', async () => {
  const { BnC, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1]}>{({ loading }) => !loading && '#1'}</BnC>
      <Toggle>
        {on =>
          on && <BnC values={[1]}>{({ loading }) => !loading && '#2'}</BnC>
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
  fetch
    .mockReturnValueOnce(Promise.reject(new Error(':(')))
    .mockReturnValueOnce(Promise.resolve({ 1: 'ok' }));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnC values={[1]}>{({ loading }) => !loading && '#1'}</BnC>
      <Toggle>
        {on =>
          on && <BnC values={[1]}>{({ loading }) => !loading && '#2'}</BnC>
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
  expect(fetch).toHaveBeenCalledTimes(2);
});

// TODO: retry! invalidate! readme! ...update?
