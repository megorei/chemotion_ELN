import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';

const spec = {
  beginDrag(props) {
    return {
      index: props.index
    };
  },
  endDrag(props, monitor) {
    const target = monitor.getDropResult();
    if (target) {
      props.onDrop(props.index, target.index);
    }
  }
};

const collect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

class ResearchPlanDetailsDragSource extends Component {
  render() {
    const { connectDragSource } = this.props;

    return connectDragSource(<span className="fa fa-lg fa-arrows text-info drag-source me-1 mt-1" />);
  }
}

export default
DragSource(DragDropItemTypes.RESEARCH_PLAN_FIELD, spec, collect)(ResearchPlanDetailsDragSource);

ResearchPlanDetailsDragSource.propTypes = {
  index: PropTypes.number,
  onChange: PropTypes.func,
};
