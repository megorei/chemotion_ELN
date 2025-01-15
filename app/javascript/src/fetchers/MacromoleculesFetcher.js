import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import Macromolecule from 'src/models/Macromolecule';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

export default class MacromoleculesFetcher {
  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'macromolecules', Macromolecule);
  }

  static fetchMacromoleculesByUIStateAndLimit(params) {
    const limit = params.limit ? limit : null;

    return [];

    // return fetch('/api/v1/macromolecules/ui_state/', 
    //   {
    //     ...this._httpOptions('POST'),
    //     body: JSON.stringify(params)
    //   }
    // ).then(response => response.json())
    //   .then((json) => {
    //     return json.macromolecules.map((d) => new Macromolecule(d))
    //   })
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static splitAsSubMacromolecule(params) {
    return [];

    // return fetch('/api/v1/macromolecules/sub_macromolecules/', 
    //   {
    //     ...this._httpOptions('POST'),
    //     body: JSON.stringify(params)
    //   }
    // ).then(response => response.json())
    //   .then((json) => json)
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static fetchById(macromoleculeId) {
    return Promise.resolve(_fakeElement(macromoleculeId));

    // return fetch(
    //   `/api/v1/macromolecules/${macromoleculeId}`,
    //   { ...this._httpOptions() }
    // ).then(response => response.json())
    //   .then((json) => {
    //     if (json.error) {
    //       return new Macromolecule({ id: `${id}:error:Macromolecule ${id} is not accessible!`, is_new: true });
    //     } else {
    //       const macromolecule = new Macromolecule(json.macromolecule);
    //       macromolecule._checksum = macromolecule.checksum();
    //       return macromolecule;
    //     }
    //   })
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static createMacromolecule(macromolecule) {
    const containerFiles = AttachmentFetcher.getFileListfrom(macromolecule.container);
    const newFiles = (macromolecule.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    return [];

    // const promise = () => fetch(
    //   `/api/v1/macromolecules`,
    //   {
    //     ...this._httpOptions('POST'),
    //     body: JSON.stringify(macromolecule)
    //   }
    // ).then(response => response.json())
    //   .then((json) => {
    //     if (newFiles.length <= 0) {
    //       return new Macromolecule(json.macromolecule);
    //     }
    //     return AttachmentFetcher.updateAttachables(newFiles, 'Macromolecule', json.macromolecule.id, [])()
    //       .then(() => new Macromolecule(json.macromolecule));
    //   })
    //   .catch(errorMessage => console.log(errorMessage));

    // if (containerFiles.length > 0) {
    //   const tasks = [];
    //   containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
    //   return Promise.all(tasks).then(() => promise());
    // }
    // return promise();
  }

  static updateMacromolecule(macromolecule) {
    const containerFiles = AttachmentFetcher.getFileListfrom(macromolecule.container);
    const newFiles = (macromolecule.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (macromolecule.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    return [];

    // const promise = () => fetch(
    //   `/api/v1/macromolecules/${macromolecule.id}`,
    //   {
    //     ...this._httpOptions('PUT'),
    //     body: JSON.stringify(macromolecule)
    //   }
    // ).then((response) => response.json())
    //   .then((json) => {
    //     const updatedMacromolecule = new Macromolecule(json.macromolecule);
    //     updatedMacromolecule.updated = true;
    //     updatedMacromolecule.updateChecksum();
    //     return updatedMacromolecule;
    //   })
    //   .catch(errorMessage => console.log(errorMessage));

    // const tasks = [];
    // if (containerFiles.length > 0) {
    //   containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
    // }
    // if (newFiles.length > 0 || delFiles.length > 0) {
    //   tasks.push(AttachmentFetcher.updateAttachables(newFiles, 'Macromolecule', macromolecule.id, delFiles)());
    // }
    // return Promise.all(tasks)
    //   .then(() => BaseFetcher.updateAnnotations(macromolecule))
    //   .then(() => promise());
  }

  static deleteMacromolecule(macromoleculeId) {
    return [];

    // return fetch(
    //   `/api/v1/macromolecules/${macromoleculeId}`,
    //   { ...this._httpOptions('DELETE') }
    // ).then(response => response.json())
    //   .catch(errorMessage => console.log(errorMessage));
  }

  static _fakeElement(macromoleculeId) {
    const randomNumber = Math.floor(Math.random() * (101 - 1) + 1);
    const id = macromoleculeId ? macromoleculeId : randomNumber;

    return new Macromolecule({
      id: id,
      name: `Test ${id}`,
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
