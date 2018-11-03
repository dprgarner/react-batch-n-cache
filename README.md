# React Batch 'n Cache.

A library component for batching and catching asynchronous GET requests. Inspired by Dataloader and Apollo GraphQL.

```jsx
import { createLoader, BnCStatus } from 'react-batch-n-cache';

const { BnCProvider, BnC } = createLoader();

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
    {({ status, data, retry }) => {
      if (status === BnCStatus.LOADING) {
        return <span>Loading...</span>;
      }
      if (status === BnCStatus.ERROR) {
        return (
          <div className="error">
            Something went wrong.
            <button onClick={() => retry()}>Retry</button>
          </div>
        );
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

https://github.com/facebook/dataloader/blob/master/src/index.js
