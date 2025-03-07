import alt from 'src/stores/alt/alt';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import WellplatesFetcher from 'src/fetchers/WellplatesFetcher';
import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import DeviceDescription from 'src/models/DeviceDescription';
import SequenceBasedMacromoleculesFetcher from 'src/fetchers/SequenceBasedMacromoleculesFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';

class ClipboardActions {
  fetchSamplesByUIStateAndLimit(params, action) {
    return (dispatch) => {
      SamplesFetcher.fetchSamplesByUIStateAndLimit(params)
        .then((result) => {
          dispatch({ samples: result, collection_id: params.sample.collection_id, action: action });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchWellplatesByUIState(params, action) {
    return (dispatch) => {
      WellplatesFetcher.fetchWellplatesByUIState(params)
        .then((result) => {
          dispatch({ wellplates: result, collection_id: params.wellplate.collection_id, action: action });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchDeviceDescriptionsByUIState(params, action) {
    return (dispatch) => {
      DeviceDescriptionFetcher.fetchDeviceDescriptionsByUIStateAndLimit(params)
        .then((result) => {
          dispatch({ device_descriptions: result, collection_id: params.ui_state.collection_id, action: action });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchSequenceBasedMacromoleculesByUIState(params, action) {
    return (dispatch) => {
      SequenceBasedMacromoleculesFetcher.fetchSequenceBasedMacromoleculesByUIStateAndLimit(params)
        .then((result) => {
          dispatch(
            { sequence_based_macromolecules: result, collection_id: params.ui_state.collection_id, action: action }
          );
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchElementAndBuildCopy(sample, collection_id, action) {
    sample.collection_id = collection_id;
    return (
      { samples: [sample], collection_id: collection_id, action: action }
    )
  }

  fetchDeviceDescriptionAndBuildCopy(device_description, collection_id, action) {
    const newDeviceDescription = new DeviceDescription(device_description);
    newDeviceDescription.collection_id = collection_id;
    return (
      { device_descriptions: [newDeviceDescription], collection_id: collection_id, action: action }
    )
  }

  fetchSequenceBasedMacromoleculesAndBuildCopy(sequence_based_macromolecule, collection_id, action) {
    const newSequenceBasedMacromolecule = new SequenceBasedMacromoleculeSample(sequence_based_macromolecule);
    newSequenceBasedMacromolecule.collection_id = collection_id;
    return (
      { sequence_based_macromolecules: [newSequenceBasedMacromolecule], collection_id: collection_id, action: action }
    )
  }
}
export default alt.createActions(ClipboardActions);
