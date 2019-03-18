import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import createLoader, { BnCStatus } from 'src';

const delay = ms => new Promise(res => setTimeout(res, ms));

const { BnC, BnCProvider } = createLoader();

const DemoCard = props => (
  <BnC values={props.values}>
    {({ data }) => (
      <div className="card">
        <span>{`Fetch: ${props.values.join(', ')}`}</span>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    )}
  </BnC>
);

DemoCard.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  values: PropTypes.array.isRequired,
};

const DogProvider = props => (
  <BnCProvider
    fetch={ids =>
      fetch(`/dog?${ids.map(id => `breed=${id}`).join('&')}`)
        .then(d => d.json())
        .then(d => d.dogs)
    }
  >
    {props.children}
  </BnCProvider>
);

DogProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

const Dog = props => (
  <BnC values={[props.breed]}>
    {({ status, data }) =>
      status === BnCStatus.COMPLETE && (
        <div
          className="card"
          style={{
            backgroundSize: 'cover',
            backgroundImage: `url(${data[props.breed]})`,
          }}
        />
      )
    }
  </BnC>
);

Dog.propTypes = {
  breed: PropTypes.string.isRequired,
};

class Demo extends React.Component {
  state = { calls: [] };

  render() {
    return (
      <main>
        <h1>React Batch 'n Cache</h1>
        <p>This is the demo page for trying out Batch 'n Cache.</p>
        <BnCProvider
          fetch={ids => {
            this.setState(s => ({ calls: [...s.calls, ids] }));
            console.log('fetching', ids);
            return delay(500).then(() =>
              _.fromPairs(ids.map(id => [id, 'done'])),
            );
          }}
        >
          <DemoCard values={[1, 2, 3]} />
          <DemoCard values={[3, 4, 5]} />
          <div>
            Calls:
            <ul>
              {this.state.calls.map((c, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={i}>{JSON.stringify(c)}</li>
              ))}
            </ul>
          </div>
        </BnCProvider>

        <DogProvider>
          <Dog breed="collie/border" />
          <Dog breed="boxer" />
          <Dog breed="dane-great" />
        </DogProvider>
      </main>
    );
  }
}

export default Demo;
