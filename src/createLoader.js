import React from 'react';
import PropTypes from 'prop-types';

import provideLoader from './provideLoader';
import useLoader from './useLoader';

export default function createLoader() {
  const BnCContext = React.createContext();
  const BnCProvider = provideLoader(BnCContext);

  const useBnC = values => useLoader(BnCContext, values);
  const BnC = props => props.children(useBnC(props.values));

  BnC.propTypes = {
    values: PropTypes.arrayOf(PropTypes.any).isRequired,
    children: PropTypes.func.isRequired,
  };

  return { BnCProvider, BnC, useBnC };
}
