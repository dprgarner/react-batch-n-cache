import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

export default function wrapProvider(Provider) {
  class BnCProvider extends React.Component {
    static propTypes = {
      children: PropTypes.node.isRequired,
      fetch: PropTypes.func.isRequired,
      throttle: PropTypes.number,
    };

    static defaultProps = {
      throttle: 0,
    };

    state = {};

    queue = [];

    unmounting = false;

    componentDidMount() {
      this.handleQueue();
    }

    componentDidUpdate(prevProps) {
      if (prevProps.throttle !== this.props.throttle) {
        this.handleQueue.cancel();
        this.handleQueue = _.throttle(
          this.handleQueueInner,
          this.props.throttle,
          {
            leading: false,
          },
        );
      }
      this.handleQueue();
    }

    componentWillUnmount() {
      this.unmounting = true;
    }

    fetch = ids => {
      this.queue = _.uniq(
        this.queue.concat(
          ids.filter(id => !this.state[id] || this.state[id].error),
        ),
      );
      this.handleQueue();
    };

    handleQueueInner = () => {
      if (this.queue.length) {
        this.processBatch(this.queue);
      }
      this.queue = [];
    };

    handleQueue = _.throttle(this.handleQueueInner, this.props.throttle, {
      leading: false,
    });

    processBatch = async batch => {
      try {
        const data = await this.props.fetch(batch);
        if (this.unmounting) return;
        this.setState(state => ({
          ...state,
          ..._.fromPairs(
            batch.map(id => [
              id,
              {
                ...batch[id],
                data: data[id],
                error: null,
                loaded: true,
              },
            ]),
          ),
        }));
      } catch (err) {
        if (this.unmounting) return;
        this.setState(state => ({
          ...state,
          ..._.fromPairs(
            batch.map(id => [
              id,
              {
                ...batch[id],
                error: err,
                loaded: true,
              },
            ]),
          ),
        }));
      }
    };

    render() {
      return (
        <Provider value={{ state: this.state, fetch: this.fetch }}>
          {this.props.children}
        </Provider>
      );
    }
  }

  return BnCProvider;
}
