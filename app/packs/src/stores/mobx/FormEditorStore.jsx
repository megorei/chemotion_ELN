import { keys, values, entries } from 'mobx';
import { flow, types, getSnapshot } from 'mobx-state-tree';
import { cloneDeep } from 'lodash';

import ElementFormTypesFetcher from 'src/fetchers/ElementFormTypesFetcher';
import ElementStructure from '../../apps/mydb/elements/details/ElementStructure';

const ElementFormType = types.model({
  id: types.identifierNumber,
  name: types.maybeNull(types.string),
  description: types.maybeNull(types.string),
  element_type: types.maybeNull(types.string),
  structure: types.maybeNull(types.frozen({})),
  enabled: types.maybeNull(types.boolean),
});

const emptyElementFormType = {
  id: '',
  name: '',
  description: '',
  element_type: '',
  enabled: true,
  structure: {},
}

export const FormEditorStore = types
  .model({
    admin_modal_visible: types.optional(types.boolean, false),
    admin_modal_content: types.optional(types.string, 'edit-object'),
    element_form_type: types.optional(types.frozen({}), emptyElementFormType),
    element_form_types: types.map(ElementFormType),
    form_editor_modal_visible: types.optional(types.boolean, false),
    element_type: types.optional(types.string, ''),
    modal_minimized: types.optional(types.boolean, false),
    element_structure: types.optional(types.frozen({}), ElementStructure),
    error_message: types.optional(types.string, ""),
  })
  .actions(self => ({
    load: flow(function* loadElementFormTypes() {
      let result = yield ElementFormTypesFetcher.getElementFormTypes();
      self.element_form_types.clear();
      result.forEach(entry => self.element_form_types.set(entry.id, ElementFormType.create({ ...entry })));
    }),
    createElementFormType: flow(function* createElementFormType(elementFormType) {
      let result = yield ElementFormTypesFetcher.createElementFormType(elementFormType)
      if (result.id) {
        let createdElementFormType = ElementFormType.create({ ...result });
        self.element_form_types.set(result.id, createdElementFormType)
      }
    }),
    updateElementFormType: flow(function* updateElementFormType(elementFormType) {
      let result = yield ElementFormTypesFetcher.updateElementFormType(elementFormType)
      if (result.id) {
        let updatedElementFormType = ElementFormType.create({ ...result });
        self.element_form_types.set(result.id, updatedElementFormType);
      }
    }),
    fetchById: flow(function* fetchById(id) {
      let result = yield ElementFormTypesFetcher.fetchById(id)
      if (result.id) {
        self.element_form_type = { ...result }
      }
    }),
    deleteElementFormType: flow(function* deleteElementFormType(id) {
      let result = yield ElementFormTypesFetcher.deleteElementFormType(id)
      if (result.deleted == id) {
        self.element_form_types.delete(id)
      }
      return result
    }),
    showAdminModal() {
      self.admin_modal_visible = true;
    },
    hideAdminModal() {
      self.admin_modal_visible = false;
    },
    changeAdminModalContent(content, id) {
      self.admin_modal_content = content;
      if (id) {
        self.fetchById(id);
      }
    },
    handleAdminCancel() {
      self.hideAdminModal();
      self.clearElementFormTypeValues();
    },
    addElementFormTypeValues(values) {
      self.element_form_type = values;
    },
    clearElementFormTypeValues() {
      self.element_form_type = emptyElementFormType;
    },
    changeErrorMessage(message) {
      self.error_message = message;
    },
    showFormEditorModal(type) {
      self.form_editor_modal_visible = true;
      self.element_type = type;
    },
    hideFormEditorModal() {
      self.form_editor_modal_visible = false;
      self.element_type = '';
    },
    toggleModalMinimized() {
      self.modal_minimized = !self.modal_minimized;
    },
    handleCancel() {
      self.hideFormEditorModal();
      // reset selected / unselected form elements
    },
    addFormFields(fields) {
      let values = fields ? fields : [{}];
      self.element_structure = values;
    },
    changeFieldVisibility(selected_field, visibility) {
      let structure = cloneDeep(self.element_structure);

      structure.elements[self.element_type].map((section) => {
        section.rows.map((row) => {
          let row_changed = false;
          if (row.key == selected_field.key) {
            row.visible = visibility;
            row_changed = true;
          }
          row.fields.map((field) => {
            if (field.sub_fields) {
              field.sub_fields.map((sub_field) => {
                if (sub_field.key == selected_field.key || row_changed) {
                  sub_field.visible = visibility;
                }
              });
            } else if (field.key == selected_field.key || row_changed) {
              field.visible = visibility;
            }
          });
        });
      });
      self.element_structure = structure;
    }
  }))
  .views(self => ({
    get adminModalVisible() { return self.admin_modal_visible },
    get adminModalContent() { return self.admin_modal_content },
    get elementFormType() { return self.element_form_type },
    get elementFormTypes() { return values(self.element_form_types) },
    get formEditorModalVisible() { return self.form_editor_modal_visible },
    get elementType() { return self.element_type },
    get modalMinimized() { return self.modal_minimized },
    get elementStructure() { return self.element_structure },
    get errorMessage() { return self.error_message },
  }));
