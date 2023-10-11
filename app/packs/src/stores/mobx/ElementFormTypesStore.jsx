import { values } from 'mobx';
import { flow, types } from 'mobx-state-tree';
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
  structure: {},
  enabled: true,
}

export const ElementFormTypesStore = types
  .model({
    admin_modal_visible: types.optional(types.boolean, false),
    admin_modal_content: types.optional(types.string, 'edit-object'),
    element_form_type: types.optional(types.frozen({}), emptyElementFormType),
    element_form_types: types.map(ElementFormType),
    editor_modal_visible: types.optional(types.boolean, false),
    modal_minimized: types.optional(types.boolean, false),
    element_structure: types.optional(types.frozen({}), {}),
    error_message: types.optional(types.string, ""),
    show_success_message: types.optional(types.boolean, false),
  })
  .actions(self => ({
    load: flow(function* loadElementFormTypes() {
      let result = yield ElementFormTypesFetcher.getElementFormTypes();
      self.element_form_types.clear();
      result.forEach(entry => self.element_form_types.set(entry.id, ElementFormType.create({ ...entry })));
    }),
    createElementFormType: flow(function* createElementFormType(elementFormType) {
      let result = yield ElementFormTypesFetcher.createElementFormType(elementFormType);
      if (result.id) {
        let createdElementFormType = ElementFormType.create({ ...result });
        self.element_form_types.set(result.id, createdElementFormType);
        self.show_success_message = true;
      }
    }),
    updateElementFormType: flow(function* updateElementFormType(elementFormType) {
      let result = yield ElementFormTypesFetcher.updateElementFormType(elementFormType);
      if (result.id) {
        let updatedElementFormType = ElementFormType.create({ ...result });
        self.element_form_types.set(result.id, updatedElementFormType);
        self.show_success_message = true;
      }
    }),
    fetchById: flow(function* fetchById(id) {
      let result = yield ElementFormTypesFetcher.fetchById(id)
      if (result.id) {
        self.element_form_type = { ...result }
        if (Object.keys(self.element_form_type.structure).length >= 1) {
          self.element_structure = self.element_form_type.structure;
        }
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
      self.show_success_message = false;
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
      self.error_message = '';
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
    showEditorModal(type, id) {
      self.editor_modal_visible = true;
      self.show_success_message = false;
      self.element_structure = ElementStructure[type];
      if (id) {
        self.fetchById(id);
      } else {
        let element = { ...self.element_form_type };
        element.element_type = type;
        self.addElementFormTypeValues(element);
      }
    },
    hideEditorModal() {
      self.editor_modal_visible = false;
      self.element_structure = {};
    },
    toggleModalMinimized() {
      self.modal_minimized = !self.modal_minimized;
    },
    handleCancel() {
      self.hideEditorModal();
    },
    addFormFields(fields) {
      let values = fields ? fields : [{}];
      self.element_structure = values;
    },
    changeFieldVisibility(selected_field, visibility) {
      let structure = cloneDeep(self.element_structure);

      structure.columns.map((section) => {
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
    },
    saveStructure() {
      let element = { ...self.element_form_type };
      element.structure = self.element_structure;
      self.updateElementFormType(element);
      self.hideEditorModal();
      self.show_success_message = true;
    },
  }))
  .views(self => ({
    get adminModalVisible() { return self.admin_modal_visible },
    get adminModalContent() { return self.admin_modal_content },
    get elementFormType() { return self.element_form_type },
    get elementFormTypes() { return values(self.element_form_types) },
    get editorModalVisible() { return self.editor_modal_visible },
    get modalMinimized() { return self.modal_minimized },
    get elementStructure() { return self.element_structure },
    get errorMessage() { return self.error_message },
    get showSuccessMessage() { return self.show_success_message },
  }));
