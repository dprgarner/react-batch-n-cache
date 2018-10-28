import _ from 'lodash';
import React from 'react';
import { render, cleanup, waitForElement } from 'react-testing-library';

import createLoader from 'src';

// const wait = ms => new Promise(res => setTimeout(res, ms));

afterEach(cleanup);

test('it renders without exploding', async () => {
  const { BnCConsumer, BnCProvider } = createLoader();
  const { getByText } = render(
    <BnCProvider
      fetch={ids => Promise.resolve(_.fromPairs(ids.map(id => [id, 'done'])))}
    >
      <BnCConsumer values={[1, 2, 3]}>
        {({ data }) => (
          <>
            {data[1] && <span>1</span>}
            {data[2] && <span>2</span>}
            {data[3] && <span>3</span>}
          </>
        )}
      </BnCConsumer>
    </BnCProvider>,
  );
  const [el1, el2] = await waitForElement(
    () => [getByText('1'), getByText('2'), getByText('3')],
    { timeout: 500 },
  );

  expect(el1).toBeTruthy();
  expect(el2).toBeTruthy();
});
