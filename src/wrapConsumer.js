import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

export default function wrapConsumer(Consumer) {
  class ConsumerWithCtx extends React.Component {
    static propTypes = {
      ctx: PropTypes.shape({
        data: PropTypes.object.isRequired,
        fetch: PropTypes.func.isRequired,
      }).isRequired,
      children: PropTypes.func.isRequired,
      // eslint-disable-next-line react/forbid-prop-types
      values: PropTypes.array.isRequired,
    };

    state = {};

    componentDidMount() {
      this.props.ctx.fetch(this.props.values);
    }

    render() {
      return this.props.children({
        data: _.pick(this.props.ctx.data, this.props.values),
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
