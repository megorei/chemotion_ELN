import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import SequenceBasedMacromoleculesFetcher from 'src/fetchers/SequenceBasedMacromoleculesFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import SequenceBasedMacromolecule from 'src/models/SequenceBasedMacromolecule';
import Container from 'src/models/Container';

const toggableContents = {
  'general': true,
  'reference': false,
  'sequence_modifications': false,
  'sample': false,
};

export const SequenceBasedMacromoleculesStore = types
  .model({
    key_prefix: types.optional(types.string, 'sbmm'),
    open_sequence_based_macromolecules: types.optional(types.optional(types.array(types.frozen({})), [])),
    sequence_based_macromolecule: types.optional(types.frozen({}), {}),
    sequence_based_macromolecule_checksum: types.optional(types.string, ''),
    // sequence_based_macromolecules: types.optional(types.optional(types.array(types.frozen({})), [])),
    active_tab_key: types.optional(types.number, 1),
    toggable_contents: types.optional(types.frozen({}), toggableContents),
    // analysis_mode: types.optional(types.string, 'edit'),
    // analysis_open_panel: types.optional(types.union(types.string, types.number), 'none'),
    // analysis_comment_box: types.optional(types.boolean, false),
    // analysis_start_export: types.optional(types.boolean, false),
    // attachment_editor: types.optional(types.boolean, false),
    // attachment_extension: types.optional(types.frozen({}), {}),
    // attachment_image_edit_modal_shown: types.optional(types.boolean, false),
    // attachment_selected: types.optional(types.frozen({}), {}),
    // attachment_show_import_confirm: types.optional(types.array(types.frozen({})), []),
    // attachment_filter_text: types.optional(types.string, ''),
    // attachment_sort_by: types.optional(types.string, 'name'),
    // attachment_sort_direction: types.optional(types.string, 'asc'),
    // filtered_attachments: types.optional(types.array(types.frozen({})), []),
    show_search_result: types.optional(types.boolean, false),
  })
  .actions(self => ({
    addSequenceBasedMacromoleculeToOpen(sequence_based_macromolecule) {
      let openSequenceBasedMacromolecules = [...self.open_sequence_based_macromolecules];
      const index = openSequenceBasedMacromolecules.findIndex(s => s.id === sequence_based_macromolecule.id);
      if (index === -1) { 
        self.setSequenceBasedMacromolecule(sequence_based_macromolecule, true);
        openSequenceBasedMacromolecules.push(self.sequence_based_macromolecule);
        self.open_sequence_based_macromolecules = openSequenceBasedMacromolecules;
      } else {
        self.sequence_based_macromolecule = openSequenceBasedMacromolecules[index];
      }
    },
    editSequenceBasedMacromolecules(sequence_based_macromolecule) {
      let openSequenceBasedMacromolecules = [...self.open_sequence_based_macromolecules];
      const index = openSequenceBasedMacromolecules.findIndex(s => s.id === sequence_based_macromolecule.id);
      openSequenceBasedMacromolecules[index] = sequence_based_macromolecule;
      self.open_sequence_based_macromolecules = openSequenceBasedMacromolecules;
    },
    removeFromOpenSequenceBasedMacromolecules(sequence_based_macromolecule) {
      const openSequenceBasedMacromolecules =
        self.open_sequence_based_macromolecules.filter((s) => { return s.id !== sequence_based_macromolecule.id });
      self.open_sequence_based_macromolecules = openSequenceBasedMacromolecules;
    },
    setSequenceBasedMacromolecule(sequence_based_macromolecule, initial = false) {
      if (initial) {
        self.sequence_based_macromolecule_checksum = sequence_based_macromolecule._checksum;
      }
      sequence_based_macromolecule.changed = false;
      const sequenceBasedMacromolecule = new SequenceBasedMacromolecule(sequence_based_macromolecule);

      if (sequenceBasedMacromolecule.checksum() != self.sequence_based_macromolecule_checksum
        || sequenceBasedMacromolecule.isNew) {
        sequenceBasedMacromolecule.changed = true;
      }
      self.sequence_based_macromolecule = sequenceBasedMacromolecule;

      if (!initial) {
        self.editSequenceBasedMacromolecules(sequenceBasedMacromolecule);
      }
    },
    // setSequenceBasedMacromolecules(sequence_based_macromolecules) {
    //   self.sequence_based_macromolecules = sequence_based_macromolecules;
    // },
    // clearSequenceBasedMacromolecule() {
    //   self.sequence_based_macromolecule = {};
    // },
    changeSequenceBasedMacromolecule(field, value, type) {
      let sequence_based_macromolecule = { ...self.sequence_based_macromolecule };
      const fieldParts = field.split('.');
      const lastKey = fieldParts.pop();
      const lastObject = fieldParts.reduce(
        (accumulator, currentValue) => accumulator[currentValue] ??= {}, sequence_based_macromolecule
      );
      lastObject[lastKey] = value;

      sequence_based_macromolecule.updated = false;
      self.setSequenceBasedMacromolecule(sequence_based_macromolecule);
    },
    // changeSetupSequenceBasedMacromolecules(field, value, type, sequence_based_macromolecule) {
    //   const fieldElements = field.split('-');
    //   const elementField = fieldElements.length > 1 ? fieldElements[0] : field;
    //   const elementType = type !== undefined ? type : fieldElements[1];
    //   let sequence_based_macromolecule_field = { ...sequence_based_macromolecule[elementField] };

    //   if (sequence_based_macromolecule_field === null) {
    //     sequence_based_macromolecule_field = { [elementType]: value };
    //   } else if (fieldElements.length > 1) {
    //     sequence_based_macromolecule_field[elementType][fieldElements[3]][fieldElements[2]] = value;
    //   } else {
    //     sequence_based_macromolecule_field[elementType] = value;
    //   }
    //   sequence_based_macromolecule[elementField] = sequence_based_macromolecule_field;
    //   return sequence_based_macromolecule;
    // },
    setActiveTabKey(key) {
      self.active_tab_key = key;
    },
    // setKeyPrefix(prefix) {
    //   self.key_prefix = `${prefix}-${self.device_description.collection_id}`;
    // },
    toggleContent(content) {
      let contents = { ...self.toggable_contents };
      contents[content] = !contents[content];
      self.toggable_contents = contents;
    },
    // changeAnalysisMode(mode) {
    //   self.analysis_mode = mode;
    // },
    // changeAnalysisOpenPanel(panel) {
    //   self.analysis_open_panel = panel;
    // },
    // addEmptyAnalysisContainer() {
    //   const container = Container.buildEmpty();
    //   container.container_type = "analysis"
    //   let device_description = { ...self.device_description };
    //   device_description.container.children[0].children.push(container);
    //   self.setDeviceDescription(device_description);
    // },
    // changeAnalysisContainerContent(container) {
    //   let device_description = { ...self.device_description };
    //   const index = device_description.container.children[0].children.findIndex((c) => c.id === container.id);
    //   device_description.container.children[0].children[index] = container;
    //   self.setDeviceDescription(device_description);
    // },
    // changeAnalysisContainer(children) {
    //   let device_description = { ...self.device_description };
    //   device_description.container.children[0].children = children;
    //   self.setDeviceDescription(device_description);
    // },
    // toggleAnalysisCommentBox() {
    //   self.analysis_comment_box = !self.analysis_comment_box;
    // },
    // changeAnalysisComment(comment) {
    //   let device_description = { ...self.device_description };
    //   let container = { ...self.device_description.container }
    //   container.description = comment;
    //   device_description.container = container;
    //   self.setDeviceDescription(device_description);
    // },
    // toggleAnalysisStartExport() {
    //   self.analysis_start_export = !self.analysis_start_export;
    // },
    // setAttachmentEditor(value) {
    //   self.attachment_editor = value;
    // },
    // setAttachmentExtension(value) {
    //   self.attachment_extension = value;
    // },
    // setFilteredAttachments(attachments) {
    //   self.filtered_attachments = attachments;
    // },
    // setShowImportConfirm(value) {
    //   self.attachment_show_import_confirm = value;
    // },
    // toogleAttachmentModal() {
    //   self.attachment_image_edit_modal_shown = !self.attachment_image_edit_modal_shown;
    // },
    // setAttachmentSelected(attachment) {
    //   self.attachment_selected = attachment;
    // },
    // setAttachmentFilterText(value) {
    //   self.attachment_filter_text = value;
    // },
    // setAttachmentSortBy(value) {
    //   self.attachment_sort_by = value;
    // },
    // setAttachmentSortDirectory(value) {
    //   self.attachment_sort_direction = value;
    // },
    // changeAttachment(index, key, value, initial = false) {
    //   let device_description = { ...self.device_description };
    //   let attachment = { ...device_description.attachments[index] };
    //   attachment[key] = value;
    //   device_description.attachments[index] = attachment;
    //   self.setFilteredAttachments(device_description.attachments);
    //   self.setDeviceDescription(device_description, initial);
    // },
    // loadPreviewImagesOfAttachments(device_description) {
    //   if (device_description.attachments.length === 0) { return device_description }
    //   let deviceDescription = { ...device_description }

    //   deviceDescription.attachments.map((attachment, index) => {
    //     let attachment_object = { ...device_description.attachments[index] };
    //     if (attachment.thumb) {
    //       AttachmentFetcher.fetchThumbnail({ id: attachment.id })
    //         .then((result) => {
    //           let preview = result != null ? `data:image/png;base64,${result}` : '/images/wild_card/not_available.svg';
    //           attachment_object.preview = preview;
    //           deviceDescription.attachments[index] = attachment_object;
    //           self.setFilteredAttachments(deviceDescription.attachments);
    //         });
    //     }
    //   });
    // },
    openSearchResult() {
      self.show_search_result = true;
    },
    closeSearchResult() {
      self.show_search_result = false;
    },
  }))
  .views(self => ({
    // get sequenceBasedMacromoleculesValues() { return values(self.sequence_based_macromolecules) },
    // get filteredAttachments() { return values(self.filtered_attachments) },
  }));