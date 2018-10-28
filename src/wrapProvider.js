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

    handleQueue() {
      if (this.queue.length) {
        this.props.fetch(this.queue).then(data => {
          this.setState(state => ({
            ...state,
            data: { ...state.data, ...data },
          }));
        });
      }
      this.queue = [];
    }

    render() {
      return (
        <Provider value={{ data: this.state.data, fetch: this.fetch }}>
          {this.props.children}
        </Provider>
      );
    }
  }

  return BnCProvider;
}
