import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

export const FormEditorStore = types
  .model({
    form_editor_modal_visible: types.optional(types.boolean, false),
    element_type: types.optional(types.string, ''),
    modal_minimized: types.optional(types.boolean, false),
  })
  .actions(self => ({
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
  }))
  .views(self => ({
    get formEditorModalVisible() { return self.form_editor_modal_visible },
    get elementType() { return self.element_type },
    get modalMinimized() { return self.modal_minimized },
  }));
