// imports from node_modules
import ReactDOM from 'react-dom';

// imports from own namespace
import CnC from '/app/packs/apps/command_and_control/components/CnC';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('CnC');
  if (domElement) { ReactDOM.render(<CnC />, domElement); }
});
