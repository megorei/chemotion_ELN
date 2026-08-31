import React, { useContext, useEffect } from 'react';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

// Persistent guest-context indicator (REQ-ELN-19): rendered above the top
// bar whenever the session user is a guest from a foreign home tenant.
const GuestBanner = () => {
  const { userStore } = useContext(StoreContext);

  useEffect(() => {
    if (!userStore.instance) { userStore.fetchInstance(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = userStore.currentUser;
  if (!user || !user.external) { return null; }

  const instanceName = userStore.instanceDisplayName;
  return (
    <div
      className="alert alert-info d-flex align-items-center justify-content-center gap-2 mb-0 py-1 rounded-0"
      role="status"
      data-testid="guest-banner"
    >
      <i className="fa fa-globe" aria-hidden="true" />
      <span>
        <strong>Guest access</strong>
        {instanceName ? ` at ${instanceName}` : ''}
        {user.home_tenant_hint ? ` — home: ${user.home_tenant_hint}` : ''}
        {' · you see shared collections only'}
      </span>
    </div>
  );
};

export default observer(GuestBanner);
