// imports from node modules
import React from 'react';
import { Button } from 'react-bootstrap';
import 'whatwg-fetch';

// imports from other namespaces
import InboxActions from '/app/packs/src/components/actions/InboxActions';

export default class InboxButton extends React.Component {
  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    return (
      <Button
        id="inbox-button"
        bsStyle="default"
        onClick={InboxActions.toggleInboxModal}
        style={{ height: '34px', width: '36px' }}
      >
        <i className="fa fa-inbox fa-lg" />
      </Button>
    );
  }
}
