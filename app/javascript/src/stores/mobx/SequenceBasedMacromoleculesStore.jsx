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
    analysis_mode: types.optional(types.string, 'edit'),
    analysis_comment_box: types.optional(types.boolean, false),
    analysis_start_export: types.optional(types.boolean, false),
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
    changeSequenceBasedMacromolecule(field, value) {
      let sequence_based_macromolecule = { ...self.sequence_based_macromolecule };
      const fieldParts = field.split('.');
      const lastKey = fieldParts.pop();
      const lastObject = fieldParts.reduce(
        (accumulator, currentValue) => accumulator[currentValue] ??= {}, sequence_based_macromolecule
      );
      lastObject[lastKey] = value;

      sequence_based_macromolecule.updated = false;
      self.setSequenceBasedMacromolecule(sequence_based_macromolecule);

      self.calculateActivity(sequence_based_macromolecule, lastObject, lastKey, value, field);
    },
    calculateActivity(sequence_based_macromolecule, lastObject, lastKey, value, field) {
      // if the volume is added, we calculate the activity and the amount based on: 
      //   amount [mol] = Volume [L] * molarity [mol/L] 
      //   activity [U] = Volume [L] * activity_per_liter [U/L] 
      // if the activity is added: 
      //   Volume [L] = Activity [U] / activity_per_liter [U/L] 
      //   amount [mol] = Volume [L] * molarity [mol/L]   
      // if the amount (in mol) is added: 
      //   volume [L] = amount [mol]  / molarity [mol/L] 
      //   activity [U] = Volume [L] * activity_per_liter [U/L] 
      // if the amount (in g) is added: 
      //   Activity [U] = amount [g] * Activity in U/g [mol/L]

      const calculationFields = [
        'molarity', 'stock_activity_ul', 'stock_activity_ug',
        'volume_as_used', 'amount_as_used', 'amount_as_used_weight', 'activity',
      ];
      if (!calculationFields.includes(lastKey)) { return null; }

      const molarity = sequence_based_macromolecule.sample.molarity || '';
      const stockActivityUl = sequence_based_macromolecule.sample.stock_activity_ul || '';
      const stockActivityUG = sequence_based_macromolecule.sample.stock_activity_ug || '';
      let volumeAsUsed = sequence_based_macromolecule.sample.volume_as_used || '';
      const amountAsUsed = sequence_based_macromolecule.sample.amount_as_used || '';
      const amountAsUsedWeight = sequence_based_macromolecule.sample.amount_as_used_weight || '';
      let activity = sequence_based_macromolecule.sample.activity || '';
      // todo: change values to basic units
      console.log(
        'molarity', molarity, 'activity_ul', stockActivityUl, 'activity_ug', stockActivityUG,
        'volume_as_used', volumeAsUsed, 'amount_as_used', amountAsUsed, 'amount_as_used_weight', amountAsUsedWeight,
        'activity', activity
      );

      if (lastKey === 'volume_as_used') {
        if (molarity !== '' && volumeAsUsed !== '') {
          sequence_based_macromolecule.sample.amount_as_used = parseFloat((volumeAsUsed * molarity).toFixed(5));
        }
        if (stockActivityUl !== '' && volumeAsUsed !== '') {
          sequence_based_macromolecule.sample.activity = parseFloat((volumeAsUsed * stockActivityUl).toFixed(5));
        }
      }
      if (lastKey === 'activity') {
        if (stockActivityUl !== '' && activity !== '') {
          volumeAsUsed = parseFloat((activity / stockActivityUl).toFixed(5));
          sequence_based_macromolecule.sample.volume_as_used = volumeAsUsed;
        }
        if (volumeAsUsed != '' && molarity !== '' && activity !== '') {
          sequence_based_macromolecule.sample.amount_as_used = parseFloat((volumeAsUsed * molarity).toFixed(5));
        }
      }
      if (lastKey === 'amount_as_used') {
        if (molarity !== '' && amountAsUsed !== '') {
          volumeAsUsed = parseFloat((amountAsUsed / molarity).toFixed(5));
          sequence_based_macromolecule.sample.volume_as_used = volumeAsUsed;
        }
        if (stockActivityUl !== '' && amountAsUsed !== '') {
          sequence_based_macromolecule.sample.activity = parseFloat((volumeAsUsed * stockActivityUl).toFixed(5));
        }
      }
      if (lastKey === 'amount_as_used_weight') {
        if (stockActivityUG !== '' && amountAsUsedWeight !== '') {
          activity = parseFloat((amountAsUsedWeight * stockActivityUG).toFixed(5));
          sequence_based_macromolecule.sample.activity = activity;
        }
        if (stockActivityUl !== '' && activity !== '' && amountAsUsedWeight !== '') {
          volumeAsUsed = parseFloat((activity / stockActivityUl).toFixed(5));
          sequence_based_macromolecule.sample.volume_as_used = volumeAsUsed;
        }
        if (volumeAsUsed != '' && molarity !== '' && activity !== '' && amountAsUsedWeight !== '') {
          sequence_based_macromolecule.sample.amount_as_used = parseFloat((volumeAsUsed * molarity).toFixed(5));
        }
      }

      //console.log(lastObject, lastKey, value, field);
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
    changeAnalysisComment(comment) {
      let sequenceBasedMacromolecule = { ...self.sequence_based_macromolecule };
      let container = { ...self.sequence_based_macromolecule.container }
      container.description = comment;
      sequenceBasedMacromolecule.container = container;
      self.setSequenceBasedMacromolecule(sequenceBasedMacromolecule);
    },
    toggleAnalysisStartExport() {
      self.analysis_start_export = !self.analysis_start_export;
    },
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