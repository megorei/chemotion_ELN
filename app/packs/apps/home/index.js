// imoports from node_modules
import ReactDOM from 'react-dom';

// imports from own namespace
import Home from '/app/packs/apps/home/components/Home';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) { ReactDOM.render(<Home />, domElement); }
});
