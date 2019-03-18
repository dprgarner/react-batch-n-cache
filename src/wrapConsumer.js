import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import BnCStatus from './constants';

/*
context: PropTypes.shape({
  fetch: PropTypes.func.isRequired,
  state: PropTypes.objectOf(
    PropTypes.shape({
      data: PropTypes.array,
      loaded: PropTypes.boolean,
      error: PropTypes.object,
    }),
  ).isRequired,
}).isRequired,
*/

export default function wrapConsumer(Context) {
  return class BnCConsumer extends React.Component {
    static propTypes = {
      children: PropTypes.func.isRequired,
      // eslint-disable-next-line react/forbid-prop-types
      values: PropTypes.array.isRequired,
    };

    static contextType = Context;

    state = {};

    componentDidMount() {
      this.context.fetch(this.props.values);
    }

    componentDidUpdate(prevProps) {
      if (!_.isEqual(prevProps.values, this.props.values)) {
        this.context.fetch(this.props.values);
      }
    }

    shouldComponentUpdate(prevProps, prevState, prevContext) {
      if (
        !_.isEqual(prevProps.values, this.props.values) ||
        prevProps.children !== this.props.children
      ) {
        return true;
      }

      return _.some(
        prevProps.values,
        id => this.context.state[id] !== prevContext.state[id],
      );
    }

    retry = () => {
      this.context.fetch(this.props.values);
    };

    render() {
      let data = {};
      let status;
      if (
        _.some(this.props.values, id => !(this.context.state[id] || {}).loaded)
      ) {
        status = BnCStatus.LOADING;
      } else if (
        _.some(this.props.values, id => (this.context.state[id] || {}).errored)
      ) {
        status = BnCStatus.ERROR;
      } else {
        status = BnCStatus.COMPLETE;
        data = this.props.values.map(id => (this.context.state[id] || {}).data);
      }

      return this.props.children({
        data,
        status,
        retry: this.retry,
      });
    }
  };
}
