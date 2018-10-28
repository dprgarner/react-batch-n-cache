import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import createLoader from 'src';

const wait = ms => new Promise(res => setTimeout(res, ms));

const { BnCConsumer, BnCProvider } = createLoader();

const DemoCard = props => (
  <BnCConsumer values={props.values}>
    {({ data }) => (
      <div className="card">
        <span>{`Fetch: ${props.values.join(', ')}`}</span>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    )}
  </BnCConsumer>
);

DemoCard.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  values: PropTypes.array.isRequired,
};

const Demo = () => (
  <div>
    <p>This is the demo page for trying out Batch 'n Cache.</p>
    <BnCProvider
      fetch={ids => {
        console.log('fetching', ids);
        return wait(500).then(() => _.fromPairs(ids.map(id => [id, true])));
      }}
    >
      <DemoCard values={[1, 2, 3]} />
      <DemoCard values={[3, 4, 5]} />
    </BnCProvider>
  </div>
);

export default Demo;
