import _ from 'lodash';
import React from 'react';
import { render, cleanup, wait, waitForElement } from 'react-testing-library';

import createLoader from 'src';

const toObj = ids => _.fromPairs(ids.map(id => [id, true]));
const delay = ms => new Promise(res => setTimeout(res, ms));

afterEach(cleanup);

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

it.skip('sets loading to false and error to true on failure', async () => {
  const { BnC, BnCProvider } = createLoader();
  const { getByText } = render(
    <BnCProvider fetch={() => Promise.reject(new Error('nope'))}>
      <BnC values={[1, 2, 3]}>
        {({ loading, error }) => !loading && error && 'errored'}
      </BnC>
    </BnCProvider>,
  );
  await waitForElement(() => getByText(/errored/), {
    timeout: 500,
  });
});
