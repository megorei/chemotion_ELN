// Imports from node modules
import React from 'react';
import { Nav, Navbar, Tooltip, OverlayTrigger } from 'react-bootstrap';

// imports from other namespaces
import DocumentHelper from '/app/packs/src/components/utils/DocumentHelper';
import ElementActions from '/app/packs/src/components/actions/ElementActions';
import ManagingActions from '/app/packs/src/components/managing_actions/ManagingActions';
import UIActions from '/app/packs/src/components/actions/UIActions';
import UIStore from '/app/packs/src/components/stores/UIStore';
import UserActions from '/app/packs/src/components/actions/UserActions';
import UserStore from '/app/packs/src/components/stores/UserStore';

// Imports from own namespace
import ContextActions from './contextActions/ContextActions';
import NavHead from './NavHead';
import NavigationModal from './NavigationModal';
import NavNewSession from './NavNewSession';
import Search from './search/Search';
import SearchFilter from './search/SearchFilter.js';
import UserAuth from './UserAuth';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      genericEls: null,
      showAdvancedSearch: false,
      modalProps: {
        show: false,
        title: "",
        component: "",
        action: null,
        listSharedCollections: false
      },
      omniauthProviders: []
    };
    this.onChange = this.onChange.bind(this);
    this.onUIChange = this.onUIChange.bind(this);
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this);
    this.updateModalProps = this.updateModalProps.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onUIChange);
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchGenericEls();
    UserActions.fetchOmniauthProviders();
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIChange);
    UserStore.unlisten(this.onChange);
  }

  onChange(newState) {
    let newId = newState.currentUser ? newState.currentUser.id : null;
    let oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) {
      this.setState({ currentUser: newState.currentUser });
    }
    if (this.state.genericEls === null) {
      this.setState({ genericEls: newState.genericEls });
    }
    if (newState.omniauthProviders !== this.state.omniauthProviders) {
      this.setState({ omniauthProviders: newState.omniauthProviders });
    }
  }

  onUIChange(state) {
    this.setState({
      modalProps: state.modalParams,
      showAdvancedSearch: state.showAdvancedSearch
    });
  }

  toggleCollectionTree() {
    this.props.toggleCollectionTree();
  }

  token() {
    return DocumentHelper.getMetaContent("csrf-token");
  }

  updateModalProps(modalProps) {
    this.setState({ modalProps: modalProps });
  }

  advancedSearch(filters) {
    const uiState = UIStore.getState();
    const selection = {
      elementType: 'all',
      advanced_params: filters,
      search_by_method: 'advanced',
      page_size: uiState.number_of_results
    };
    UIActions.setSearchSelection(selection);
    ElementActions.fetchBasedOnSearchSelectionAndCollection({
      selection,
      collectionId: uiState.currentCollection.id,
      isSync: uiState.isSync
    });
  }

  navHeader() {
    const colMenuTooltip = <Tooltip id="col_menu_tooltip">Toggle sidebar</Tooltip>;
    return (
      <Navbar.Header className="collec-tree">
        <Navbar.Text style={{ cursor: "pointer" }}>
          <OverlayTrigger placement="right" delayShow={1000} overlay={colMenuTooltip}>
            <i
              className="fa fa-list"
              style={{ fontStyle: "normal" }}
              onClick={this.toggleCollectionTree}
            />
          </OverlayTrigger>
        </Navbar.Text>
        <Navbar.Text />
        <NavHead />
      </Navbar.Header>
    )
  }

  render() {
    const { modalProps, showAdvancedSearch, genericEls, omniauthProviders } = this.state;
    const { profile } = UserStore.getState();
    const { customClass } = (profile && profile.data) || {};

    let navbar_for_user = (
      <Navbar fluid className='navbar-custom'>
        {this.navHeader()}
        <Nav navbar className='navbar-form'>
          <Search />
          <ManagingActions updateModalProps={this.updateModalProps} customClass={customClass} genericEls={genericEls} />
          <ContextActions updateModalProps={this.updateModalProps} customClass={customClass} />
          <NavigationModal {...modalProps} />
        </Nav>
        <UserAuth />
        <div style={{ clear: "both" }} />
        <SearchFilter
          searchFunc={this.advancedSearch}
          show={showAdvancedSearch}
        />
      </Navbar>
    );
    let navbar_for_guest = (
      <Navbar fluid className='navbar-custom'>
        {this.navHeader()}
        <Nav navbar className='navbar-form'>
          <Search noSubmit={true} />
        </Nav>
        <NavNewSession authenticityToken={this.token()} omniauthProviders={omniauthProviders} />
        <div style={{ clear: "both" }} />
      </Navbar>
    );

    return (
      this.state.currentUser
        ? navbar_for_user
        : navbar_for_guest
    );
  }
}
