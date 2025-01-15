import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class Macromolecule extends Element {
  static buildEmpty(collectionID) {
    return new Macromolecule({
      collection_id: collectionID,
      type: 'macromolecule',
      name: 'New macromolecule',
      short_label: '',
      isNew: true,
      changed: false,
      updated: false,
      can_copy: false,
      container: Container.init(),
      attachments: [],
      segments: [],
    });
  }

  static buildNewShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return 'NEW MACROMOLECULE'; }
    return `${currentUser.initials}-SBMM${currentUser.macromolecules_count + 1}`;
  }

  // static copyFromMacromoleculeAndCollectionId(macromolecule, collection_id) {
  //   const newDeviceDescription = macromolecule.buildCopy();
  //   newDeviceDescription.collection_id = collection_id;
  //   if (macromolecule.name) { newDeviceDescription.name = macromolecule.name; }

  //   return new Macromolecule;
  // }

  title() {
    const short_label = this.short_label ? this.short_label : '';
    return this.name ? `${short_label} ${this.name}` : short_label;
  }

  get attachmentCount() {
    if (this.attachments) { return this.attachments.length; }
    return this.attachment_count;
  }

  getAttachmentByIdentifier(identifier) {
    return this.attachments
      .filter((attachment) => attachment.identifier === identifier)[0];
  }

  // buildCopy() {
  //   const macromolecule = super.buildCopy();
  //   macromolecule.short_label = Macromolecule.buildNewShortLabel();
  //   macromolecule.container = Container.init();
  //   macromolecule.can_copy = false;
  //   macromolecule.attachments = []
  //   return macromolecule;
  // }
}
