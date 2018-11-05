import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import { delay } from './utils';

export default function wrapProvider(Provider) {
  class BnCProvider extends React.Component {
    static propTypes = {
      children: PropTypes.node.isRequired,
      fetch: PropTypes.func.isRequired,
      throttle: PropTypes.number,
      retry: PropTypes.shape({
        delay: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        max: PropTypes.number,
      }),
    };

    static defaultProps = {
      throttle: 0,
      retry: {
        delay: 'exponential',
        max: 25,
      },
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
          ids.filter(id => !this.state[id] || this.state[id].errored),
        ),
      );
      this.handleQueue();
    };

    handleQueueInner = () => {
      const { queue } = this;
      this.queue = [];
      if (queue.length) {
        this.processBatch(queue);
      }
    };

    handleQueue = _.throttle(this.handleQueueInner, this.props.throttle, {
      leading: false,
    });

    handleRetry = async batch => {
      // This method is bloody hard to test.
      if (this.unmounting) return;
      const retry = { ...BnCProvider.defaultProps.retry, ...this.props.retry };
      const attempts = _.reduce(
        batch,
        (acc, id) => Math.max(this.state[id].attempts, acc),
        0,
      );
      if (attempts < retry.max) {
        const waitTime =
          retry.delay === 'exponential'
            ? 250 * 2 ** (attempts - 1)
            : retry.delay;
        await delay(waitTime);
        this.fetch(batch);
      }
    };

    processBatch = async batch => {
      if (this.unmounting) return;
      try {
        const data = await this.props.fetch(batch);
        if (this.unmounting) return;
        this.setState(() =>
          _.fromPairs(
            batch.map(id => [
              id,
              {
                ...batch[id],
                data: data[id],
                errored: false,
                loaded: true,
                attempts: 0,
              },
            ]),
          ),
        );
      } catch (err) {
        console.error(err);
        if (this.unmounting) return;
        this.setState(
          state =>
            _.fromPairs(
              batch.map(id => [
                id,
                {
                  ...batch[id],
                  errored: true,
                  loaded: true,
                  attempts: (state[id] || { attempts: 0 }).attempts + 1,
                },
              ]),
            ),
          () => this.handleRetry(batch),
        );
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
