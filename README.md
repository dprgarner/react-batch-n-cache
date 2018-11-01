# React Batch 'n Cache.

A library component for batching and catching asynchronous GET requests. Inspired by Dataloader and Apollo GraphQL.

```jsx
import createLoader from 'react-batch-n-cache';

const { BnCProvider, BnCConsumer } = createLoader();

// Using the Provider
const App = () => (
  <BnCProvider
    throttle={10}
    fetch={ids => fetchFromAPI(ids).then(res => res.data)}
  >
    <Main />
  </BnCProvider>
);

// Using the Consumer
const Main = () => (
  <BnCConsumer values={['a', 'b', 'c']}>
    {({ loading, error, data, retry }) => {
      if (error) {
        return (
          <div className="error">
            {error.message}
            <button onClick={() => retry()}>Retry</button>
          </div>
        );
      }
      if (loading) {
        return <span>Loading...</span>;
      }

      return (
        <ul>
          <li>{data.a}</li>
          <li>{data.b}</li>
          <li>{data.c}</li>
        </ul>
      );
    }}
  </BnCConsumer>
);

ReactDOM.render(<App />, document.getElementById('root'));
```

- Does not fetch an ID more than once
- What do we do about errors and failures to retrieve?
  https://github.com/facebook/dataloader/blob/master/src/index.js
