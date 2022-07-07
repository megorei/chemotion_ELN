// imports from node_modules
import uuid from 'uuid';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default ButtonTooltip = (props) => {
  const tip = <Tooltip id={uuid.v4()}>{props.tip}</Tooltip>;
  const {
    size, bs, fnClick, element, place, fa, disabled, txt
  } = props;
  const content = txt ? (<span>{txt}&nbsp;</span>) : '';
  if (bs === '') {
    return (
      <OverlayTrigger placement={place} overlay={tip} >
        <Button bsSize={size} onClick={() => fnClick(element)} disabled={disabled}>
          {content}<i className={`fa ${fa}`} aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }
  return (
    <OverlayTrigger placement={place} overlay={tip} >
      <Button bsSize={size} bsStyle={bs} onClick={() => fnClick(element)} disabled={disabled}>
        {content}<i className={`fa ${fa}`} aria-hidden="true" />
      </Button>
    </OverlayTrigger>
  );
};
ButtonTooltip.propTypes = {
  tip: PropTypes.string.isRequired,
  element: PropTypes.object,
  fnClick: PropTypes.func.isRequired,
  bs: PropTypes.string,
  size: PropTypes.string,
  place: PropTypes.string,
  fa: PropTypes.string,
  disabled: PropTypes.bool,
  txt: PropTypes.string,
};

ButtonTooltip.defaultProps = {
  bs: '', size: 'xs', place: 'right', fa: 'fa-pencil-square-o', disabled: false, txt: null, element: {}
};
