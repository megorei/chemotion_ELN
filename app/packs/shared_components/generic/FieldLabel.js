// imports from node_modules
import { Tooltip, OverlayTrigger, ControlLabel } from 'react-bootstrap';

export default FieldLabel = (props) => {
  const { label, desc } = props;
  let controlLabel = <ControlLabel>{label}</ControlLabel>;
  if (desc && desc !== '') {
    return controlLabel;
  } else {
    let tooltip = <Tooltip id={uuid.v4()}>{desc}</Tooltip>;

    return (
      <OverlayTrigger
        placement="top"
        delayShow={1000}
        overlay={tooltip}
      >
        {controlLabel}
      </OverlayTrigger>
    );
  }
};

FieldLabel.propTypes = { label: PropTypes.string.isRequired, desc: PropTypes.string };
FieldLabel.defaultProps = { desc: '' };
