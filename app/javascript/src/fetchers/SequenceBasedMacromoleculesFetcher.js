import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import SequenceBasedMacromolecule from 'src/models/SequenceBasedMacromolecule';
import Container from 'src/models/Container'; // temp for fake Element
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

export default class SequenceBasedMacromoleculesFetcher {
  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    // return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'sequence_based_macromolecules', SequenceBasedMacromolecule);

    return Promise.resolve({
      elements: [this._fakeElement(1)],
      page: 1,
      pages: 1,
      perPage: 15,
      totalElements: 1,
    });
  }

  static fetchSequenceBasedMacromoleculesByUIStateAndLimit(params) {
    const limit = params.limit ? limit : null;
    console.log('fetchSequenceBasedMacromoleculesByUIStateAndLimit');

    return [];

    // return fetch('/api/v1/sequence_based_macromolecules/ui_state/', 
    //   {
    //     ...this._httpOptions('POST'),
    //     body: JSON.stringify(params)
    //   }
    // ).then(response => response.json())
    //   .then((json) => {
    //     return json.sequence_based_macromolecules.map((d) => new SequenceBasedMacromolecule(d))
    //   })
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static splitAsSubSequenceBasedMacromolecule(params) {
    return [];

    // return fetch('/api/v1/sequence_based_macromolecules/sub_sequence_based_macromolecules/', 
    //   {
    //     ...this._httpOptions('POST'),
    //     body: JSON.stringify(params)
    //   }
    // ).then(response => response.json())
    //   .then((json) => json)
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static fetchById(sequenceBasedMacromoleculeId) {
    return Promise.resolve(this._fakeElement(sequenceBasedMacromoleculeId));

    // return fetch(
    //   `/api/v1/sequence_based_macromolecules/${macromoleculeId}`,
    //   { ...this._httpOptions() }
    // ).then(response => response.json())
    //   .then((json) => {
    //     if (json.error) {
    //       return new SequenceBasedMacromolecule(
    //        { id: `${id}:error:SequenceBasedMacromolecule ${id} is not accessible!`, is_new: true }
    //      );
    //     } else {
    //       const sequence_based_macromolecule = new SequenceBasedMacromolecule(json.sequence_based_macromolecule);
    //       sequence_based_macromolecule._checksum = sequence_based_macromolecule.checksum();
    //       return sequence_based_macromolecule;
    //     }
    //   })
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static createMacromolecule(sequenceBasedMacromolecule) {
    const containerFiles = AttachmentFetcher.getFileListfrom(sequenceBasedMacromolecule.container);
    const newFiles = (sequenceBasedMacromolecule.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    return [];

    // const promise = () => fetch(
    //   `/api/v1/sequence_based_macromolecules`,
    //   {
    //     ...this._httpOptions('POST'),
    //     body: JSON.stringify(sequenceBasedMacromolecule)
    //   }
    // ).then(response => response.json())
    //   .then((json) => {
    //     if (newFiles.length <= 0) {
    //       return new Macromolecule(json.sequence_based_macromolecule);
    //     }
    //     return AttachmentFetcher.updateAttachables(newFiles, 'SequenceBasedMacromolecule', json.sequence_based_macromolecule.id, [])()
    //       .then(() => new SequenceBasedMacromolecule(json.sequence_based_macromolecule));
    //   })
    //   .catch(errorMessage => console.log(errorMessage));

    // if (containerFiles.length > 0) {
    //   const tasks = [];
    //   containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
    //   return Promise.all(tasks).then(() => promise());
    // }
    // return promise();
  }

  static updateSequenceBasedMacromolecule(sequenceBasedMacromolecule) {
    const containerFiles = AttachmentFetcher.getFileListfrom(sequenceBasedMacromolecule.container);
    const newFiles = (sequenceBasedMacromolecule.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (sequenceBasedMacromolecule.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    return [];

    // const promise = () => fetch(
    //   `/api/v1/sequence_based_macromolecules/${sequenceBasedMacromolecule.id}`,
    //   {
    //     ...this._httpOptions('PUT'),
    //     body: JSON.stringify(sequenceBasedMacromolecule)
    //   }
    // ).then((response) => response.json())
    //   .then((json) => {
    //     const updatedMacromolecule = new SequenceBasedMacromolecule(json.sequence_based_macromolecule);
    //     updatedSequenceBasedMacromolecule.updated = true;
    //     updatedSequenceBasedMacromolecule.updateChecksum();
    //     return updatedSequenceBasedMacromolecule;
    //   })
    //   .catch(errorMessage => console.log(errorMessage));

    // const tasks = [];
    // if (containerFiles.length > 0) {
    //   containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
    // }
    // if (newFiles.length > 0 || delFiles.length > 0) {
    //   tasks.push(AttachmentFetcher.updateAttachables(newFiles, 'SequenceBasedMacromolecule', sequenceBasedMacromolecule.id, delFiles)());
    // }
    // return Promise.all(tasks)
    //   .then(() => BaseFetcher.updateAnnotations(sequenceBasedMacromolecule))
    //   .then(() => promise());
  }

  static deleteSequenceBasedMacromolecule(sequenceBasedMacromoleculeId) {
    return [];

    // return fetch(
    //   `/api/v1/sequence_based_macromolecules/${sequenceBasedMacromoleculeId}`,
    //   { ...this._httpOptions('DELETE') }
    // ).then(response => response.json())
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static _fakeElement(sequenceBasedMacromoleculeId) {
    const randomNumber = Math.floor(Math.random() * (101 - 2) + 2);
    const id = sequenceBasedMacromoleculeId ? sequenceBasedMacromoleculeId : randomNumber;

    return new SequenceBasedMacromolecule({
      id: id,
      name: `Test ${id}`,
      type: 'sequence_based_macromolecule',
      short_label: `CU6-SBMM-${id}`,
      isNew: true,
      changed: false,
      updated: false,
      can_copy: false,
      container: Container.init(),
      attachments: [],
    });
  }

  static _httpOptions(method = 'GET') {
    return {
      credentials: 'same-origin',
      method: method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }
}
