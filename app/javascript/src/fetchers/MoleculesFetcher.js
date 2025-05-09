import 'whatwg-fetch';

export default class MoleculesFetcher {
  static fetchSciFinder(params) {
    return fetch('/api/v1/molecules/sf', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchByMolfile(molfile, svgfile, editor = 'ketcher', decoupled = false) {
    return fetch('/api/v1/molecules', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        molfile, svg_file: svgfile, editor, decoupled
      })
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchBySmi(smi, svgfile, molfile, editor = 'ketcher') {
    return fetch('/api/v1/molecules/smiles', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smiles: smi, svg_file: svgfile, layout: molfile, editor
      })
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchCas(inchikey) {
    return fetch(`/api/v1/molecules/cas?inchikey=${inchikey}`, {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateNames(id, newMolName = '') {
    return fetch(`/api/v1/molecules/names?id=${id}`
      + `&new_name=${escape(newMolName)}`, {
      credentials: 'same-origin',
    }).then((response) => response.json()).then((json) => json.molecules)
      .catch((errorMessage) => console.log(errorMessage));
  }

  static computePropsFromSmiles(sampleId) {
    return fetch('/api/v1/molecules/compute', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId })
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static getByInChiKey(inchikey) {
    return fetch('/api/v1/molecules/inchikey', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ inchikey })
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static renewSVGFile(id, svgFile, isChemdraw = false) {
    return fetch('/api/v1/molecules/svg', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, svg_file: svgFile, is_chemdraw: isChemdraw })
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateMolfileSVG(molecule) {
    return fetch('/api/v1/molecules/editor', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: molecule.id, molfile: molecule.molfile, svg_file: molecule.molecule_svg_file
      })
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteMoleculeName(params) {
    return fetch('/api/v1/molecules/delete_name', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static saveMoleculeName(params) {
    return fetch('/api/v1/molecules/save_name', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static decouple(molfile, svgfile, decoupled = false) {
    return fetch('/api/v1/molecules/decouple', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ molfile, svg_name: svgfile, decoupled })
    }).then(response => response.json()).then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static calculateMolecularMassFromSumFormula(molecularFormula) {
    const encodedMolecularFormula = encodeURIComponent(molecularFormula);

    const promise = fetch(`/api/v1/molecules/molecular_weight?molecular_formula=${encodedMolecularFormula}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
    }).then((response) => response.json()).then((json) => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }
}
