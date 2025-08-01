import React from 'react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  Button, Modal, Card, Row, Col
} from 'react-bootstrap';
import 'whatwg-fetch';
import _ from 'lodash';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import { formatDate } from 'src/utilities/timezoneHelper';

import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';

const changeUrl = (url, urlTitle) => (url ? (
  <a href={url} target="_blank" rel="noopener noreferrer">
    {urlTitle || url}
  </a>
) : (
  <span />
));

const handleNotification = (nots, act, needCallback = true) => {
  nots.forEach((n) => {
    if (act === 'rem') {
      NotificationActions.removeByUid(n.id);
    }
    if (act === 'add') {
      const infoTimeString = formatDate(n.created_at);

      const newText = n.content.data
        .split('\n')
        .map((i) => <p key={`${infoTimeString}-${i}`}>{i}</p>);
      const { url, urlTitle } = n.content;
      if (url) {
        newText[newText.length] = (
          <p key={`${infoTimeString}-${url}`}>{changeUrl(url, urlTitle)}</p>
        );
      }

      const notification = {
        title: `From ${n.sender_name} on ${infoTimeString}`,
        message: newText,
        level: n.content.level || 'warning',
        dismissible: 'button',
        autoDismiss: n.content.autoDismiss || 5,
        position: n.content.position || 'tr',
        uid: n.id,
        action: {
          label: (
            <span>
              <i className="fa fa-check" aria-hidden="true" />
              &nbsp;&nbsp;Got it
            </span>
          ),
          callback() {
            if (needCallback) {
              const params = { ids: [] };
              params.ids[0] = n.id;
              MessagesFetcher.acknowledgedMessage(params);
              // .then((result) => { console.log(JSON.stringify(result)); });
            }
          },
        },
      };
      NotificationActions.add(notification);

      const { currentPage, itemsPerPage } = InboxStore.getState();

      switch (n.content.action) {
        case 'CollectionActions.fetchRemoteCollectionRoots':
          CollectionActions.fetchRemoteCollectionRoots();
          break;
        case 'CollectionActions.fetchSyncInCollectionRoots':
          CollectionActions.fetchSyncInCollectionRoots();
          break;
        case 'InboxActions.fetchInbox':
          InboxActions.fetchInbox({ currentPage, itemsPerPage });
          break;
        case 'ReportActions.updateProcessQueue':
          ReportActions.updateProcessQueue([parseInt(n.content.report_id, 10)]);
          break;
        case 'ElementActions.refreshComputedProp':
          ElementActions.refreshComputedProp(n.content.cprop);
          break;
        case 'RefreshChemotionCollection':
          CollectionActions.fetchUnsharedCollectionRoots();
          break;
        case 'CollectionActions.fetchUnsharedCollectionRoots':
          CollectionActions.fetchUnsharedCollectionRoots();
          CollectionActions.fetchSyncInCollectionRoots();
          break;
        case 'ElementActions.fetchResearchPlanById':
          ElementActions.fetchResearchPlanById(
            parseInt(n.content.research_plan_id, 10)
          );
          break;
        case 'CalendarActions.navigateToElement':
          CalendarActions.navigateToElement(
            n.content.eventable_type,
            n.content.eventable_id
          );
          break;
        default:
        //
      }
    }
  });
};

const createUpgradeNotification = (serverVersion, localVersion) => {
  const content = [
    'Dear ELNer,',
    'A new version has been released. Please reload this page to enjoy the latest updates.',
    'Thank you and have a nice day  :)',
    '--------------------------',
    `Your version: ${localVersion}`,
    `Current version: ${serverVersion}`,
    '--------------------------',
  ].join('\n');
  const contentJson = {
    data: content,
    url: '/about',
    urlTitle: "Check what's new here",
  };
  const infoTimeString = formatDate(new Date().toString());
  const not = {
    id: -1,
    sender_name: 'System Administrator',
    updated_at: infoTimeString,
    content: contentJson,
  };
  handleNotification([not], 'add', false);
};

export default class NoticeButton extends React.Component {
  static contextType = StoreContext;
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      dbNotices: [],
      messageEnable: true,
      messageAutoInterval: 6000,
      lastActivityTime: new Date(),
      idleTimeout: 12,
      serverVersion: '',
      localVersion: '',
    };
    this.envConfiguration = this.envConfiguration.bind(this);
    this.handleShow = this.handleShow.bind(this);
    this.handleHide = this.handleHide.bind(this);
    this.messageAck = this.messageAck.bind(this);
    this.detectActivity = this.detectActivity.bind(this);
  }

  componentDidMount() {
    this.envConfiguration();
    this.startActivityDetection();
  }

  shouldComponentUpdate(nextProps, nextState) {
    const nots = this.state.dbNotices;
    const nextNots = nextState.dbNotices;

    const notIds = _.map(nots, 'id');
    const nextNotIds = _.map(nextNots, 'id');
    const newMessages = _.filter(nextNots, (o) => !_.includes(notIds, o.id));
    const remMessages = _.filter(nots, (o) => !_.includes(nextNotIds, o.id));

    if (Object.keys(newMessages).length > 0) {
      handleNotification(newMessages, 'add');
    }
    if (Object.keys(remMessages).length > 0) {
      handleNotification(remMessages, 'rem');
    }
    if (
      nextState.serverVersion
      && nextState.localVersion
      && nextState.serverVersion !== this.state.serverVersion
      && nextState.serverVersion !== nextState.localVersion
    ) {
      const serverVer = nextState.serverVersion.substring(
        nextState.serverVersion.indexOf('-') + 1,
        nextState.serverVersion.indexOf('.js')
      );
      const localVer = nextState.localVersion.substring(
        nextState.localVersion.indexOf('-') + 1,
        nextState.localVersion.indexOf('.js')
      );
      if (serverVer !== localVer) {
        createUpgradeNotification(serverVer, localVer);
      }
    }

    return true;
  }

  componentWillUnmount() {
    this.stopActivityDetection();
  }

  handleShow() {
    MessagesFetcher.fetchMessages(0).then((result) => {
      result.messages.sort((a, b) => a.id - b.id);
      this.setState({ showModal: true, dbNotices: result.messages });
    });
  }

  handleHide() {
    this.setState({ showModal: false });
  }

  startActivityDetection() {
    const { messageEnable } = this.state;
    if (messageEnable === true) {
      this.interval = setInterval(this.messageFetch.bind(this), this.state.messageAutoInterval);
      document.addEventListener('mousemove', this.detectActivity);
      document.addEventListener('click', this.detectActivity);
    }
  }

  stopActivityDetection() {
    const { messageEnable } = this.state;
    if (messageEnable === true) {
      document.removeEventListener('mousemove', this.detectActivity, false);
      document.removeEventListener('click', this.detectActivity, false);
      clearInterval(this.interval);
    }
  }

  envConfiguration() {
    // use 'application' (not 'application-') as keyword because there is a
    // difference between production and development environment
    const documentIndex = 'application';
    const applicationTag = _.filter(
      document.scripts,
      (s) => s.src.indexOf(documentIndex) > -1
    );
    const applicationTagValue = applicationTag[0].src.substr(
      applicationTag[0].src.indexOf(documentIndex)
    );
    MessagesFetcher.configuration().then((result) => {
      this.setState({
        messageEnable: result.messageEnable === 'true',
        messageAutoInterval: result.messageAutoInterval,
        idleTimeout: result.idleTimeout,
        localVersion: applicationTagValue,
      });
      const { messageEnable, messageAutoInterval } = this.state;

      if (messageEnable === true) {
        this.interval = setInterval(
          () => this.messageFetch(),
          messageAutoInterval
        );
        document.addEventListener('mousemove', this.detectActivity);
        document.addEventListener('click', this.detectActivity);
      } else {
        this.messageFetch();
      }
    });
  }

  detectActivity() {
    this.setState({ lastActivityTime: new Date() });
  }

  messageAck(idx, ackAll) {
    let { dbNotices } = this.state;
    const params = {
      ids: [],
    };
    if (ackAll) {
      params.ids = _.map(dbNotices, 'id');
    } else {
      params.ids[0] = idx;
    }
    MessagesFetcher.acknowledgedMessage(params).then((result) => {
      const ackIds = _.map(result.ack, 'id');
      dbNotices = _.filter(
        this.state.dbNotices,
        (o) => !_.includes(ackIds, o.id)
      );
      dbNotices.sort((a, b) => a.id - b.id);
      this.setState({
        dbNotices,
      });
    });
  }

  messageFetch() {
    const { lastActivityTime, idleTimeout } = this.state;
    const clientLastActivityTime = new Date(lastActivityTime).getTime();
    const currentTime = new Date().getTime();
    const remainTime = Math.floor(
      (currentTime - clientLastActivityTime) / 1000
    );
    if (remainTime < idleTimeout) {
      MessagesFetcher.fetchMessages(0).then((result) => {
        result.messages.forEach((message) => {
          if (message.subject === 'Send TPA attachment arrival notification')
            this.context.attachmentNotificationStore.addMessage(message);
        });
        result.messages.sort((a, b) => a.id - b.id);
        this.setState({
          dbNotices: result.messages,
          serverVersion: result.version,
        });
      });
    }
  }

  renderBody() {
    const { dbNotices } = this.state;

    if (dbNotices.length === 0) {
      return (
        <Card className="text-center" eventKey="0">
          <Card.Body>No new notifications.</Card.Body>
        </Card>
      );
    }

    return dbNotices.map((not, index) => {
      const infoTimeString = formatDate(not.created_at);

      const newText = not.content.data
        .split('\n')
        .map((i) => <p key={`${infoTimeString}-${i}`}>{i}</p>);

      const { url, urlTitle } = not.content;
      if (url) {
        newText.push(
          <p key={`${infoTimeString}-${url}`}>{changeUrl(url, urlTitle)}</p>
        );
      }

      return (
        <Card
          key={`panel-modal-body-${not.id}`}
          eventKey={index}
          className="mb-3"
        >
          <Card.Header className="d-flex gap-2">
            <i className="fa fa-commenting-o" aria-hidden="true" />
            {not.subject}
            <span>
              <strong>From: </strong>
              {not.sender_name}
            </span>
            <span>
              <strong>Created On: </strong>
              {formatDate(not.created_at)}
            </span>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col lg="auto">
                <Button
                  id={`notice-button-ack-${not.id}`}
                  key={`notice-button-ack-${not.id}`}
                  onClick={() => this.messageAck(not.id, false)}
                >
                  <i className="fa fa-check me-1" aria-hidden="true" />
                  Got it
                </Button>
              </Col>
              <Col>{newText}</Col>
            </Row>
          </Card.Body>
        </Card>
      );
    });
  }

  renderModal() {
    const { showModal } = this.state;
    return (
      <Modal
        centered
        show={showModal}
        onHide={this.handleHide}
        dialogClassName="modal-xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>Unread Notifications</Modal.Title>
        </Modal.Header>
        <Modal.Body className="vh-70 overflow-auto">
          {this.renderBody()}
        </Modal.Body>
        <Modal.Footer>
          <Button
            id="notice-button-ack-all"
            key="notice-button-ack-all"
            onClick={() => this.messageAck(0, true)}
          >
            <i className="fa fa-check" aria-hidden="true" />
            &nbsp;Mark all notifications as read
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  render() {
    const noticeNum = Object.keys(this.state.dbNotices).length;
    let btnVariant = 'sidebar';
    let btnIcon = 'fa-bell-o';

    if (noticeNum > 0) {
      btnVariant = 'warning';
      btnIcon = 'fa-bell';
    }

    return (
      <>
        <SidebarButton
          label="Notifications"
          variant={btnVariant}
          icon={btnIcon}
          onClick={this.handleShow}
          isCollapsed={this.props.isCollapsed}
          showLabel={false}
        />
        {this.renderModal()}
      </>
    );
  }
}
