import React, { useState, useEffect } from 'react';
import { Modal, Button, FormGroup, ControlLabel, Form, FormControl, Checkbox } from 'react-bootstrap';
import Select from 'react-select';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

const DeviceDetailModal = ({ hideModal, currentState }) => {
  const [deviceDetail, setDeviceDetail] = useState({});
  const { device, showDeviceDetailModal } = currentState;
  let defaultUsers = [];

  useEffect(() => {
    setDeviceDetail(currentState.deviceDetail);
  }, [currentState.deviceDetail]);

  const onChange = (field, value) => {
    deviceDetail[field] = value;
    setDeviceDetail({ ...deviceDetail });
  }

  const handleUser = (value) => {
    if (value) {
      deviceDetail.user_ids = value.map((v) => { return v.value });
      deviceDetail.users = value;
      setDeviceDetail({ ...deviceDetail });
    }
  }

  const loadUserByName = (input) => {
    if (!input) {
      return Promise.resolve({ options: [] });
    }
    return AdminFetcher.fetchUsersByNameType(input, 'Person,Group')
      .then((res) => selectUserOptionFormater({ data: res, withType: true }))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  const saveDeviceDetail = () => {
    // TODO: add Validations
    AdminFetcher.postDeviceDetail({
      device_id: device.id,
      serial_number: deviceDetail.serial_number.trim(),
      user_ids: deviceDetail.user_ids,
      verification_status: deviceDetail.verification_status.trim(),
      active: deviceDetail.active,
      visibility: deviceDetail.visibility
    }).then((result) => {
      if (result.error) {
        alert(result.error);
      } else if (result.device_detail) {
        setDeviceDetail(result.device_detail);
      }
    });
    hideModal();
  }

  return (
    <Modal
      show={showDeviceDetailModal}
      onHide={hideModal}
    >
      <Modal.Header closeButton>
        <Modal.Title>Details of Device "{device.name}"</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <FormGroup>
            <ControlLabel>Serial number</ControlLabel>
            <FormControl
              type="text"
              value={deviceDetail.serial_number}
              onChange={(event) => onChange('serial_number', event.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <ControlLabel>Responsible people</ControlLabel>
            <Select.Async
              multi
              isLoading
              backspaceRemoves
              value={deviceDetail.users}
              defaultValue={defaultUsers}
              valueKey="value"
              labelKey="label"
              matchProp="name"
              placeholder="Select ..."
              loadOptions={loadUserByName}
              onChange={handleUser}
            />
          </FormGroup>

          <FormGroup>
            <ControlLabel>Verification Status</ControlLabel>
            <FormControl
              componentClass="select"
              value={deviceDetail.verification_status}
              onChange={(event) => onChange('verification_status', event.target.value)}
            >
              <option value="none">None</option>
              <option value="verified_device">Verified device</option>
              <option value="unverified_sub_version">Unverified sub-version</option>
              <option value="verified_sub_version">Verified sub-version</option>
            </FormControl>
          </FormGroup>

          <FormGroup>
            <Checkbox
              checked={deviceDetail.active}
              onChange={(event) => onChange('active', event.target.checked)}
            >
              Active
            </Checkbox>
          </FormGroup>

          <FormGroup>
            <Checkbox
              checked={deviceDetail.visibility}
              onChange={(event) => onChange('visibility', event.target.checked)}
            >
              Visibility
            </Checkbox>
          </FormGroup>

        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button className="pull-left" bsStyle="success" onClick={() => saveDeviceDetail()}>
          Save Device Detail
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DeviceDetailModal;
