import alt from 'src/stores/alt/alt'
import _ from 'lodash'
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher'

class DetailActions {
  select(index) {
    return index
  }

  close(deleteEl, force = false) {
    return { deleteEl, force }
  }

  confirmDelete(confirm) {
    return confirm
  }

  changeCurrentElement(oriEl, nextEl) {
    return { oriEl, nextEl }
  }

  getMoleculeCas(sample) {
    return (dispatch) => {
      MoleculesFetcher.fetchCas(sample.molecule.inchikey)
        .then((result) => {
          sample.molecule = result
          dispatch(sample)
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  updateMoleculeNames(sample, newMolName = '') {
    const id = sample.molecule.id;
    if (!id) { return null; }

    return (dispatch) => {
      MoleculesFetcher
        .updateNames(id, newMolName)
        .then((result) => {
          const mn = result.find((r) => r.label === newMolName);
          if (mn) sample.molecule_name = mn;
          sample.molecule_names = result;
          dispatch(sample);
        })
        .catch(errorMessage => console.log(errorMessage));
    };
  }

  updateMoleculeCas(sample, newCas = '') {
    const m = sample.molecule;
    m.cas = [...m.cas, newCas];
    sample.molecule = m;
    return sample;
  }
}

export default alt.createActions(DetailActions)
