/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import {
  OverlayTrigger,
  Popover,
  Button,
  Table,
  Tooltip,
  Overlay,
} from 'react-bootstrap';
import { observer } from 'mobx-react';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { AsyncSelect } from 'src/components/common/Select';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

const GroupElement = ({ group, currentUser, onDeleteGroup, onDeleteUser, onUpdateGroup }) => {
  const [showUsers, setShowUsers] = useState(false);
  const [showRowAdd, setShowRowAdd] = useState(false);
  const [showAdminAlert, setShowAdminAlert] = useState(false);
  const [adminPopoverTarget, setAdminPopoverTarget] = useState(null);
  const [usersToggled, setUsersToggled] = useState(false);
  const [rowAddToggled, setRowAddToggled] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const setGroupAdmin = (user, setAdmin = true) => {
    // if removing group admin and there is only one admin -> show warning
    if (!setAdmin && group.admins.length === 1) {
      setShowAdminAlert(true);
      setAdminPopoverTarget(event.target); // what is this? where does event come from?
      return;
    }

    const request = setAdmin
      ? UsersFetcher.promoteAdmin(group.id, user.id)
      : UsersFetcher.demoteAdmin(group.id, user.id);

    request.then(() => {
      setSelectedUsers([]);
      onUpdateGroup();
    });
  };

  const hideAdminAlert = () => { setShowAdminAlert(false); };

  const toggleUsers = () => {
    setShowUsers(!showUsers);
    setUsersToggled(!usersToggled);
  };

  const toggleRowAdd = () => {
    setShowRowAdd(!showRowAdd);
    setRowAddToggled(!rowAddToggled);
  };

  const loadUserByName = (input) => {
    if (!input) return Promise.resolve([]);

    return UsersFetcher.fetchUsersByName(input, 'Person')
      .then((res) => selectUserOptionFormater({ data: res }))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  // confirm action after pressing yes
  // if type is group, call deleteGroup api, if type is user, call deleteUser api
  const confirmDelete = (type, groupRec, userRec) => {
    if (type === 'group') {
      onDeleteGroup(groupRec.id);
    }
    if (type === 'user') {
      onDeleteUser(groupRec, userRec);

      // check if the user being deleted is an admin.
      const userIsAdmin = groupRec.admins.some((admin) => admin.id === userRec.id);

      // if admin, remove admin status
      if (userIsAdmin) {
        setGroupAdmin(groupRec, userRec, false);
      }
    }
    return null;
  };

  // add multiple users
  // replace with response result and then setState (with forceUpdate)
  const addUser = () => {
    const userIds = [];

    selectedUsers.forEach((g) => {
      // check if user is already in group
      const isUserInGroup = group.users.some((user) => user.id === g.value);

      // only add users not already in group
      if (!isUserInGroup) { userIds.push(g.value); }
    });

    UsersFetcher.addMembers(group.id, userIds).then(() => {
      setSelectedUsers([]);
      onUpdateGroup();
    });
  };

  const renderDeleteButton = (type, groupRec, userRec, tooltipText) => {
    let msg = 'Leave this group?';
    if (type === 'user') {
      if (userRec.id === currentUser.id) {
        msg = 'Leave this group?';
      } else {
        msg = `Remove ${userRec.name}?`;
      }
    } else {
      msg = 'Remove group?';
    }

    // eslint-disable-next-line react/display-name
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        <Popover.Body>
          {msg}
          <div className="mt-2 d-flex gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={() => confirmDelete(type, groupRec, userRec)}
            >
              Yes
            </Button>
            <Button
              size="sm"
              variant="warning"
            >
              No
            </Button>
          </div>
        </Popover.Body>
      </Popover>
    );

    return (
      <OverlayTrigger
        animation
        placement="right"
        root
        trigger="focus"
        overlay={popover}
      >
        <Button
          size="sm"
          type="button"
          variant="danger"
          title={tooltipText}
          onClick={() => confirmDelete('', groupRec, userRec)}
        >
          <i className="fa fa-trash-o" />
        </Button>
      </OverlayTrigger>
    );
  };

  const renderAdminButtons = () => {
    const isAdmin = group.admins && group.admins
      .some((admin) => admin.id === currentUser.id);

    return (
      <>
        <div className="d-flex gap-1 align-items-center">
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>View users</Tooltip>}
          >
            <Button
              size="sm"
              type="button"
              variant="info"
              onClick={toggleUsers}
            >
              <i className="fa fa-list" />
            </Button>
          </OverlayTrigger>
          {isAdmin && (
            <>
              <OverlayTrigger placement="top" overlay={<Tooltip>Add user</Tooltip>}>
                <Button
                  size="sm"
                  type="button"
                  variant="success"
                  onClick={toggleRowAdd}
                >
                  <i className="fa fa-plus" />
                </Button>
              </OverlayTrigger>
              {renderDeleteButton('group', group, undefined, 'Remove group')}
            </>
          )}
        </div>
        {isAdmin && showRowAdd && (
          <div className="d-flex mt-2 align-items-center gap-2">
            <AsyncSelect
              className="w-50"
              isMulti
              value={selectedUsers}
              matchProp="name"
              placeholder="Select users"
              loadOptions={loadUserByName}
              onChange={(userSelection) => setSelectedUsers(userSelection)}
            />
            <Button
              size="sm"
              type="button"
              variant="success"
              onClick={addUser}
              disabled={!selectedUsers}
            >
              <i className="fa fa-user-plus" />
            </Button>
          </div>
        )}
      </>
    );
  };

  const renderUserButtons = (userRec) => {
    const isAdmin = group.admins && group.admins.some((a) => a.id === userRec.id);
    const isCurrentUserAdmin = group.admins
      && group.admins.some((a) => a.id === currentUser.id);
    const canDelete = isCurrentUserAdmin || userRec.id === currentUser.id;

    const adminButtonStyle = isAdmin ? 'warning' : 'light';
    const adminTooltip = isAdmin ? 'Demote from Admin' : 'Promote to Admin';

    return (
      <div className="d-flex gap-1 align-items-center">
        {isCurrentUserAdmin && (
          <OverlayTrigger placement="top" overlay={<Tooltip>{adminTooltip}</Tooltip>}>
            <Button
              size="sm"
              type="button"
              variant={adminButtonStyle}
              onClick={() => setGroupAdmin(group, userRec, !isAdmin)}
            >
              <i className="fa fa-key" />
            </Button>
          </OverlayTrigger>
        )}
        {canDelete && renderDeleteButton('user', group, userRec, 'Remove')}
      </div>
    );
  };

  return (
    <tbody>
      <tr className="fw-bold align-middle">
        <td>{group.name}</td>
        <td>{group.initials}</td>
        <td>
          {group.admins.map((admin) => admin.name).join(', ')}
        </td>
        <td>
          {renderAdminButtons()}
        </td>
      </tr>
      {showUsers && (
        <tr>
          <td colSpan="4">
            <Table striped>
              <tbody>
                {group.users.map((u) => (
                  <tr key={`row_${group.id}_${u.id}`}>
                    <td width="20%">{u.name}</td>
                    <td width="30%">{u.initials}</td>
                    <td width="50%">{renderUserButtons(u)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </td>
        </tr>
      )}
      <Overlay
        show={showAdminAlert}
        target={adminPopoverTarget}
        placement="left"
        containerPadding={20}
      >
        <Popover>
          <Popover.Body>
            At least one admin is required.
            <div className="mt-2">
              <Button
                size="sm"
                variant="primary"
                onClick={hideAdminAlert}
              >
                Got it!
              </Button>
            </div>
          </Popover.Body>
        </Popover>
      </Overlay>
    </tbody>
  );
};

export default observer(GroupElement);
