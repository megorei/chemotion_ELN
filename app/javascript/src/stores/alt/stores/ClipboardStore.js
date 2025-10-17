import alt from 'src/stores/alt/alt';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import Aviator from 'aviator';

class ClipboardStore {
  constructor() {
    this.state = {
      samples: [],
      wellplates: [],
      device_descriptions: [],
    };

    this.bindListeners({
      handleFetchSamplesByUIStateAndLimit: [
        ClipboardActions.fetchSamplesByUIStateAndLimit, ClipboardActions.fetchElementAndBuildCopy
      ],
      handleFetchWellplatesByUIState: ClipboardActions.fetchWellplatesByUIState,
      handleFetchDeviceDescriptionAndBuildCopy: [
        ClipboardActions.fetchDeviceDescriptionAndBuildCopy, ClipboardActions.fetchDeviceDescriptionsByUIState
      ],
    })
  }

  handleFetchSamplesByUIStateAndLimit(result) {
    this.state.samples = result.samples;

    switch (result.action) {
      case 'template_wellplate':
        Aviator.navigate(`/collection/${result.collection_id}/wellplate/template`);
        break;
      case 'copy_sample':
        Aviator.navigate(`/collection/${result.collection_id}/sample/copy`);
    }
  }

  handleFetchWellplatesByUIState(result) {
    this.state.wellplates = result.wellplates;
    switch (result.action) {
      case 'template_screen':
        Aviator.navigate(`/collection/${result.collection_id}/screen/template`);
    }
  }

  handleFetchDeviceDescriptionAndBuildCopy(result) {
    this.state.device_descriptions = result.device_descriptions;
    Aviator.navigate(`/collection/${result.collection_id}/device_description/copy`);
  }
}

export default alt.createStore(ClipboardStore, 'ClipboardStore');
