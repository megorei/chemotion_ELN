import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import SequenceBasedMacromoleculeSamplesFetcher from 'src/fetchers/SequenceBasedMacromoleculeSamplesFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import Container from 'src/models/Container';

const toggableContents = {
  'general': true,
  'reference': false,
  'sequence_modifications': false,
  'sample': false,
};

const modificationToggleButtons = {
  phosphorylation: [],
  glycosylation: [],
  hydroxylation: [],
  methylation: [],
}

export const SequenceBasedMacromoleculesStore = types
  .model({
    key_prefix: types.optional(types.string, 'sbmm'),
    open_sequence_based_macromolecules: types.optional(types.optional(types.array(types.frozen({})), [])),
    sequence_based_macromolecule: types.optional(types.frozen({}), {}),
    sequence_based_macromolecule_checksum: types.optional(types.string, ''),
    active_tab_key: types.optional(types.string, 'properties'),
    toggable_contents: types.optional(types.frozen({}), toggableContents),
    analysis_mode: types.optional(types.string, 'edit'),
    analysis_comment_box: types.optional(types.boolean, false),
    analysis_start_export: types.optional(types.boolean, false),
    attachment_editor: types.optional(types.boolean, false),
    attachment_extension: types.optional(types.frozen({}), {}),
    show_attachment_image_edit_modal: types.optional(types.boolean, false),
    attachment_selected: types.optional(types.frozen({}), {}),
    attachment_show_import_confirm: types.optional(types.array(types.frozen({})), []),
    attachment_filter_text: types.optional(types.string, ''),
    attachment_sort_by: types.optional(types.string, 'name'),
    attachment_sort_direction: types.optional(types.string, 'asc'),
    filtered_attachments: types.optional(types.array(types.frozen({})), []),
    show_search_result: types.optional(types.boolean, false),
  })
  .actions(self => ({
    getLastObjectAndKeyByField(field, sequence_based_macromolecule) {
      const fieldParts = field.split('.');
      const lastKey = fieldParts.pop();
      const lastObject = fieldParts.reduce(
        (accumulator, currentValue) => accumulator[currentValue] ??= {}, sequence_based_macromolecule
      );
      return { lastObject, lastKey };
    },
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
      if (sequence_based_macromolecule.modification_toggle_buttons === undefined) {
        sequence_based_macromolecule.modification_toggle_buttons = modificationToggleButtons;
      }
      sequence_based_macromolecule.changed = false;
      const sequenceBasedMacromolecule = new SequenceBasedMacromoleculeSample(sequence_based_macromolecule);

      if (sequenceBasedMacromolecule.checksum() != self.sequence_based_macromolecule_checksum
        || sequenceBasedMacromolecule.isNew) {
        sequenceBasedMacromolecule.changed = true;
      }
      self.sequence_based_macromolecule = sequenceBasedMacromolecule;

      if (!initial) {
        self.editSequenceBasedMacromolecules(sequenceBasedMacromolecule);
      }
    },
    changeSequenceBasedMacromolecule(field, value) {
      let sequence_based_macromolecule = { ...self.sequence_based_macromolecule };
      const { lastObject, lastKey } = self.getLastObjectAndKeyByField(field, sequence_based_macromolecule);
      lastObject[lastKey] = value;

      sequence_based_macromolecule.updated = false;
      self.setSequenceBasedMacromolecule(sequence_based_macromolecule);
    },
    setActiveTabKey(key) {
      self.active_tab_key = key;
    },
    toggleContent(content) {
      let contents = { ...self.toggable_contents };
      contents[content] = !contents[content];
      self.toggable_contents = contents;
    },
    changeAnalysisMode() {
      const mode = { edit: 'order', order: 'edit' }[self.analysis_mode];
      self.analysis_mode = mode;
    },
    addEmptyAnalysisContainer() {
      const container = Container.buildEmpty();
      container.container_type = "analysis"
      let sequenceBasedMacromolecule = { ...self.sequence_based_macromolecule };
      sequenceBasedMacromolecule.container.children[0].children.push(container);
      self.setSequenceBasedMacromolecule(sequenceBasedMacromolecule);
      self.analysis_mode = 'edit';
    },
    changeAnalysisContainerContent(container) {
      let sequenceBasedMacromolecule = { ...self.sequence_based_macromolecule };
      const index = sequenceBasedMacromolecule.container.children[0].children.findIndex((c) => c.id === container.id);
      sequenceBasedMacromolecule.container.children[0].children[index] = container;
      self.setSequenceBasedMacromolecule(sequenceBasedMacromolecule);
    },
    changeAnalysisContainer(children) {
      let sequenceBasedMacromolecule = { ...self.sequence_based_macromolecule };
      sequenceBasedMacromolecule.container.children[0].children = children;
      self.setSequenceBasedMacromolecule(sequenceBasedMacromolecule);
    },
    toggleAnalysisCommentBox() {
      self.analysis_comment_box = !self.analysis_comment_box;
    },
    changeAnalysisComment(e) {
      if (!e && !e?.target) { return null; }

      let sequenceBasedMacromolecule = { ...self.sequence_based_macromolecule };
      let container = { ...self.sequence_based_macromolecule.container }
      container.description = e.target.value;
      sequenceBasedMacromolecule.container = container;
      self.setSequenceBasedMacromolecule(sequenceBasedMacromolecule);
    },
    toggleAnalysisStartExport() {
      self.analysis_start_export = !self.analysis_start_export;
    },
    setAttachmentEditor(value) {
      self.attachment_editor = value;
    },
    setAttachmentExtension(value) {
      self.attachment_extension = value;
    },
    setFilteredAttachments(attachments) {
      self.filtered_attachments = attachments;
    },
    setShowImportConfirm(value) {
      self.attachment_show_import_confirm = value;
    },
    toogleAttachmentModal() {
      self.show_attachment_image_edit_modal = !self.show_attachment_image_edit_modal;
    },
    setAttachmentSelected(attachment) {
      self.attachment_selected = attachment;
    },
    setAttachmentFilterText(value) {
      self.attachment_filter_text = value;
    },
    setAttachmentSortBy(value) {
      self.attachment_sort_by = value;
    },
    setAttachmentSortDirectory(value) {
      self.attachment_sort_direction = value;
    },
    changeAttachment(index, key, value, initial = false) {
      let sequence_based_macromolecule = { ...self.sequence_based_macromolecule };
      let attachment = { ...sequence_based_macromolecule.attachments[index] };
      attachment[key] = value;
      sequence_based_macromolecule.attachments[index] = attachment;
      self.setFilteredAttachments(sequence_based_macromolecule.attachments);
      self.setSequenceBasedMacromolecule(sequence_based_macromolecule, initial);
    },
    openSearchResult() {
      self.show_search_result = true;
    },
    closeSearchResult() {
      self.show_search_result = false;
    },
    initModificationToggleButtons(fieldPrefix, field, group) {
      if (self.sequence_based_macromolecule.modification_toggle_buttons[field].length < 1) {
        const { lastObject, lastKey } = self.getLastObjectAndKeyByField(fieldPrefix, self.sequence_based_macromolecule);
        let buttons = [];
        group.options.map((option) => {
          if (lastObject[lastKey][option.field]) {
            buttons.push(option.field);
          }
        });
        self.setModificationToggleButtons(fieldPrefix, field, buttons);
      }
      return self.sequence_based_macromolecule.modification_toggle_buttons[field];
    },
    setModificationToggleButtons(fieldPrefix, field, values) {
      let sequence_based_macromolecule = { ...self.sequence_based_macromolecule };
      let buttons = { ...sequence_based_macromolecule.modification_toggle_buttons };
      const { lastObject, lastKey } = self.getLastObjectAndKeyByField(fieldPrefix, sequence_based_macromolecule);

      if (buttons.length >= 1) {
        buttons[field].map((key) => {
          lastObject[lastKey][key] = false;
        });
      }
      values.map((key) => {
        lastObject[lastKey][key] = true;
      });

      buttons[field] = values;
      sequence_based_macromolecule.modification_toggle_buttons = buttons;
      self.setSequenceBasedMacromolecule(sequence_based_macromolecule);
    }
  }))
  .views(self => ({
    get filteredAttachments() { return values(self.filtered_attachments) },
  }));