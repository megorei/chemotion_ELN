import React, { useState, useEffect, useContext } from 'react';
import Tree from 'react-ui-tree';
import {
  Button, Modal, Col, Row
} from 'react-bootstrap';
import { cloneDeep, isEmpty } from 'lodash';
import { List } from 'immutable';
import TabLayoutEditor from 'src/apps/mydb/elements/tabLayout/TabLayoutEditor';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import { capitalizeWords } from 'src/utilities/textHelper';
import { filterTabLayout, getArrayFromLayout } from 'src/utilities/CollectionTabsHelper';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const elements = [
  { name: 'sample', label: 'Sample' },
  { name: 'reaction', label: 'Reaction' },
  { name: 'wellplate', label: 'Wellplate' },
  { name: 'screen', label: 'Screen' },
  { name: 'research_plan', label: 'Research Plan' },
  { name: 'device_description', label: 'Device description' },
  { name: 'vessel', label: 'Vessel' }
];

const CollectionTabs = () => {
  const collectionsStore = useContext(StoreContext).collections;
  const ownCollections = collectionsStore.ownCollections;
  const [showModal, setShowModal] = useState(false);
  const [tree, setTree] = useState({ label: 'My Collections', id: -1, children: cloneDeep(ownCollections) });
  const [profileData, setProfileData] = useState({});
  const [currentCollection, setCurrentCollection] = useState({});
  const [layouts, setLayouts] = useState(elements.reduce((acc, { name }) => {
    acc[name] = { visible: List(), hidden: List() };
    return acc;
  }, {}));
  const tabTitlesMap = {
    qc_curation: 'QC & curation',
    nmr_sim: 'NMR Simulation'
  };

  useEffect(() => {
    // Langt das??? Sind die daten aktuell nach dem Speichern der tabs?
    //const { profile } = UserStore.getState();
    //if (profile && profile.data) {
    //  setProfileData(profile.data)
    //}


    UserActions.fetchProfile();

    const onUserStoreChange = (state) => {
      const data = (state.profile && state.profile.data) || {};
      if (!data) {
        UserActions.fetchProfile();
      }
      setProfileData(data);
    }

    UserStore.listen(onUserStoreChange);
    return () => UserStore.unlisten(onUserStoreChange);
  }, []);

  const handleChange = (tree) => {
    setTree(tree);
  }

  const handleSave = () => {
    const layoutSegments = elements.reduce((acc, { name }) => {
      const layout = filterTabLayout(layouts[name]);
      acc[name] = layout;
      return acc;
    }, {});
    
    // TODO: save tabs segments of currentCollection

    //    const { currentCollection: cCol, layouts } = this.state;
    //    CollectionActions.createTabsSegment({ layoutSegments, currentCollectionId: cCol.id });
    //    this.setState({ showModal: false });
    //    if (cCol.ancestry) {
    //      this.state.tree.children.find((c) => c.id === parseInt(cCol.ancestry)).children.find((ch) => ch.id === cCol.id).tabs_segment = layoutSegments;
    //    } else {
    //      this.state.tree.children.find((c) => c.id === cCol.id).tabs_segment = layoutSegments;
    //    }

    setShowModal(false);
  }

  const onClickCollection = (node) => {
    const layouts = elements.reduce((acc, { name }) => {
      let layout;
      if (isEmpty(node.tabs_segment[name])) {
        layout = (profileData && profileData[`layout_detail_${name}`]) || {};
      } else {
        layout = JSON.parse(node.tabs_segment)[name];
      };
      acc[name] = getArrayFromLayout(layout, name, false);
      return acc;
    }, {});

    setCurrentCollection(node);
    setShowModal(true);
    setLayouts(layouts);
  }

  const renderNode = (node) => {
    if (node.is_locked || node.id < 1) {
      return (
        <div className="ms-3 mb-2 fs-5">{node.label}</div>
      );
    }

    return (
      <div
        className="d-flex align-items-center justify-content-between mb-2 bg-dark-subtle"
        draggable={false}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ms-3">{node.label}</div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => onClickCollection(node)}
          title="Click to edit collection tab sorting"
        >
          <i className="fa fa-pencil" />
        </Button>
      </div>
    );
  }

  return (
    <div className="tree mt-2">
      <Tree
        paddingLeft={30}
        tree={tree}
        onChange={handleChange}
        renderNode={renderNode}
      />

      {
        showModal && (
          <Modal
            size="lg"
            centered
            animation
            show={showModal}
            onHide={() => setShowModal(false)}
          >
            <Modal.Header closeButton>
              <Modal.Title>{currentCollection.label}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Row>
                {elements.map(({ name, label }) => (
                  <Col key={name}>
                    <h4>{label}</h4>
                    <TabLayoutEditor
                      visible={layouts[name].visible}
                      hidden={layouts[name].hidden}
                      getItemComponent={({ item }) => (
                        <div>{tabTitlesMap[item] ?? capitalizeWords(item)}</div>
                      )}
                      onLayoutChange={(visible, hidden) => {
                        setLayouts({ ...layouts, [name]: { visible, hidden } });
                      }}
                    />
                  </Col>
                ))}
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <div className="alert alert-info" role="alert">
                <p>
                  For the selected collection you can adjust the visibility of segment tabs and their order for each of the above items.
                  Drag and drop to select the order of segment tab layout.
                  Items in the white area will be displayed in the order they are placed and the grey area items will be hidden.
                </p>
              </div>
              <Button variant="primary" onClick={() => handleSave()}>Save</Button>
            </Modal.Footer>
          </Modal>
        )
      }
    </div>
  );
}

export default observer(CollectionTabs);
