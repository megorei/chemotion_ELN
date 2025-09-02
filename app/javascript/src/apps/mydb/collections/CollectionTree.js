import React, { Fragment, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

import UIStore from 'src/stores/alt/stores/UIStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';
import GatePushButton from 'src/components/common/GatePushButton';

import { aviatorNavigation } from 'src/utilities/routesUtils';

const ALL_COLLECTIONS_KEY = 'collections';
const CHEMOTION_REPOSITORY_KEY = 'chemotionRepository';

function CollectionTree({ isCollapsed, expandSidebar }) {
  const collectionsStore = useContext(StoreContext).collections;
  const activeCollection = collectionsStore.active_collection;
  const ownCollections = collectionsStore.ownCollections;
  const sharedWithMeCollections = collectionsStore.sharedWithMeCollections;
  const chemotionRepositoryCollection = collectionsStore.chemotion_repository_collection;

  const setActiveCollection = (collection) => {
    if (isCollapsed) expandSidebar();
    if (collection !== activeCollection) collectionsStore.setActiveCollection(collection);
  };

  useEffect(() => {
    collectionsStore.fetchCollections();

    // 'All' and 'chemotion-repository.net' are special collections that we
    // expect to be returned by `fetchLockedCollectionRoots`. We check the UI
    // state here to correctly restore the active collection on page load.
    // do we still need this???
    const onUiStoreChange = ({ currentCollection }) => {
      if (!currentCollection) return;

      if (currentCollection.label === 'All') {
        setActiveCollection(ALL_COLLECTIONS_KEY);
      }

      if (currentCollection.label === 'chemotion-repository.net') {
        setActiveCollection(CHEMOTION_REPOSITORY_KEY);
      }
    };

    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);

  const collectionGroups = [
    {
      label: 'My Collections',
      icon: 'icon-collection',
      collectionKey: ALL_COLLECTIONS_KEY,
      collections: ownCollections,
      // collectionId: 'all',
    },
    {
      label: 'Shared with me',
      icon: 'icon-incoming',
      collectionKey: 'sharedWithMe',
      collections: sharedWithMeCollections,
    },
  ];

  if (chemotionRepositoryCollection) {
    collectionGroups.push({
      label: 'chemotion-repo',
      icon: 'fa fa-cloud',
      collectionKey: CHEMOTION_REPOSITORY_KEY,
      collectionId: chemotionRepositoryCollection.id,
      collections: chemotionRepositoryCollection.children,
    });
  }

  return (
    <div className="mh-100 d-flex flex-column">
      <div className="sidebar-button-frame tree-view_frame flex-column">
        {collectionGroups.map(({
          label, icon, collectionKey, collections, collectionId,
        }) => {
          const isActive = activeCollection === collectionKey;
          return (
            <Fragment key={collectionKey}>
              <SidebarButton
                label={label}
                icon={icon}
                isCollapsed={isCollapsed}
                onClick={() => {
                  setActiveCollection(collectionKey);
                  if (collectionId !== undefined) {
                    aviatorNavigation('collection', collectionId, true, true)
                  }
                }}
                appendComponent={collectionKey === CHEMOTION_REPOSITORY_KEY ? (
                  <GatePushButton collectionId={chemotionRepositoryCollection.id} />
                ) : null}
                active={isActive}
              />
              {isActive && !isCollapsed && collections !== undefined && (
                <div className="tree-view_container">
                  {collections.length === 0
                    ? <div className="text-muted text-center p-2">No collections</div>
                    : collections.map((collection) => <CollectionSubtree key={collection.id} root={collection} level={1} />)}
                </div>
              )}
            </Fragment>
          );
        })}
        <CollectionManagementButton isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}

CollectionTree.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
  expandSidebar: PropTypes.func.isRequired,
};

export default observer(CollectionTree);
