// import _ from 'lodash';
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// import { delay } from './utils';
import Loader from './Loader';

export default function provideLoader(Context) {
  function BnCProvider(props) {
    const loader = useRef(new Loader());

    useEffect(() => {
      loader.current.setFetch(props.fetch);
    }, [props.fetch]);

    useEffect(() => {
      loader.current.setThrottle(props.throttle);
    }, [props.throttle]);

    useEffect(() => {
      loader.current.setRetry({
        ...BnCProvider.defaultProps.retry,
        ...props.retry,
      });
    }, [props.retry]);

    useEffect(() => () => loader.current.destroy(), []);

    return (
      <Context.Provider value={loader.current}>
        {props.children}
      </Context.Provider>
    );
  }

  BnCProvider.propTypes = {
    children: PropTypes.node.isRequired,
    fetch: PropTypes.func.isRequired,
    throttle: PropTypes.number,
    retry: PropTypes.shape({
      delay: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      max: PropTypes.number,
    }),
  };

  BnCProvider.defaultProps = {
    throttle: 0,
    retry: {
      delay: 'exponential',
      max: 25,
    },
  };

  return BnCProvider;
}
