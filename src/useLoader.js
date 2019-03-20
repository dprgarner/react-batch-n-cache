import _ from 'lodash';
import { useEffect, useContext, useState } from 'react';

const useForceUpdate = () => {
  const [, setState] = useState(0);
  return () => setState(s => s + 1);
};

export default function useLoader(Context, values) {
  const loader = useContext(Context);

  const data = loader.getData(values);
  const status = loader.getStatus(values);
  const retry = () => loader.requestData(values);

  useEffect(() => {
    loader.requestData(values);
  }, [loader, values]);

  const forceUpdate = useForceUpdate();

  useEffect(() => {
    _.forEach(values, value => {
      loader.subscribe(value, forceUpdate);
    });
    return () =>
      _.forEach(values, value => {
        loader.unsubscribe(value, forceUpdate);
      });
  }, [loader, values, forceUpdate]);

  return { data, status, retry };
}
