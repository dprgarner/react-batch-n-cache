import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

export default function wrapConsumer(Consumer) {
  class ConsumerWithCtx extends React.Component {
    static propTypes = {
      ctx: PropTypes.shape({
        fetch: PropTypes.func.isRequired,
        state: PropTypes.objectOf(
          PropTypes.shape({
            data: PropTypes.any,
            loaded: PropTypes.boolean,
            error: PropTypes.object,
          }),
        ).isRequired,
      }).isRequired,
      children: PropTypes.func.isRequired,
      // eslint-disable-next-line react/forbid-prop-types
      values: PropTypes.array.isRequired,
    };

    state = {};

    componentDidMount() {
      this.props.ctx.fetch(this.props.values);
    }

    componentDidUpdate(prevProps) {
      if (!_.isEqual(prevProps.values, this.props.values)) {
        this.props.ctx.fetch(this.props.values);
      }
    }

    shouldComponentUpdate(prevProps) {
      if (
        !_.isEqual(prevProps.values, this.props.values) ||
        prevProps.children !== this.props.children
      ) {
        return true;
      }
      return _.some(
        prevProps.values,
        id => this.props.ctx.state[id] !== prevProps.ctx.state[id],
      );
    }

    render() {
      const data = _.fromPairs(
        this.props.values.map(id => [id, this.props.ctx.state[id]]),
      );
      const loading = _.some(
        this.props.values,
        id => !(this.props.ctx.state[id] || {}).loaded,
      );
      const { error } =
        this.props.ctx.state[
          _.find(this.props.values, id => this.props.ctx.state[id])
        ] || {};

      return this.props.children({
        data,
        loading,
        error,
      });
    }
  }

  function BnCConsumer(props) {
    return (
      <Consumer>{ctx => <ConsumerWithCtx {...props} ctx={ctx} />}</Consumer>
    );
  }

  return BnCConsumer;
}
