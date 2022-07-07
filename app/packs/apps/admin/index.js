// imports from node_modules
import ReactDOM from 'react-dom';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

// imports from own namespace
import AdminHome from './components/AdminHome';

const AdminHomeWithDnD = DragDropContext(HTML5Backend)(AdminHome);

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('AdminHome');
  if (domElement) { ReactDOM.render(<AdminHomeWithDnD />, domElement); }
});
