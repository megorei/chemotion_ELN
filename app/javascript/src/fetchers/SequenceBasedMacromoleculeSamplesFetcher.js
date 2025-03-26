import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import Container from 'src/models/Container'; // temp for fake Element
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

export default class SequenceBasedMacromoleculeSamplesFetcher {
  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(
      id, queryParams, isSync, 'sequence_based_macromolecule_samples', SequenceBasedMacromoleculeSample
    );
  }

  static fetchSequenceBasedMacromoleculesByUIStateAndLimit(params) {
    const limit = params.limit ? limit : null;
    console.log('fetchSequenceBasedMacromoleculesByUIStateAndLimit');

    return fetch('/api/v1/sequence_based_macromolecule_samples/ui_state/', 
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(params)
      }
    ).then(response => response.json())
      .then((json) => {
        return json.sequence_based_macromolecule_samples.map((d) => new SequenceBasedMacromoleculeSample(d))
      })
      .catch(errorMessage => console.log(errorMessage));
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

  static fetchById(sequenceBasedMacromoleculeSampleId) {
    //const sequence_based_macromolecule = this._fakeElement(sequenceBasedMacromoleculeSampleId);
    //sequence_based_macromolecule._checksum = sequence_based_macromolecule.checksum();
    //return Promise.resolve(sequence_based_macromolecule);

    return fetch(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSampleId}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then((json) => {
        if (json.error) {
          return new SequenceBasedMacromoleculeSample(
            { id: `${id}:error:SequenceBasedMacromoleculeSample ${id} is not accessible!`, is_new: true }
          );
        } else {
          const sequence_based_macromolecule_sample =
            new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
          sequence_based_macromolecule_sample._checksum = sequence_based_macromolecule_sample.checksum();
          return sequence_based_macromolecule_sample;
        }
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static createSequenceBasedMacromolecule(sequenceBasedMacromoleculeSample) {
    const containerFiles = AttachmentFetcher.getFileListfrom(sequenceBasedMacromoleculeSample.container);
    const newFiles = (sequenceBasedMacromoleculeSample.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    const promise = () => fetch(
      `/api/v1/sequence_based_macromolecule_samples`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(sequenceBasedMacromoleculeSample.serialize())
      }
    ).then(response => response.json())
      .then((json) => {
        if (newFiles.length <= 0) {
          return new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample);
        }
        return AttachmentFetcher.updateAttachables(
          newFiles, 'SequenceBasedMacromoleculeSample', json.sequence_based_macromolecule_sample.id, []
        )()
          .then(() => new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule_sample));
      })
      .catch(errorMessage => console.log(errorMessage));

    if (containerFiles.length > 0) {
      const tasks = [];
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => promise());
    }
    return promise();
  }

  static updateSequenceBasedMacromolecule(sequenceBasedMacromolecule) {
    const containerFiles = AttachmentFetcher.getFileListfrom(sequenceBasedMacromolecule.container);
    const newFiles = (sequenceBasedMacromolecule.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (sequenceBasedMacromolecule.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    return Promise.resolve(this._fakeElement(1));

    // const promise = () => fetch(
    //   `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromolecule.id}`,
    //   {
    //     ...this._httpOptions('PUT'),
    //     body: JSON.stringify(sequenceBasedMacromolecule.serialize())
    //   }
    // ).then((response) => response.json())
    //   .then((json) => {
    //     const updatedSequenceBasedMacromolecule = new SequenceBasedMacromoleculeSample(json.sequence_based_macromolecule);
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
    //   tasks.push(AttachmentFetcher.updateAttachables(newFiles, 'SequenceBasedMacromoleculeSample', sequenceBasedMacromolecule.id, delFiles)());
    // }
    // return Promise.all(tasks)
    //   .then(() => BaseFetcher.updateAnnotations(sequenceBasedMacromolecule))
    //   .then(() => promise());
  }

  static deleteSequenceBasedMacromolecule(sequenceBasedMacromoleculeSampleId) {
    return fetch(
      `/api/v1/sequence_based_macromolecule_samples/${sequenceBasedMacromoleculeSampleId}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static _fakeElement(sequenceBasedMacromoleculeId) {
    const randomNumber = Math.floor(Math.random() * (101 - 2) + 2);
    const id = sequenceBasedMacromoleculeId ? sequenceBasedMacromoleculeId * 1 : randomNumber;
    const isNew = sequenceBasedMacromoleculeId ? false : true;

    return new SequenceBasedMacromoleculeSample({
      id: id,
      name: `Test ${id}`,
      type: 'sequence_based_macromolecule_sample',
      short_label: `CU6-SBMM-${id}`,
      function_or_application: 'enzyme',
      sbmm_type: 'protein',
      uniprot_derivation: 'uniprot_unknown',
      isNew: isNew,
      changed: false,
      updated: false,
      can_copy: false,
      container: Container.init(),
      attachments: [],
      post_translational_modifications: {},
      tag: {
        created_at: '22.01.2025, 15:10:20 +0000',
        taggable_data: {
          collection_labels: [{
            id: 25,
            is_shared: false,
            is_synchronized: false,
            name: 'project CU1-champagne',
            shared_by_id: null,
            user_id: 9,
          }],
        },
        taggable_id: 1,
        taggable_type: 'SequenceBasedMacromoleculeSample',
        updated_at: '22.01.2025, 15:10:20 +0000',
      }
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
