import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

export default function wrapProvider(Provider) {
  class BnCProvider extends React.Component {
    static propTypes = {
      children: PropTypes.node.isRequired,
      fetch: PropTypes.func.isRequired,
    };

    state = {
      data: {},
      loaded: {},
    };

    queue = [];

    componentDidMount() {
      this.handleQueue();
    }

    componentDidUpdate() {
      this.handleQueue();
    }

    fetch = ids => {
      this.queue = _.uniq(this.queue.concat(ids));
    };

    getCtx = () => ({ ...this.state, fetch: this.fetch });

    handleQueue() {
      if (this.queue.length) {
        const batch = this.queue;
        this.props.fetch(this.queue).then(data => {
          this.setState(state => ({
            ...state,
            data: { ...state.data, ...data },
            loaded: {
              ...state.loading,
              ..._.fromPairs(batch.map(id => [id, true])),
            },
          }));
        });
      }
      this.queue = [];
    }

    render() {
      return <Provider value={this.getCtx()}>{this.props.children}</Provider>;
    }
  }

  return BnCProvider;
}
