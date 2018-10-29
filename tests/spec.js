import _ from 'lodash';
import React from 'react';
import { render, cleanup, wait, waitForElement } from 'react-testing-library';

import createLoader from 'src';

const toObj = ids => _.fromPairs(ids.map(id => [id, true]));
const delay = ms => new Promise(res => setTimeout(res, ms));

afterEach(cleanup);

test('it fetches and re-renders', async () => {
  const { BnCConsumer, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnCConsumer values={[1, 2, 3]}>
        {({ data }) => Object.keys(data)}
      </BnCConsumer>
    </BnCProvider>,
  );
  await waitForElement(() => [getByText(/1/), getByText(/2/), getByText(/3/)], {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith([1, 2, 3]);
});

test('it batches fetches', async () => {
  const { BnCConsumer, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnCConsumer values={[1, 2]}>
        {({ data }) => Object.keys(data)}
      </BnCConsumer>
      <BnCConsumer values={[3, 4]}>
        {({ data }) => Object.keys(data)}
      </BnCConsumer>
    </BnCProvider>,
  );
  await waitForElement(() => [getByText(/1/), getByText(/4/)], {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith([1, 2, 3, 4]);
});

test('it only requests each key once', async () => {
  const { BnCConsumer, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { getByText } = render(
    <BnCProvider fetch={fetch}>
      <BnCConsumer values={[1, 2]}>
        {({ data }) => Object.keys(data)}
      </BnCConsumer>
      <BnCConsumer values={[2, 3]}>
        {({ data }) => Object.keys(data)}
      </BnCConsumer>
    </BnCProvider>,
  );
  await waitForElement(() => [getByText(/1/), getByText(/2/), getByText(/3/)], {
    timeout: 500,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith([1, 2, 3]);
});

test('it sets loading to true if data not fetched', async () => {
  const { BnCConsumer, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => delay(100).then(() => toObj(ids)));
  const { container } = render(
    <BnCProvider fetch={fetch}>
      <BnCConsumer values={[1, 2, 3]}>
        {({ loading }) => <span>{loading && 'loading'}</span>}
      </BnCConsumer>
    </BnCProvider>,
  );
  expect(container).toHaveTextContent('loading');
});

test('it sets loading to false after data is fetched', async () => {
  const { BnCConsumer, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => Promise.resolve(toObj(ids)));
  const { container } = render(
    <BnCProvider fetch={fetch}>
      <BnCConsumer values={[1, 2, 3]}>
        {({ loading }) => <span>{loading && 'loading'}</span>}
      </BnCConsumer>
    </BnCProvider>,
  );
  await wait(
    () => {
      expect(container).not.toHaveTextContent('loading');
    },
    { timeout: 100 },
  );
});

test.skip('it sets loading to true on the first render', async () => {
  // Work in progress.
  const { BnCConsumer, BnCProvider } = createLoader();
  const fetch = jest.fn(ids => delay(100).then(() => toObj(ids)));
  const renderProp = jest.fn(() => null);
  render(
    <BnCProvider fetch={fetch}>
      <BnCConsumer values={[1, 2, 3]}>{renderProp}</BnCConsumer>
    </BnCProvider>,
  );
  expect(renderProp.mock.calls[0][0].loading).toBe(true);
});
