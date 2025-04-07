import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import SequenceBasedMacromoleculesFetcher from 'src/fetchers/SequenceBasedMacromoleculesFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import Container from 'src/models/Container';

const emptySequenceBasedMacromolecule = {
  accessions: [],
  created_at: '',
  ec_numbers: '',
  full_name: '',
  heterologous_expression: '',
  id: '',
  link_pdb: '',
  link_uniprot: '',
  localisation: '',
  molecular_weight: '',
  organism: '',
  other_identifier: '',
  own_identifier: '',
  pdb_doi: '',
  primary_accession: '',
  sequence: '',
  sequence_length: '',
  short_name: '',
  strain: '',
  taxon_id: '',
  tissue: '',
  uniprot_source: '',
  updated_at: '',
}

const validationFields = [
  'name',
  'sequence_based_macromolecule.sbmm_type',
  'sequence_based_macromolecule.sbmm_subtype',
  'sequence_based_macromolecule.uniprot_derivation',
  'sequence_based_macromolecule.primary_accession',
  'sequence_based_macromolecule.parent_identifier',
]

export const SequenceBasedMacromoleculesStore = types
  .model({
    key_prefix: types.optional(types.string, 'sbmm'),
    open_sequence_based_macromolecules: types.optional(types.optional(types.array(types.frozen({})), [])),
    sequence_based_macromolecule: types.optional(types.frozen({}), {}),
    sequence_based_macromolecule_checksum: types.optional(types.string, ''),
    active_tab_key: types.optional(types.string, 'properties'),
    toggable_contents: types.optional(types.frozen({}), {}),
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
    search_result: types.optional(types.array(types.frozen({})), []),
    error_messages: types.optional(types.frozen({}), {}),
    show_all_groups: types.optional(types.boolean, true),
    all_groups: types.optional(types.array(types.string), []),
    shown_groups: types.optional(types.array(types.string), []),
  })
  .actions(self => ({
    searchForSequenceBasedMacromolecule: flow(function* searchForSequenceBasedMacromolecule(search_term, search_field) {
      let result = yield SequenceBasedMacromoleculesFetcher.searchForSequenceBasedMacromolecule(search_term, search_field);
      if (result?.search_results) {
        if (result.search_results.length < 1) {
          self.setSearchResult([{ results: 'none' }]);
        } else {
          self.setSearchResult(result.search_results);
        }
      }
    }),
    getSequenceBasedMacromoleculeByIdentifier: flow(function* getSequenceBasedMacromoleculeByIdentifier(primary_accession, available_sources) {
      let result = yield SequenceBasedMacromoleculesFetcher.getSequenceBasedMacromoleculeByIdentifier(primary_accession, available_sources);

      if (result?.sequence_based_macromolecule) {
        self.setSbmmByResult(result.sequence_based_macromolecule, primary_accession);
      }
    }),
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
    setSbmmByResult(result, primary_accession) {
      let sequenceBasedMacromolecule = { ...self.sequence_based_macromolecule };
      let sbmm = sequenceBasedMacromolecule.sequence_based_macromolecule;
      const uniprotDerivation = sbmm.uniprot_derivation;

      delete sbmm.parent_identifier;
      if (uniprotDerivation === 'uniprot_modified') {
        if (!sbmm.parent) { sbmm.parent = {}; }
        sbmm.parent_identifier = primary_accession || result?.primary_accession || result?.id;
      }
      const sbmmOrParent = uniprotDerivation === 'uniprot_modified' ? sbmm?.parent : sbmm;

      Object.keys(emptySequenceBasedMacromolecule).map((key) => {
        if (result[key] !== undefined) {
          sbmmOrParent[key] = result[key];
        }
      });
      self.setSequenceBasedMacromolecule(sequenceBasedMacromolecule);
    },
    setSequenceBasedMacromolecule(sequence_based_macromolecule, initial = false) {
      if (initial) {
        self.sequence_based_macromolecule_checksum = sequence_based_macromolecule._checksum;
      }
      sequence_based_macromolecule.changed = false;
      const sequenceBasedMacromolecule = new SequenceBasedMacromoleculeSample(sequence_based_macromolecule);

      if (sequenceBasedMacromolecule.checksum() !== self.sequence_based_macromolecule_checksum || sequenceBasedMacromolecule.isNew) {
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

      // sequence_based_macromolecule.updated = false;
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
    setSearchResult(result) {
      self.removeSearchResult();
      self.search_result = result;
    },
    removeSearchResult() {
      self.search_result = [];
    },
    setModificationToggleButtons(fieldPrefix, field, fieldSuffix, value) {
      let sequence_based_macromolecule = { ...self.sequence_based_macromolecule };
      const { lastObject, lastKey } = self.getLastObjectAndKeyByField(fieldPrefix, sequence_based_macromolecule);
      const detailField = field.replace('enabled', fieldSuffix);

      lastObject[lastKey][field] = value;

      if (!value) {
        lastObject[lastKey][detailField] = '';
      }

      self.setSequenceBasedMacromolecule(sequence_based_macromolecule);
    },
    hasValidFields() {
      let errorMessages = { ...self.error_messages };
      const sbmm = self.sequence_based_macromolecule.sequence_based_macromolecule;

      validationFields.map((key) => {
        const hasValue =
          key.split('.')
            .reduce((accumulator, currentValue) => accumulator?.[currentValue], self.sequence_based_macromolecule);
        const isPrimaryAccession =
          self.sequence_based_macromolecule.isNew && key.includes('primary_accession')
          && sbmm.uniprot_derivation == 'uniprot' && !sbmm.primary_accession;
        const isParentIdentifier =
          self.sequence_based_macromolecule.isNew && key.includes('parent_identifier')
          && sbmm.uniprot_derivation == 'uniprot_modified' && !sbmm.parent_identifier;
        const checkOnlyValue = !key.includes('primary_accession') && !key.includes('parent_identifier') && !hasValue;
        const ident = `${self.sequence_based_macromolecule.id}-${key}`;

        if (hasValue && errorMessages[ident]) {
          delete errorMessages[ident];
        } else if (isPrimaryAccession || isParentIdentifier || checkOnlyValue) {
          errorMessages[ident] = true;
        }
      });

      self.error_messages = errorMessages;
      return Object.keys(self.error_messages).length < 1 ? true : false;
    },
    setErrorMessages(values) {
      self.error_messages = values;
    },
    toggleAllGroups() {
      self.show_all_groups = !self.show_all_groups;

      if (self.show_all_groups) {
        self.removeAllGroupsFromShownGroups();
      } else {
        self.addAllGroupsToShownGroups();
      }
    },
    addGroupToAllGroups(group_key) {
      const index = self.all_groups.findIndex((g) => { return g == group_key });
      if (index === -1) {
        self.all_groups.push(group_key);
      }
    },
    addAllGroupsToShownGroups() {
      self.all_groups.map((group_key) => {
        self.addGroupToShownGroups(group_key);
      });
    },
    addGroupToShownGroups(group_key) {
      self.shown_groups.push(group_key);
    },
    removeGroupFromShownGroups(group_key) {
      const shownGroups = self.shown_groups.filter((g) => { return g !== group_key });
      self.shown_groups = shownGroups;
    },
    removeAllGroupsFromShownGroups() {
      self.shown_groups = [];
    },
  }))
  .views(self => ({
    get filteredAttachments() { return values(self.filtered_attachments) },
    get searchResult() { return values(self.search_result) },
    get shownGroups() { return values(self.shown_groups) },
  }));
