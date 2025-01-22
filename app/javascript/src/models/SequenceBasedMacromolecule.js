import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class SequenceBasedMacromolecule extends Element {
  static buildEmpty(collectionID) {
    return new SequenceBasedMacromolecule({
      collection_id: collectionID,
      type: 'sequence_based_macromolecule',
      name: 'New sequence based macromolecule',
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
    if (!currentUser) { return 'NEW SEQUENCE BASED MACROMOLECULE'; }
    return `${currentUser.initials}-SBMM${currentUser.macromolecules_count + 1}`;
  }

  // static copyFromSequenceBasedMacromoleculeAndCollectionId(sequence_based_macromolecule, collection_id) {
  //   const newSequenceBasedMacromolecule = sequence_based_macromolecule.buildCopy();
  //   newSequenceBasedMacromolecule.collection_id = collection_id;
  //   if (sequence_based_macromolecule.name) { newSequenceBasedMacromolecule.name = sequence_based_macromolecule.name; }

  //   return new SequenceBasedMacromolecule;
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
  //   const sequenceBasedMacromolecule = super.buildCopy();
  //   sequenceBasedMacromolecule.short_label = SequenceBasedMacromolecule.buildNewShortLabel();
  //   sequenceBasedMacromolecule.container = Container.init();
  //   sequenceBasedMacromolecule.can_copy = false;
  //   sequenceBasedMacromolecule.attachments = []
  //   return sequenceBasedMacromolecule;
  // }
}
