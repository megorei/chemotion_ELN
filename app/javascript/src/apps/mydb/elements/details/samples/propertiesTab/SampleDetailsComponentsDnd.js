import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Sample from 'src/models/Sample';
import SampleComponentsGroup from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleComponentsGroup';

/**
 * Drag-and-drop target specification for react-dnd.
 * Handles drop and canDrop logic for supported item types.
 * @type {Object}
 */
const target = {
  /**
   * Handles drop event for drag-and-drop of samples, molecules, or materials.
   * @param {Object} tagProps - The target component props
   * @param {Object} monitor - The drag-and-drop monitor
   */
  drop(tagProps, monitor) {
    const { dropSample, dropMaterial } = tagProps;
    const srcItem = monitor.getItem();
    const srcType = monitor.getItemType();
    if (srcType === DragDropItemTypes.SAMPLE) {
      dropSample(
        srcItem.element,
        tagProps.material,
        tagProps.materialGroup,
        );
    } else if (srcType === DragDropItemTypes.MOLECULE) {
      dropSample(
        srcItem.element,
        tagProps.material,
        tagProps.materialGroup,
        null,
        true,
      );
    } else if (srcType === DragDropItemTypes.MATERIAL) {
      dropMaterial(
        srcItem.material,
        srcItem.materialGroup,
        tagProps.material,
        tagProps.materialGroup,
        'move',
      );
    }
  },
  /**
   * Determines if the dragged item can be dropped on this target.
   * @param {Object} tagProps - The target component props
   * @param {Object} monitor - The drag-and-drop monitor
   * @returns {boolean} True if drop is allowed
   */
  canDrop(tagProps, monitor) {
    const srcType = monitor.getItemType();
    const isCorrectType = srcType === DragDropItemTypes.MATERIAL
      || srcType === DragDropItemTypes.SAMPLE
      || srcType === DragDropItemTypes.MOLECULE;
    return isCorrectType;
  },
};

/**
 * Collects drop target props for react-dnd.
 * @param {Object} connect - The drop target connector
 * @param {Object} monitor - The drop target monitor
 * @returns {Object} Drop target props
 */
const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

/**
 * SampleDetailsComponentsDnd is a drag-and-drop enabled container for sample components.
 * Renders a SampleComponentsGroup and handles drop events for DnD.
 * @class SampleDetailsComponentsDnd
 * @extends React.Component
 */
class SampleDetailsComponentsDnd extends React.Component {
  render() {
    const {
      sample,
      sampleComponents,
      headIndex,
      onChangeComponent,
      dropSample,
      dropMaterial,
      deleteMixtureComponent,
      isOver,
      canDrop,
      connectDropTarget,
      materialGroup,
      showModalWithMaterial,
      activeTab,
      handleTabSelect,
      enableComponentLabel,
      enableComponentPurity,
    } = this.props;
    const style = {
      padding: '0px 0px',
    };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    return connectDropTarget(
      <div style={style}>
        <SampleComponentsGroup
          sample={sample}
          sampleComponents={sampleComponents}
          headIndex={headIndex ?? 0}
          onChange={onChangeComponent}
          dropSample={dropSample}
          dropMaterial={dropMaterial}
          deleteMixtureComponent={deleteMixtureComponent}
          isOver={isOver}
          canDrop={canDrop}
          materialGroup={materialGroup}
          showModalWithMaterial={showModalWithMaterial}
          activeTab={activeTab}
          handleTabSelect={handleTabSelect}
          enableComponentLabel={enableComponentLabel}
          enableComponentPurity={enableComponentPurity}
        />
      </div>
    );
  }
}

export default DropTarget(
  [DragDropItemTypes.SAMPLE, DragDropItemTypes.MOLECULE, DragDropItemTypes.MATERIAL],
  target,
  collect,
)(SampleDetailsComponentsDnd);

SampleDetailsComponentsDnd.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  headIndex: PropTypes.number,
  onChangeComponent: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  dropMaterial: PropTypes.func.isRequired,
  showModalWithMaterial: PropTypes.func.isRequired,
  deleteMixtureComponent: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  enableComponentLabel: PropTypes.bool.isRequired,
  enableComponentPurity: PropTypes.bool.isRequired,
};
