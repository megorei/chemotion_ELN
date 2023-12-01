import 'whatwg-fetch';

export default class ElementFormTypesFetcher {
  static getElementFormTypes() {
    return fetch(
      `/api/v1/element_form_types`,
      this._httpOptions()
    ).then(response => response.json())
      .then(json => json.element_form_types)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchById(elementFormTypeId) {
    return fetch(
      `/api/v1/element_form_types/${elementFormTypeId}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchByElementType(elementType) {
    return fetch(
      `/api/v1/element_form_types?element_type=${elementType}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then(json => json.element_form_types)
      .catch(errorMessage => console.log(errorMessage));
  }

  static createElementFormType(elementFormType) {
    return fetch(
      `/api/v1/element_form_types`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(elementFormType)
      }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateElementFormType(elementFormType) {
    return fetch(
      `/api/v1/element_form_types/${elementFormType.id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(elementFormType)
      }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteElementFormType(elementFormTypeId) {
    return fetch(
      `/api/v1/element_form_types/${elementFormTypeId}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
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
